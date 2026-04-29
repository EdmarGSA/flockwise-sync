# Integração Câmeras Intelbras DVR 16 canais — MVP

## Resumo
Implementar Fase 1: snapshots sob demanda + agendados via DDNS Intelbras + porta 443, com galeria histórica e visualização por galpão/lote.

## Banco de Dados
- **`cameras_dvr`**: `id`, `integrado_id`, `nome`, `host` (DDNS), `porta_https` (443), `porta_rtsp` (554), `usuario`, `senha_encrypted`, `num_canais` (16), `ativo`, `ultimo_sync`, `status_conexao`.
- **`cameras_canais`**: `id`, `dvr_id`, `canal_numero` (1-16), `nome`, `galpao_id?`, `lote_id?`, `funcao` (monitoramento/seguranca/ambiente), `ativo`, `snapshot_intervalo_seg` (default 300).
- **`cameras_snapshots`**: `id`, `canal_id`, `lote_id?`, `storage_path`, `capturado_em`, `tipo` (agendado/manual/evento_motion), `metadata jsonb`.
- **`cameras_eventos`**: `id`, `canal_id`, `tipo_evento` (motion/alarm), `ocorrido_em`, `payload jsonb` — para Fase 1.5 webhook.
- **Bucket Storage**: `camera-snapshots` (privado), path `{integrado_id}/{canal_id}/{YYYY-MM-DD}/{timestamp}.jpg`.
- **RLS**: todas tabelas filtram por `integrado_id` (via DVR pai nas filhas) + bypass `is_superadmin()`.
- **Módulo**: registrar `cameras` em `modulos` + permissões para `admin`, `integrado`, `criador`, `veterinario`.

## Edge Function `intelbras-bridge` (Hono)
- `POST /test-connection` — autentica via Digest no DVR, descobre canais via CGI `getDeviceInfo`.
- `POST /snapshot` `{ canal_id }` — chama `/cgi-bin/snapshot.cgi?channel=N`, sobe JPEG no Storage, insere em `cameras_snapshots`, retorna URL assinada.
- `POST /snapshot-all` `{ dvr_id }` — captura 16 canais via `Promise.all`.
- `GET /snapshot-url/:snapshot_id` — gera URL assinada temporária (5 min).
- Auth Digest implementada nativa (CGI Intelbras/Dahua usa Digest MD5).
- Senha cifrada com `pgsodium` ou Vault — segue padrão do projeto.

## Cron de Captura
- `pg_cron` a cada 5 min → chama `intelbras-bridge/snapshot-all` para todo DVR ativo.
- Respeita `snapshot_intervalo_seg` por canal.
- Padrão idêntico ao `auto-temperatura` / `auto-sync-sensors`.

## UI

### Nova página `/cameras`
- Lista de DVRs cadastrados (cards mobile, tabela desktop).
- Form de cadastro: nome, host DDNS, porta, usuário, senha, num_canais, vincular galpão.
- Botão "Testar conexão" → mostra canais descobertos, permite renomear/vincular cada canal a galpão+lote.
- Grid 4×4 de snapshots ao vivo dos 16 canais com botão "Atualizar agora" individual e em massa.
- Indicador de status (online/offline/última captura).

### Aba "Câmeras" no `LoteDetalhe.tsx`
- Mostra apenas canais vinculados ao galpão/lote atual.
- Último snapshot grande + timeline horizontal dos últimos 24h.
- Botão "Capturar agora".

### Galeria histórica
- Filtros: data, canal, tipo (agendado/manual/evento).
- Visualização em grid com lightbox.
- Política: retenção 30 dias (limpeza via cron futuro).

## Segredos
Nenhum segredo global novo — credenciais do DVR ficam por organização em `cameras_dvr.senha_encrypted` (cifrado).

## Fora do escopo (Fase 2/3)
- Live view RTSP/HLS no browser (precisa transcoder — Fase 3).
- Visão computacional / contagem automática (decisão registrada: aguardar volume).
- Agente local Raspberry (Fase 2 — só se cliente recusar expor DVR).
- Webhook de motion (Fase 1.5).

## Pré-requisitos do cliente (avisar na UI)
1. DDNS Intelbras configurado (`xxxx.ddns-intelbras.com.br`).
2. Porta 443 (HTTPS) liberada no roteador → DVR.
3. Usuário read-only criado no DVR (não usar admin).
4. Firmware atual com CGI habilitado (padrão MHDX/iMHDX).

## Riscos & Mitigações
- **Segurança**: forçar HTTPS, alertar para criar usuário restrito.
- **DDNS instável**: alerta "câmera offline > 30min" no painel.
- **Storage**: 16 canais × 5min × 24h ≈ 370 MB/dia/DVR — retenção 30 dias + JPEG comprimido.
- **DVRs antigos sem CGI**: `test-connection` detecta e desabilita features incompatíveis.
