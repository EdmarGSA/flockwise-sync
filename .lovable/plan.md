

## Integração Sonoff TH via eWeLink Cloud API

Boa notícia: desde que vocês testaram, a **eWeLink lançou a API Cloud v2** (CoolKit) que funciona com o Sonoff TH. Agora é possível ler temperatura e umidade via REST API.

### Duas opções de integração

**Opção A — eWeLink Cloud API v2 (recomendada, sem hardware extra)**
- Usa a API REST oficial da eWeLink/CoolKit
- O Sonoff TH já conectado ao app eWeLink envia dados para a nuvem
- Nossa edge function consulta a API periodicamente (cron) ou via webhook
- Precisa: criar conta de desenvolvedor em [dev.ewelink.cc](https://dev.ewelink.cc), obter APP_ID e APP_SECRET

**Opção B — iHost / NSPanel Pro (gateway local)**
- Requer compra do gateway Sonoff iHost (~US$70)
- API local Open API v2 com suporte a `temperatureAndHumiditySensor`
- Dados ficam na rede local, mais rápido, sem dependência de nuvem
- Mais complexo: precisa de servidor intermediário para enviar dados ao nosso backend

### Plano de implementação (Opção A)

1. **Configuração de credenciais**
   - Usuário cria app no eWeLink Developer Center
   - Armazenar `EWELINK_APP_ID` e `EWELINK_APP_SECRET` como secrets

2. **Edge Function `sync-sensors`**
   - Autenticação OAuth com eWeLink Cloud API
   - Endpoint GET para listar dispositivos e ler estado atual (temperatura, umidade)
   - Grava na tabela `leituras_sensores`

3. **Migration — tabelas de sensores**
   - `dispositivos_iot`: id, integrado_id, galpao_id, device_id_ewelink, nome, tipo, ativo
   - `leituras_sensores`: id, dispositivo_id, temperatura_c, umidade_pct, timestamp, raw_data (jsonb)

4. **Edge Function `sensor-webhook`** (opcional)
   - Recebe push da eWeLink quando valor muda
   - Grava leitura automaticamente

5. **Tela de cadastro de dispositivos**
   - Vincular Sonoff TH a um galpão específico
   - Listar dispositivos da conta eWeLink para o usuário selecionar

6. **Dashboard ambiental no galpão**
   - Cards com temperatura e umidade atual
   - Gráfico histórico (últimas 24h/7d)
   - Alertas quando fora da faixa ideal

7. **Alimentar análise IA de mortalidade**
   - A edge function `analise-mortalidade` já aceita temperatura/umidade
   - Passar dados automáticos dos sensores em vez de input manual

### Pré-requisito do usuário
- Criar conta gratuita em **dev.ewelink.cc**
- Criar aplicação e obter APP_ID + APP_SECRET
- O Sonoff TH precisa estar pareado no app eWeLink normalmente

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `supabase/functions/sync-sensors/index.ts` | Criar: consulta eWeLink API |
| `supabase/functions/sensor-webhook/index.ts` | Criar: recebe push |
| Migration | Criar tabelas `dispositivos_iot` e `leituras_sensores` |
| `src/pages/DispositivosIoT.tsx` | Criar: cadastro e monitoramento |
| `src/components/lotes/MortalidadeDialog.tsx` | Editar: auto-preencher temp/umidade do sensor |

