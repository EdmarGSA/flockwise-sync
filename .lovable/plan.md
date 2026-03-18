

## Automação de Temperatura por Idade das Aves

### Conceito
O sistema controlará automaticamente os equipamentos Sonoff (aquecedores/ventiladores) com base na temperatura ideal para a idade atual do lote. Um job periódico (a cada 5 minutos) verifica a temperatura do galpão e liga/desliga os dispositivos conforme a faixa configurada.

### 1. Nova tabela: `regras_temperatura_lote`

Armazena as faixas de temperatura por idade (em dias):

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| integrado_id | uuid | FK |
| nome | text | Ex: "Padrão Frango Corte" |
| dia_inicio | int | Dia inicial (ex: 1) |
| dia_fim | int | Dia final (ex: 7) |
| temp_min_c | numeric | Temperatura mínima (ligar aquecedor abaixo) |
| temp_max_c | numeric | Temperatura máxima (ligar ventilação acima) |
| umidade_min_pct | numeric | (opcional) |
| umidade_max_pct | numeric | (opcional) |
| ativo | boolean | default true |

Exemplo de dados padrão:
- Dias 1-7: 32-34°C
- Dias 8-14: 29-31°C  
- Dias 15-21: 26-28°C
- Dias 22-28: 23-25°C
- Dias 29+: 20-23°C

### 2. Nova coluna em `dispositivos_iot`

- `funcao_automacao`: enum (`aquecimento`, `ventilacao`, `nenhuma`) — define o que o dispositivo faz para a automação saber se deve ligar quando está frio ou quente.
- `automacao_ativa`: boolean — habilita/desabilita automação por dispositivo.

### 3. Nova tabela: `log_automacao_temperatura`

Registra cada ação automática para auditoria:
- dispositivo_id, lote_id, temperatura_lida, faixa esperada, ação tomada (ligou/desligou), timestamp.

### 4. Edge Function: `auto-temperatura` (novo)

Executada via `pg_cron` a cada 5 minutos:
1. Busca lotes `status = 'alojado'` com `data_alojamento`
2. Calcula idade em dias de cada lote
3. Busca `regras_temperatura_lote` aplicável à idade
4. Busca dispositivos vinculados ao galpão do lote com `automacao_ativa = true`
5. Busca última leitura de temperatura do sensor
6. Compara temperatura vs faixa:
   - Se temp < temp_min e dispositivo é `aquecimento` → liga
   - Se temp > temp_max e dispositivo é `ventilacao` → liga
   - Se temp está na faixa → desliga o dispositivo
7. Envia comando via API eWeLink e registra no log

### 5. UI: Configuração no painel IoT

- Nova aba/seção "Automação" na página `DispositivosIoT.tsx`
- Tabela editável com faixas de temperatura por idade
- Por dispositivo: selecionar função (aquecimento/ventilação) e ativar/desativar automação
- Visualização do log de ações automáticas

### 6. UI: Indicador no card do lote

- No `TemperaturaUmidadeCard`, mostrar a faixa ideal atual baseada na idade do lote
- Badge "Automação ativa" quando configurada
- Cor do termômetro baseada na faixa ideal (não fixa como hoje)

### 7. Cron Job (pg_cron + pg_net)

```sql
SELECT cron.schedule(
  'auto-temperatura-5min',
  '*/5 * * * *',
  $$ SELECT net.http_post(
    url:='https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/auto-temperatura',
    headers:='{"Authorization": "Bearer <anon_key>"}'::jsonb,
    body:='{}'::jsonb
  ) $$
);
```

### Arquivos a criar/editar

**Criar:**
- `supabase/functions/auto-temperatura/index.ts` — lógica de automação
- Migração SQL — tabelas + enum + cron

**Editar:**
- `src/pages/DispositivosIoT.tsx` — UI de configuração de regras e função do dispositivo
- `src/components/lotes/TemperaturaUmidadeCard.tsx` — mostrar faixa ideal e status automação

