# Integração Câmeras Intelbras DVR 16 canais

## Análise técnica — o desafio

O DVR Intelbras é um equipamento **on-premise** (na granja), atrás do roteador local (IP `192.168.1.104`, portas 80/443/554/37777 — visíveis no print da tela "Rede"). A nuvem do Lovable **não tem rota direta** até esse IP privado, então existem 3 caminhos viáveis. Cada um tem trade-offs reais e precisa de uma escolha de arquitetura ANTES de codar.

### Caminho A — Cloud Intelbras (mais simples, depende do produto)

A Intelbras tem nuvens próprias (**Intelbras Cloud / iSIC / Mibo Cam**). Alguns DVRs novos publicam streams/snapshots para essas nuvens com API REST/MQTT. Funciona como o eWeLink hoje:
- usuário autentica conta Intelbras → obtemos token → chamamos cloud → recebemos snapshots/eventos.
- **Problema**: a maioria dos DVRs MHDX/iMHDX **não** expõe API pública documentada na nuvem; a nuvem é fechada para o app oficial. Confirmar modelo do DVR antes de prometer esse caminho.

### Caminho B — DDNS + acesso direto via API CGI/ONVIF (recomendado)

DVRs Intelbras (linha MHDX, NVD, iMHDX) usam o stack **Dahua** por baixo, expondo:
- **HTTP CGI** (porta 80/443): `/cgi-bin/snapshot.cgi?channel=N` — retorna JPEG do canal N.
- **ONVIF** (porta 80): perfil S — descoberta de canais, snapshots, eventos de motion (PullPointSubscription).
- **RTSP** (porta 554): `rtsp://user:pass@host:554/cam/realmonitor?channel=N&subtype=1` — stream H.264/H.265 ao vivo.

Para a nuvem alcançar esse IP privado, o cliente precisa:
1. **Port forwarding** no roteador (80/443/554 → DVR), ou
2. **DDNS** Intelbras (`xxxx.ddns-intelbras.com.br`) que resolve para o IP público da granja, ou
3. Um **agente local (ESP32/Raspberry/PC)** que faz bridge — mesmo padrão do `esp32-bridge` atual.

Edge function `intelbras-bridge` chama o CGI/ONVIF, recebe JPEG, sobe pro Storage do Lovable Cloud, salva URL em `cameras_snapshots`. Stream RTSP **não roda em browser nativo** — precisa de transcodificação para HLS (servidor go2rtc/MediaMTX local) OU usar apenas snapshots a cada N segundos.

### Caminho C — Agente local (mais robusto, alinhado com arquitetura atual)

Estende o conceito **Cloud Agent** já adotado no projeto. Um pequeno serviço rodando em um Raspberry Pi / mini-PC na granja:
- Consulta o DVR via CGI/RTSP a cada X segundos.
- Faz upload de snapshots para Supabase Storage.
- Encaminha eventos de alarme/motion via webhook para `sensor-webhook`.
- Funciona sem expor o DVR pra internet (só o agente faz HTTPS de saída).

Esse caminho **resolve segurança** (nada exposto), **resiliência** (buffer offline) e segue o padrão `esp32-bridge` que já existe.

## Recomendação

**Caminho B + C combinados, em duas fases:**

- **Fase 1 (MVP)**: snapshots via CGI usando DDNS — funciona em qualquer DVR Intelbras/Dahua sem hardware extra. Usuário configura DDNS + libera porta 443 com HTTPS no DVR. Cobre 80% do caso de uso (ver galpão sob demanda + galeria histórica).
- **Fase 2 (produção)**: agente local opcional para granjas que não querem expor DVR. Reaproveita pattern do ESP32 bridge.
- **Fase 3 (live view)**: HLS via MediaMTX local, exibido em `<video>` HTML5 no PWA.

Não construir computer vision agora — fica como evolução depois que o histórico de snapshots tiver volume suficiente para treinar (lembrando da decisão registrada: pesagem por foto foi abandonada por margem 8-15% inviável; **observação ambiental e contagem de aves é viável e é o foco aqui**).

## O que será construído (Fase 1 — MVP)

### 1. Nova entidade no banco

- `cameras_dvr` (1 DVR por organização/galpão):
  - `id`, `integrado_id`, `galpao_id?`, `nome`, `marca` (default 'intelbras'),
  - `modelo`, `host` (DDNS ou IP público), `porta_https` (443), `porta_rtsp` (554),
  - `usuario`, `senha_encrypted`, `num_canais` (16), `ativo`, `ultimo_sync`.
