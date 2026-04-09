

## Plano: Automação de Recebimento de Ração via XML por E-mail (Gmail)

### Visão Geral

Criar um pipeline automatizado que monitora uma caixa Gmail, extrai anexos XML de NF-e de ração, faz o parse, valida contra solicitações pendentes, e registra o recebimento automaticamente -- com uma tela de revisão para o usuário confirmar.

### Arquitetura

```text
Gmail (XML anexo)
    │
    ▼
Edge Function "process-email-nfe"  ◄── pg_cron (a cada 5 min)
    │
    ├─ Conecta Gmail via API (OAuth ou App Password)
    ├─ Busca e-mails novos com anexo .xml
    ├─ Faz parse do XML (NF-e)
    ├─ Valida: é ração? Match com solicitação pendente?
    ├─ Insere em tabela "nfe_racao_recebidas" (status: pendente_revisao)
    └─ Marca e-mail como lido
    
    ▼
UI: Tela "Recebimentos Automáticos"
    ├─ Lista NF-es recebidas por e-mail
    ├─ Mostra match automático com solicitação
    ├─ Botão "Confirmar Recebimento" → atualiza solicitação + kardex
    └─ Botão "Rejeitar" → marca como rejeitada
```

### Etapas de Implementação

**1. Configuração Gmail (Connector ou Secret)**
- Verificar se existe connector Gmail disponível; caso contrário, usar Gmail API com OAuth2 ou App Password do Google
- Armazenar credenciais como secrets da Edge Function

**2. Nova tabela: `nfe_racao_recebidas`**
- `id`, `integrado_id`, `numero_nfe`, `serie`, `chave_nfe`, `cnpj_fornecedor`, `razao_social_fornecedor`, `data_emissao`, `valor_total`, `valor_frete`, `xml_raw` (text), `itens` (jsonb), `status` (enum: `pendente_revisao`, `confirmada`, `rejeitada`, `erro`), `solicitacao_racao_id` (FK nullable), `lote_id` (FK nullable), `erro_mensagem`, `processado_por`, `processado_em`, `email_message_id` (para evitar duplicatas), `created_at`
- RLS: acesso por `integrado_id`

**3. Edge Function: `process-email-nfe`**
- Conecta ao Gmail via API (busca e-mails não lidos com anexo .xml)
- Para cada anexo XML:
  - Reutiliza a lógica de parse de NF-e já existente no `IniciarRecebimentoDialog`
  - Verifica se é NF-e de ração (cruza itens com produtos do grupo "Ração")
  - Tenta match automático com `solicitacoes_racao` pendentes (por CNPJ fornecedor, tipo ração, quantidade similar, data próxima)
  - Insere em `nfe_racao_recebidas` com status `pendente_revisao`
  - Marca e-mail como lido no Gmail
- Executada via pg_cron a cada 5 minutos

**4. Tela de Revisão (UI)**
- Nova tab ou seção em "Gestão de Consumo" ou "Fábrica de Ração"
- Lista NF-es recebidas por e-mail com status
- Cards mostrando: NF-e info, match sugerido com solicitação, desvios de quantidade/preço
- Ações: "Confirmar Recebimento" (executa fluxo completo: atualiza solicitação, kardex, estoque) e "Rejeitar"
- Indicador de NF-es pendentes de revisão no dashboard

**5. Confirmação automática (fase 2, opcional)**
- Regra: se NF-e bate 100% com solicitação (fornecedor, tipo, quantidade ±5%), confirmar automaticamente
- Flag configurável por organização

### Arquivos Afetados

| Tipo | Arquivo | Ação |
|------|---------|------|
| DB | Migration | Criar tabela `nfe_racao_recebidas` + enum status |
| Edge Function | `supabase/functions/process-email-nfe/index.ts` | Nova - polling Gmail + parse XML |
| Config | `supabase/config.toml` | Adicionar `[functions.process-email-nfe]` |
| UI | `src/components/consumo/NfeRacaoRevisaoTab.tsx` | Nova - tela de revisão |
| UI | `src/pages/GestaoConsumo.tsx` | Adicionar tab "NF-e Recebidas" |
| Secrets | Gmail credentials | App Password ou OAuth tokens |

### Pré-requisitos

- **Gmail App Password**: o usuário precisa gerar uma senha de app no Google (2FA habilitado) ou configurar OAuth2
- Definir qual e-mail Gmail será monitorado

### Segurança

- XML armazenado como texto para auditoria
- `email_message_id` previne processamento duplicado
- RLS por `integrado_id`
- Credenciais Gmail armazenadas como secrets (nunca no código)

