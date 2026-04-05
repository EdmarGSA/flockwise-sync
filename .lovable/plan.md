

## Automatizar Leituras de Sensores com Cron Job

### Problema atual

As leituras de temperatura/umidade só são atualizadas quando o usuário acessa manualmente a página "Dispositivos IoT" e clica em sincronizar. O `pg_cron` e `pg_net` já estão habilitados mas nenhum job está agendado.

### Solução

Criar uma edge function `auto-sync-sensors` que roda automaticamente a cada 5 minutos via `pg_cron`, sincronizando leituras de **todos** os integrados com dispositivos ativos, e em seguida agendar também a `auto-temperatura` para rodar a cada 5 minutos (com offset de 2 min).

### Alterações

**1. Nova edge function `supabase/functions/auto-sync-sensors/index.ts`**
- Busca todos os `integrado_id` distintos de `dispositivos_iot` onde `ativo = true`
- Para cada integrado, busca o token eWeLink (`ewelink_tokens`)
- Se tem token válido, chama a API eWeLink para obter status de todos os dispositivos
- Insere leituras na `leituras_sensores` e atualiza `ultimo_sync`
- Loga quantos dispositivos foram sincronizados por integrado
- Usa `service_role_key` (sem autenticação de usuário)

**2. Agendar cron jobs (via SQL insert, não migração)**
- `auto-sync-sensors`: a cada 5 minutos (`*/5 * * * *`)
- `auto-temperatura`: a cada 5 minutos, offset 2 min (`2-57/5 * * * *`)
- Ambos chamados via `pg_net.http_post` apontando para as edge functions

### Fluxo automatizado

```text
a cada 5 min:
  auto-sync-sensors → busca eWeLink API → grava leituras_sensores
  (2 min depois)
  auto-temperatura  → lê últimas leituras → gerencia alertas + controla dispositivos
```

### Detalhes técnicos

- A function `auto-sync-sensors` reutiliza a mesma lógica de refresh de token e chamada da API eWeLink que já existe em `sync-sensors`
- Não requer `integrado_id` como parâmetro — itera todos automaticamente
- Intervalo de 5 min garante leituras atualizadas sem excesso de chamadas à API
- O `auto-temperatura` já existe e funciona, só precisa ser agendado