- `cameras_canais` (1 DVR → N canais, 16 no caso):
  - `id`, `dvr_id`, `canal_numero` (1..16), `nome` (ex: "Galpão 3 - Entrada"),
  - `galpao_id?`, `lote_id?`, `funcao` (monitoramento, contagem, ambiente),
  - `ativo`, `snapshot_intervalo_seg` (default 300 = 5 min).
- `cameras_snapshots` (galeria histórica):
  - `id`, `canal_id`, `lote_id?`, `storage_path`, `capturado_em`,
  - `tipo` (agendado, manual, evento_motion), `metadata jsonb`.
- Bucket Storage privado `camera-snapshots/` com RLS por `integrado_id`.

RLS: filtros padrão por `integrado_id` via `useIntegradoId` + `is_superadmin()` bypass — segue o padrão multi-tenant do projeto.

### 2. Edge function `intelbras-bridge`

Endpoints (roteamento Hono, padrão já usado em `esp32-bridge` e `sync-erp-docs`):
- `POST /test-connection` — valida credenciais + descobre canais via ONVIF/CGI.
- `POST /snapshot` `{ canal_id }` — chama CGI `snapshot.cgi`, sobe JPEG no Storage, retorna URL assinada.
- `POST /snapshot-all` — captura os 16 canais em paralelo (`Promise.all`).
- `GET /stream-url` `{ canal_id }` — devolve URL RTSP **assinada** (para reprodução via player externo na fase 2/3).

Segredos por organização salvos cifrados em `cameras_dvr.senha_encrypted` (pgsodium / Vault).

### 3. Cron job de captura agendada

`pg_cron` a cada 5 minutos chama `intelbras-bridge/snapshot-all` para todos os DVRs ativos — segue o padrão de `auto-temperatura` e `auto-sync-sensors`. Respeita `snapshot_intervalo_seg` por canal.

### 4. UI — Nova página `/cameras` + integração no Lote

- **`/cameras`** (CadastroCameras): listar DVRs, adicionar/editar, testar conexão, preview ao vivo dos 16 canais em grid 4×4.
- **No detalhe do lote** (`LoteDetalhe.tsx`): nova aba **"Câmeras"** mostrando os canais vinculados a este lote/galpão, com último snapshot + botão "Atualizar agora".
- **Galeria histórica**: timeline de snapshots por canal, filtros por data e tipo (agendado/manual/evento).
- **Mobile-first**: cards empilhados no mobile, grid no desktop (segue padrão de UX do projeto).

### 5. Webhook de eventos (opcional Fase 1.5)

DVRs Intelbras suportam **HTTP Listener** para eventos de motion/alarme. Configurar o DVR para POST em `sensor-webhook` extendido (ou nova `camera-event-webhook`) — quando motion é detectado fora do horário esperado (ex: madrugada), gera alerta no painel veterinário/gestor.

## O que **não** entra agora

- Live view RTSP em browser (precisa transcoder HLS — Fase 3).
- Visão computacional / contagem automática de aves (decisão registrada: aguardar volume de dados).
- Agente local Raspberry (Fase 2 — só se cliente recusar expor o DVR).
- Gravação contínua de vídeo na nuvem (custo de Storage proibitivo — DVR já grava local).

## Pré-requisitos do cliente (precisamos avisar)

1. DVR com firmware atualizado e API CGI/ONVIF habilitada (padrão na linha MHDX/iMHDX).
2. Configurar **DDNS Intelbras grátis** (`xxxx.ddns-intelbras.com.br`) ou IP fixo.
3. Liberar **porta 443** (HTTPS) no roteador apontando pro DVR — **não usar porta 80 sem TLS**.
4. Criar **usuário read-only** no DVR exclusivo para integração (não usar admin).
5. Confirmar modelo do DVR — se for muito antigo (linha VD/HDCVI legada), só RTSP funciona, sem CGI snapshot.

## Riscos

- **Segurança**: expor DVR na internet é vetor de ataque comum. Mitigação: forçar HTTPS, usuário restrito, recomendar Caminho C (agente local) para granjas grandes.
- **Confiabilidade DDNS**: se IP público mudar e DDNS demorar pra atualizar, captura falha. Mitigação: alerta de "câmera offline há > 30min" no painel.
- **Custo de Storage**: 16 canais × snapshot a cada 5min × 24h ≈ 4.600 imagens/dia/DVR. A ~80KB/JPG = ~370 MB/dia. Mitigação: política de retenção (ex: 30 dias) + compressão WebP.
- **Modelos sem API**: alguns DVRs antigos só falam RTSP. Mitigação: detectar no `test-connection` e desabilitar features incompatíveis.

## Perguntas antes de começar

Vou fazer 2-3 perguntas críticas (modelo do DVR, modo de exposição preferido, escopo da fase 1) assim que o plano for aprovado, pra calibrar a implementação.
