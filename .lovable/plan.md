
# Configuração do DVR e ajustes no app

## O que está acontecendo

A conexão falhou porque o host informado foi `192.168.1.105` — um IP da rede local do DVR. A edge function `intelbras-bridge` roda na nuvem e **não consegue acessar IPs privados** da rede da granja. O timeout de 15s do `AbortController` dispara e gera o erro "The signal has been aborted".

Para a integração funcionar, são necessárias 3 coisas em paralelo: (1) configuração no DVR/roteador para expor o serviço à internet, (2) ajustes no app para suportar HTTP e validar entrada, (3) mensagens de erro melhores.

---

## Parte 1 — Ações no DVR e roteador (cliente faz)

Documentar essas instruções na própria tela `/cameras/novo` como um painel de ajuda colapsável.

1. **Habilitar DDNS Intelbras** (tela DDNS do DVR):
   - Marcar "Habilitar"
   - Tipo: Intelbras DDNS
   - Definir um Nome de domínio único (ex: `granja-marcia`)
   - Salvar → o status deve mudar de "IP Desatualizado" para "Conectado"
   - Host final fica: `granja-marcia.ddns-intelbras.com.br`

2. **Redirecionamento de portas no roteador da granja** (port forwarding):
   - Porta externa `443` → `192.168.1.105:443` (HTTPS), OU
   - Porta externa `80` → `192.168.1.105:80` (HTTP, mais simples)
   - Recomendar HTTP na porta 80 quando possível, evitando problemas com certificado auto-assinado do DVR

3. **No formulário do app**, usar como Host o **DDNS** (`granja-marcia.ddns-intelbras.com.br`), nunca o IP local.

---

## Parte 2 — Ajustes no código

### 2.1. `src/pages/CameraNovoDvr.tsx` e `CameraEditarDvr.tsx`

- Adicionar campo **"Protocolo"** (Select: HTTPS / HTTP) com default HTTPS
- Adicionar campo **"Porta HTTP"** quando protocolo for HTTP (default 80)
- Validação client-side do campo **Host**: bloquear IPs privados (`10.*`, `172.16-31.*`, `192.168.*`, `127.*`, `localhost`) com mensagem clara: "Use o domínio DDNS público do DVR, não o IP da rede local"
- Painel colapsável **"Como configurar meu DVR"** com as 3 etapas da Parte 1 e link para a doc Intelbras
- Após erro de teste de conexão, exibir card de diagnóstico com possíveis causas (host privado, DDNS desabilitado, porta não redirecionada, firewall)

### 2.2. `supabase/functions/intelbras-bridge/index.ts`

- Aceitar campo opcional `protocolo` ('http' | 'https') no payload de `/test-connection` e nos registros `cameras_dvr`
- Em `fetchSnapshot`, montar URL conforme protocolo escolhido em vez de inferir pela porta
- Bloquear no servidor (defesa em profundidade) hostnames que resolvam para IPs privados; retornar mensagem amigável
- Reduzir timeout do `digestFetch` para 8s na primeira request (falha rápida para hosts inacessíveis) mantendo 15s na request autenticada
- Aprimorar a mensagem de erro do `AbortController` para algo como: "Não foi possível conectar a {host}:{porta}. Verifique se o DDNS está ativo e o roteador redireciona a porta para o DVR."

### 2.3. Migração no banco

- Adicionar coluna `protocolo text not null default 'https' check (protocolo in ('http','https'))` em `cameras_dvr`
- Adicionar coluna `porta_http integer not null default 80` em `cameras_dvr`

---

## Parte 3 — Validação após implantação

1. Cliente habilita DDNS no DVR e configura port forwarding
2. No app, usar host DDNS, protocolo HTTP, porta 80, usuário/senha do DVR
3. Clicar "Testar conexão" → deve retornar preview da imagem do canal 1
4. Salvar DVR → cron começa a capturar snapshots conforme `snapshot_intervalo_seg`

---

## Resumo do que será editado

- `src/pages/CameraNovoDvr.tsx` — campos protocolo/porta HTTP, validação host, painel de ajuda
- `src/pages/CameraEditarDvr.tsx` — mesmos campos
- `supabase/functions/intelbras-bridge/index.ts` — protocolo dinâmico, bloqueio de IP privado, mensagens claras
- nova migração — colunas `protocolo` e `porta_http` em `cameras_dvr`
