# Protocolo GSA Tibiri - Especificação de Integração ERP

## Visão Geral

O protocolo GSA Tibiri define a comunicação bidirecional entre sistemas ERP locais (Firebird, SQL Server, etc.) e a plataforma Cloud do Portal do Fornecedor.

### Arquitetura Cloud Agent

O sistema utiliza duas Edge Functions que compõem o **Cloud Agent** (o "cérebro" na nuvem):

| Componente | Endpoint | Função |
|------------|----------|--------|
| **sync-erp** | `/functions/v1/sync-erp` | Centro de comando: autenticação, roteamento e persistência |
| **sync-erp-docs** | `/functions/v1/sync-erp-docs` | Interface Swagger UI interativa |

```
+-------------------+         +------------------+         +-------------------+
|    ERP LOCAL      |         |   BRIDGE AGENT   |         |   CLOUD AGENT     |
|  (Firebird, SQL)  |         |   (Executável)   |         |   (Edge Functions)|
+-------------------+         +------------------+         +-------------------+
        |                            |                            |
        |  1. Extrai dados          |                            |
        |-------------------------->|                            |
        |                           |  2. POST /sync-erp         |
        |                           |     (API Key + JSON)       |
        |                           |--------------------------->|
        |                           |                            |  3. Valida API Key
        |                           |                            |     (SHA-256 hash)
        |                           |                            |  4. Processa dados
        |                           |                            |  5. Persiste no DB
        |                           |  6. Response JSON          |
        |                           |<---------------------------|
        |  7. Atualiza ERP         |                            |
        |<--------------------------|                            |
```

**Vantagens do Cloud Agent:**
- Escalabilidade automática (serverless)
- Autenticação centralizada via API Keys
- Logs de sincronização para auditoria
- Interface Swagger para testes

---

## Documentação Interativa (Swagger)

Acesse a documentação interativa com exemplos executáveis:

```
https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/sync-erp-docs
```

O Swagger UI permite:
- Testar todas as ações diretamente no navegador
- Visualizar schemas de request/response
- Gerar exemplos de código
- Validar payloads antes de implementar

---

## Autenticação

### Endpoint

```
POST https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/sync-erp
```

### Headers Obrigatórios

| Header | Valor | Descrição |
|--------|-------|-----------|
| `X-API-Key` | `sk_live_...` | Chave gerada no Portal do Fornecedor |
| `Content-Type` | `application/json` | Tipo de conteúdo |

### Processo de Autenticação

1. A API Key é recebida no header `X-API-Key`
2. O Cloud Agent calcula o hash SHA-256 da chave
3. O hash é comparado com os hashes armazenados na tabela `api_keys_fornecedor`
4. Se válido, o `fornecedor_global_id` é extraído para escopo dos dados

### Exemplo de Requisição

```bash
curl -X POST \
  https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/sync-erp \
  -H "X-API-Key: sk_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"acao": "buscar_pedidos", "status": "pendente"}'
```

### Gerando API Key

1. Acesse o Portal do Fornecedor
2. Vá para a aba **Integração ERP**
3. Clique em **Gerar Nova API Key**
4. **IMPORTANTE**: A chave é exibida apenas UMA VEZ. Copie e armazene em local seguro.

---

## Mapeamento de Campos API → Banco

Esta seção documenta como os campos enviados pela API são mapeados para as colunas do banco de dados.

### Produtos (`produtos_catalogo_fornecedor`)

| Campo API | Campo Banco | Obrigatório | Descrição |
|-----------|-------------|-------------|-----------|
| `codigo_erp` | `codigo_erp`, `codigo_interno` | ✅ | Identificador único (usado em ambos) |
| `nome` | `nome` | ❌ | Nome do produto |
| `preco` | `preco_tabela` | ❌ | Preço de venda |
| `estoque` | `estoque_proprio` | ❌ | Quantidade em estoque |
| `unidade` | `unidade_venda` | ❌ | Unidade (default: UN) |
| `ativo` | `ativo` | ❌ | Status (default: true) |

### Clientes (`clientes_fornecedor`)

| Campo API | Campo Banco | Obrigatório | Descrição |
|-----------|-------------|-------------|-----------|
| `codigo_erp` | `codigo_erp` | ✅ | Código único no ERP |
| `razao_social` | `razao_social_nome` | ❌ | Razão social ou nome |
| `cpf_cnpj` | `cpf_cnpj` | ✅ | CPF ou CNPJ |
| `email` | `email` | ❌ | E-mail de contato |
| `telefone` | `telefone` | ❌ | Telefone de contato |
| `limite_credito` | `limite_credito` | ❌ | Limite de crédito |
| `saldo_credito` | `saldo_credito` | ❌ | Saldo disponível |
| `vendedor_codigo_erp` | (vincula via `codigo_vendedor`) | ❌ | Código do vendedor |

### Vendedores (`vendedores_fornecedor`)

| Campo API | Campo Banco | Obrigatório | Descrição |
|-----------|-------------|-------------|-----------|
| `codigo_erp` | `codigo_vendedor` | ✅ | Código único no ERP |
| `nome` | `nome` | ✅ | Nome do vendedor |
| `email` | `email` | ❌ | E-mail de contato |
| `telefone` | `telefone` | ❌ | Telefone |
| `regiao` | `regiao` | ❌ | Região de atuação |
| `ativo` | `ativo` | ❌ | Status (default: true) |

> **Nota:** O campo `user_id` é preservado durante atualizações para manter vínculos de login.

### Formas de Pagamento (`formas_pagamento_fornecedor`)

| Campo API | Campo Banco | Obrigatório | Descrição |
|-----------|-------------|-------------|-----------|
| `codigo_erp` | `codigo_erp`, `codigo` | ✅ | Código único |
| `nome` | `nome` | ✅ | Nome da forma |
| `ativo` | `ativo` | ❌ | Status (default: true) |

### Prazos de Pagamento (`prazos_pagamento_fornecedor`)

| Campo API | Campo Banco | Obrigatório | Descrição |
|-----------|-------------|-------------|-----------|
| `codigo_erp` | `codigo_erp` | ✅ | Código único |
| `nome` | `nome` | ✅ | Nome do prazo |
| `forma_codigo_erp` | (vincula via FK) | ✅ | Código da forma vinculada |
| `dias_parcelas` | `dias_parcelas` | ✅ | Array [7, 14, 21] |
| `quantidade_parcelas` | `quantidade_parcelas` | ❌ | Número de parcelas |
| `padrao` | `padrao` | ❌ | Se é o prazo padrão |

---

## Ações Disponíveis

| Ação | Direção | Descrição |
|------|---------|-----------|
| `sync_produtos` | ERP → Cloud | Sincroniza catálogo de produtos |
| `sync_clientes` | ERP → Cloud | Sincroniza cadastro de clientes |
| `sync_credito` | ERP → Cloud | Atualiza limite/saldo de crédito |
| `sync_vendedores` | ERP → Cloud | Sincroniza equipe de vendedores |
| `sync_formas_pagamento` | ERP → Cloud | Sincroniza formas e prazos de pagamento |
| `buscar_pedidos` | Cloud → ERP | Lista pedidos para importação |
| `confirmar_pedido_erp` | ERP → Cloud | Confirma importação do pedido |
| `atualizar_status` | ERP → Cloud | Atualiza status do pedido |
| `confirmar_nfe` | ERP → Cloud | Registra NF-e emitida |
| `registrar_erro_pedido` | ERP → Cloud | Registra erro (visível ao vendedor) |

---

## 1. Sincronizar Produtos (`sync_produtos`)

Sincroniza catálogo de produtos entre ERP e Cloud. Produtos são identificados pelo `codigo_erp` - se existir atualiza, se não existir **cria novo**.

### Requisição

```json
{
  "acao": "sync_produtos",
  "produtos": [
    {
      "codigo_erp": "PROD001",
      "nome": "Ração Inicial Premium",
      "preco": 185.50,
      "estoque": 500,
      "unidade": "KG",
      "ativo": true
    },
    {
      "codigo_erp": "PROD002",
      "nome": "Ração Crescimento",
      "preco": 175.00,
      "estoque": 1200
    }
  ]
}
```

### Campos do Produto

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `codigo_erp` | string | ✅ | Código único no ERP local |
| `nome` | string | ❌ | Nome do produto (atualiza se enviado) |
| `preco` | number | ❌ | Preço de venda |
| `estoque` | number | ❌ | Quantidade em estoque (mapeia para `estoque_proprio`) |
| `unidade` | string | ❌ | Unidade de venda (default: UN) |
| `ativo` | boolean | ❌ | Status ativo/inativo (default: true) |

### Resposta de Sucesso

```json
{
  "success": true,
  "acao": "sync_produtos",
  "processados": 2,
  "erros": 0,
  "detalhes": []
}
```

### Resposta com Erros Parciais

```json
{
  "success": true,
  "acao": "sync_produtos",
  "processados": 1,
  "erros": 1,
  "detalhes": [
    {
      "codigo_erp": "PROD003",
      "erro": "duplicate key value violates unique constraint"
    }
  ]
}
```

### Comportamento

- Produtos são identificados pelo `codigo_erp`
- Se o produto **NÃO existir** no Cloud, será **CRIADO automaticamente**
- Se já existir, apenas os campos enviados são atualizados
- O campo `codigo_interno` é preenchido automaticamente com o valor de `codigo_erp`
- O campo `estoque` da API mapeia para `estoque_proprio` no banco
- Erros individuais são retornados no array `detalhes` sem interromper o processamento

---

## 2. Sincronizar Clientes (`sync_clientes`)

Sincroniza cadastro de clientes entre ERP e Cloud.

### Requisição

```json
{
  "acao": "sync_clientes",
  "clientes": [
    {
      "codigo_erp": "CLI001",
      "razao_social": "Fazenda Boa Vista Ltda",
      "cpf_cnpj": "12345678000199",
      "email": "contato@boavista.com",
      "telefone": "(11) 99999-8888",
      "vendedor_codigo_erp": "VEND001"
    }
  ]
}
```

### Campos do Cliente

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `codigo_erp` | string | ✅ | Código único no ERP local |
| `razao_social` | string | ❌ | Razão social ou nome |
| `cpf_cnpj` | string | ✅ | CPF ou CNPJ (apenas números) |
| `email` | string | ❌ | E-mail de contato |
| `telefone` | string | ❌ | Telefone de contato |
| `vendedor_codigo_erp` | string | ❌ | Código do vendedor responsável (vincula automaticamente) |
| `limite_credito` | number | ❌ | Limite de crédito do cliente |
| `saldo_credito` | number | ❌ | Saldo de crédito disponível |
| `endereco.logradouro` | string | ❌ | Endereço - logradouro |
| `endereco.numero` | string | ❌ | Endereço - número |
| `endereco.bairro` | string | ❌ | Endereço - bairro |
| `endereco.cidade` | string | ❌ | Endereço - cidade |
| `endereco.estado` | string | ❌ | Endereço - UF |
| `endereco.cep` | string | ❌ | Endereço - CEP |

### Resposta de Sucesso

```json
{
  "success": true,
  "acao": "sync_clientes",
  "processados": 1,
  "erros": 0,
  "detalhes": []
}
```

### Comportamento

- Clientes são identificados pelo `codigo_erp`
- Se `vendedor_codigo_erp` for informado, o cliente será vinculado ao vendedor correspondente
- Vendedores são vinculados apenas se o `codigo_vendedor` existir na tabela `vendedores_fornecedor`
- Clientes sem `vendedor_codigo_erp` ficam disponíveis para todos os vendedores

---

## 3. Sincronizar Crédito (`sync_credito`)

Atualiza limite e saldo de crédito dos clientes.

### Requisição

```json
{
  "acao": "sync_credito",
  "clientes": [
    {
      "codigo_erp": "CLI001",
      "limite_credito": 50000.00,
      "saldo_credito": 35000.00
    },
    {
      "codigo_erp": "CLI002",
      "limite_credito": 25000.00,
      "saldo_credito": 25000.00
    }
  ]
}
```

### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `codigo_erp` | string | ✅ | Código do cliente no ERP |
| `limite_credito` | number | ❌ | Limite total de crédito |
| `saldo_credito` | number | ❌ | Saldo disponível atual |

### Resposta de Sucesso

```json
{
  "success": true,
  "updated": 2,
  "message": "2 clientes com crédito atualizado"
}
```

---

## 4. Sincronizar Vendedores (`sync_vendedores`)

Sincroniza equipe de vendedores entre ERP e Cloud. O vínculo de login (user_id) é preservado durante atualizações.

### Requisição

```json
{
  "acao": "sync_vendedores",
  "vendedores": [
    {
      "codigo_erp": "VEND001",
      "nome": "Carlos Silva",
      "email": "carlos@empresa.com",
      "telefone": "(11) 99999-8888",
      "regiao": "Sul",
      "observacoes": "Vendedor sênior",
      "ativo": true
    },
    {
      "codigo_erp": "VEND002",
      "nome": "Maria Santos",
      "email": "maria@empresa.com",
      "telefone": "(11) 88888-7777",
      "regiao": "Norte",
      "ativo": true
    }
  ]
}
```

### Campos do Vendedor

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `codigo_erp` | string | ✅ | Código único no ERP local |
| `nome` | string | ✅ | Nome completo do vendedor |
| `email` | string | ❌ | E-mail de contato |
| `telefone` | string | ❌ | Telefone de contato |
| `regiao` | string | ❌ | Região de atuação |
| `observacoes` | string | ❌ | Notas adicionais |
| `ativo` | boolean | ❌ | Status ativo/inativo (default: true) |

### Resposta de Sucesso

```json
{
  "success": true,
  "acao": "sync_vendedores",
  "processados": 2,
  "erros": 0,
  "detalhes": []
}
```

### Comportamento

- Vendedores são identificados pelo `codigo_erp` (campo `codigo_vendedor` no Cloud)
- Se o vendedor não existir, será criado automaticamente
- Se já existir, apenas os campos enviados são atualizados
- O campo `user_id` (vínculo de login) é preservado durante updates
- Para desativar um vendedor, envie `ativo: false`

---

## 5. Sincronizar Formas de Pagamento (`sync_formas_pagamento`)

Sincroniza formas e prazos de pagamento entre ERP e Cloud. Os prazos são vinculados às formas de pagamento.

### Requisição

```json
{
  "acao": "sync_formas_pagamento",
  "formas": [
    {
      "codigo_erp": "BOL",
      "nome": "Boleto Bancário",
      "ativo": true
    },
    {
      "codigo_erp": "PIX",
      "nome": "PIX",
      "ativo": true
    }
  ],
  "prazos": [
    {
      "codigo_erp": "BOL-7-14-21",
      "nome": "Boleto 7/14/21 dias",
      "forma_codigo_erp": "BOL",
      "dias_parcelas": [7, 14, 21],
      "quantidade_parcelas": 3,
      "padrao": true,
      "ativo": true
    },
    {
      "codigo_erp": "PIX-AV",
      "nome": "PIX à Vista",
      "forma_codigo_erp": "PIX",
      "dias_parcelas": [0],
      "quantidade_parcelas": 1,
      "padrao": false,
      "ativo": true
    }
  ]
}
```

### Campos da Forma de Pagamento

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `codigo_erp` | string | ✅ | Código único no ERP local |
| `nome` | string | ✅ | Nome da forma de pagamento |
| `codigo` | string | ❌ | Código interno (usa codigo_erp se não informado) |
| `ativo` | boolean | ❌ | Status ativo/inativo (default: true) |

### Campos do Prazo de Pagamento

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `codigo_erp` | string | ✅ | Código único no ERP local |
| `nome` | string | ✅ | Nome do prazo de pagamento |
| `forma_codigo_erp` | string | ✅ | Código da forma de pagamento vinculada |
| `dias_parcelas` | array | ✅ | Array com dias de cada parcela [7, 14, 21] |
| `quantidade_parcelas` | number | ❌ | Quantidade de parcelas (default: tamanho do array) |
| `padrao` | boolean | ❌ | Se é o prazo padrão desta forma (default: false) |
| `ativo` | boolean | ❌ | Status ativo/inativo (default: true) |

### Resposta de Sucesso

```json
{
  "success": true,
  "acao": "sync_formas_pagamento",
  "formas_processadas": 2,
  "prazos_processados": 2,
  "erros": 0,
  "detalhes": []
}
```

### Comportamento

- Formas e prazos são identificados pelo `codigo_erp`
- Se não existir, será criado automaticamente
- Se já existir, apenas os campos enviados são atualizados
- Prazos são vinculados à forma pelo `forma_codigo_erp`
- Pode enviar apenas formas, apenas prazos, ou ambos
- Formas devem ser enviadas antes dos prazos na mesma requisição

---

## 6. Buscar Pedidos (`buscar_pedidos`)

Retorna lista de pedidos para importação no ERP.

### Requisição

```json
{
  "acao": "buscar_pedidos",
  "status": "pendente"
}
```

### Parâmetros

| Campo | Tipo | Obrigatório | Valores | Descrição |
|-------|------|-------------|---------|-----------|
| `status` | string | ❌ | `pendente`, `exportado`, `aprovado`, etc. | Filtra por status (padrão: `pendente`) |

### Resposta de Sucesso

```json
{
  "success": true,
  "pedidos": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "numero_pedido": "PED-2026-0001",
      "data_pedido": "2026-01-31T14:30:00Z",
      "cliente": {
        "id": "cliente-uuid",
        "codigo_erp": "CLI001",
        "razao_social": "Fazenda Boa Vista Ltda",
        "cpf_cnpj": "12345678000199"
      },
      "valor_total": 15750.00,
      "forma_pagamento": "boleto",
      "prazo_pagamento": "7/14/21",
      "observacoes": "Entregar pela manhã",
      "itens": [
        {
          "id": "item-uuid",
          "produto_id": "produto-uuid",
          "codigo_erp": "PROD001",
          "nome": "Ração Inicial Premium",
          "quantidade": 50,
          "preco_unitario": 185.50,
          "subtotal": 9275.00
        },
        {
          "id": "item-uuid-2",
          "produto_id": "produto-uuid-2",
          "codigo_erp": "PROD002",
          "nome": "Ração Crescimento",
          "quantidade": 37,
          "preco_unitario": 175.00,
          "subtotal": 6475.00
        }
      ]
    }
  ]
}
```

### Estrutura do Pedido

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único do pedido no Cloud |
| `numero_pedido` | string | Número sequencial do pedido |
| `data_pedido` | ISO8601 | Data/hora de criação |
| `cliente` | object | Dados do cliente |
| `valor_total` | number | Valor total do pedido |
| `forma_pagamento` | string | Código da forma de pagamento |
| `prazo_pagamento` | string | Descrição do prazo |
| `observacoes` | string | Observações do vendedor |
| `itens` | array | Lista de itens do pedido |

---

## 7. Confirmar Pedido no ERP (`confirmar_pedido_erp`)

Marca o pedido como exportado/importado no ERP.

### Requisição

```json
{
  "acao": "confirmar_pedido_erp",
  "pedido_id": "550e8400-e29b-41d4-a716-446655440000",
  "codigo_erp": "PV-2026-00123"
}
```

### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `pedido_id` | UUID | ✅ | ID do pedido no Cloud |
| `codigo_erp` | string | ✅ | Código/número do pedido no ERP local |

### Resposta de Sucesso

```json
{
  "success": true,
  "message": "Pedido confirmado como exportado"
}
```

### Comportamento

- Status do pedido muda de `pendente` para `exportado`
- O `codigo_erp` é salvo para referência futura

---

## 8. Atualizar Status (`atualizar_status`)

Atualiza o status do pedido conforme progresso no ERP.

### Requisição

```json
{
  "acao": "atualizar_status",
  "pedido_id": "550e8400-e29b-41d4-a716-446655440000",
  "novo_status": "aprovado"
}
```

### Status Válidos

| Status | Descrição |
|--------|-----------|
| `exportado` | Importado no ERP |
| `aprovado` | Aprovado para faturamento |
| `separado` | Em separação/picking |
| `faturado` | NF-e emitida (use `confirmar_nfe`) |
| `entregue` | Entrega realizada |

### Fluxo de Transições

```
pendente → exportado → aprovado → separado → faturado → entregue
                ↘                                    ↗
                  → erro (pode ocorrer a qualquer momento antes do faturamento)
```

### Resposta de Sucesso

```json
{
  "success": true,
  "message": "Status atualizado para aprovado"
}
```

---

## 9. Confirmar NF-e (`confirmar_nfe`)

Registra a emissão da Nota Fiscal Eletrônica.

### Requisição

```json
{
  "acao": "confirmar_nfe",
  "pedido_id": "550e8400-e29b-41d4-a716-446655440000",
  "numero_nfe": "000123456",
  "chave_nfe": "35260112345678000123550010001234561234567890",
  "data_faturamento": "2026-01-31"
}
```

### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `pedido_id` | UUID | ✅ | ID do pedido no Cloud |
| `numero_nfe` | string | ✅ | Número da NF-e |
| `chave_nfe` | string | ✅ | Chave de acesso (44 dígitos) |
| `data_faturamento` | date | ❌ | Data de emissão (YYYY-MM-DD) |

### Resposta de Sucesso

```json
{
  "success": true,
  "message": "NF-e registrada com sucesso"
}
```

### Comportamento

- Status do pedido muda automaticamente para `faturado`
- Os dados da NF-e ficam disponíveis para consulta no Portal

---

## 10. Registrar Erro (`registrar_erro_pedido`)

Registra um erro no processamento do pedido. **O vendedor verá esta mensagem imediatamente no PWA.**

### Requisição

```json
{
  "acao": "registrar_erro_pedido",
  "pedido_id": "550e8400-e29b-41d4-a716-446655440000",
  "error_message": "Produto PROD001 sem estoque suficiente. Disponível: 30, Solicitado: 50"
}
```

### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `pedido_id` | UUID | ✅ | ID do pedido no Cloud |
| `error_message` | string | ✅ | Mensagem de erro (visível ao vendedor) |

### Resposta de Sucesso

```json
{
  "success": true,
  "message": "Erro registrado no pedido"
}
```

### Comportamento

- A mensagem fica visível no PWA de vendas com ícone de alerta
- Inclui timestamp do erro
- Pode ser limpo enviando nova requisição com `error_message: null`

---

## Códigos de Erro

| HTTP Status | Código | Descrição |
|-------------|--------|-----------|
| 401 | `UNAUTHORIZED` | API Key inválida ou inativa |
| 400 | `INVALID_ACTION` | Ação não reconhecida |
| 400 | `MISSING_FIELDS` | Campos obrigatórios ausentes |
| 404 | `NOT_FOUND` | Pedido/cliente/produto não encontrado |
| 403 | `ACCESS_DENIED` | Tentativa de acessar dados de outro fornecedor |
| 500 | `INTERNAL_ERROR` | Erro interno do servidor |

### Estrutura de Resposta de Erro

```json
{
  "success": false,
  "error": "NOT_FOUND",
  "message": "Pedido não encontrado"
}
```

### Estrutura de Resposta com Erros Parciais

Algumas ações (como `sync_produtos`) processam múltiplos registros e podem ter sucesso parcial:

```json
{
  "success": true,
  "acao": "sync_produtos",
  "processados": 8,
  "erros": 2,
  "detalhes": [
    {
      "codigo_erp": "PROD003",
      "erro": "violates foreign key constraint"
    },
    {
      "codigo_erp": "PROD007",
      "erro": "invalid input syntax for type numeric"
    }
  ]
}
```

---

## Exemplo de Implementação (Python)

```python
import requests
import hashlib

class GSATibiriClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/sync-erp"
    
    def _request(self, payload: dict) -> dict:
        headers = {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json"
        }
        response = requests.post(self.base_url, json=payload, headers=headers)
        return response.json()
    
    def buscar_pedidos_pendentes(self) -> list:
        result = self._request({"acao": "buscar_pedidos", "status": "pendente"})
        if result.get("success"):
            return result.get("pedidos", [])
        return []
    
    def confirmar_importacao(self, pedido_id: str, codigo_erp: str) -> bool:
        result = self._request({
            "acao": "confirmar_pedido_erp",
            "pedido_id": pedido_id,
            "codigo_erp": codigo_erp
        })
        return result.get("success", False)
    
    def atualizar_status(self, pedido_id: str, status: str) -> bool:
        result = self._request({
            "acao": "atualizar_status",
            "pedido_id": pedido_id,
            "novo_status": status
        })
        return result.get("success", False)
    
    def registrar_nfe(self, pedido_id: str, numero: str, chave: str) -> bool:
        result = self._request({
            "acao": "confirmar_nfe",
            "pedido_id": pedido_id,
            "numero_nfe": numero,
            "chave_nfe": chave
        })
        return result.get("success", False)
    
    def sync_produtos(self, produtos: list) -> dict:
        result = self._request({
            "acao": "sync_produtos",
            "produtos": produtos
        })
        return result
    
    def registrar_erro(self, pedido_id: str, mensagem: str) -> bool:
        result = self._request({
            "acao": "registrar_erro_pedido",
            "pedido_id": pedido_id,
            "error_message": mensagem
        })
        return result.get("success", False)


# Uso
client = GSATibiriClient("sk_live_sua_chave_aqui")

# Sincronizar produtos
resultado = client.sync_produtos([
    {"codigo_erp": "PROD001", "nome": "Ração Premium", "preco": 185.50, "estoque": 500},
    {"codigo_erp": "PROD002", "nome": "Ração Standard", "preco": 145.00, "estoque": 800}
])
print(f"Processados: {resultado.get('processados')}, Erros: {resultado.get('erros')}")

# Buscar pedidos novos
pedidos = client.buscar_pedidos_pendentes()
for pedido in pedidos:
    print(f"Pedido {pedido['numero_pedido']}: R$ {pedido['valor_total']}")
    
    # Processar no ERP local...
    codigo_erp = processar_no_erp(pedido)
    
    if codigo_erp:
        client.confirmar_importacao(pedido['id'], codigo_erp)
    else:
        client.registrar_erro(pedido['id'], "Falha ao importar no ERP")
```

---

## Exemplo de Implementação (Delphi/Pascal)

```pascal
unit GSATibiri;

interface

uses
  System.SysUtils, System.Classes, System.JSON, 
  System.Net.HttpClient, System.Net.HttpClientComponent;

type
  TGSATibiriClient = class
  private
    FApiKey: string;
    FBaseUrl: string;
    function DoRequest(const APayload: TJSONObject): TJSONObject;
  public
    constructor Create(const AApiKey: string);
    function BuscarPedidosPendentes: TJSONArray;
    function ConfirmarImportacao(const APedidoId, ACodigoErp: string): Boolean;
    function AtualizarStatus(const APedidoId, ANovoStatus: string): Boolean;
    function RegistrarNfe(const APedidoId, ANumero, AChave: string): Boolean;
    function RegistrarErro(const APedidoId, AMensagem: string): Boolean;
    function SyncProdutos(const AProdutos: TJSONArray): TJSONObject;
  end;

implementation

constructor TGSATibiriClient.Create(const AApiKey: string);
begin
  FApiKey := AApiKey;
  FBaseUrl := 'https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/sync-erp';
end;

function TGSATibiriClient.DoRequest(const APayload: TJSONObject): TJSONObject;
var
  HttpClient: THTTPClient;
  Response: IHTTPResponse;
  Content: TStringStream;
begin
  HttpClient := THTTPClient.Create;
  Content := TStringStream.Create(APayload.ToJSON, TEncoding.UTF8);
  try
    HttpClient.CustomHeaders['X-API-Key'] := FApiKey;
    HttpClient.ContentType := 'application/json';
    
    Response := HttpClient.Post(FBaseUrl, Content);
    Result := TJSONObject.ParseJSONValue(Response.ContentAsString) as TJSONObject;
  finally
    Content.Free;
    HttpClient.Free;
  end;
end;

function TGSATibiriClient.BuscarPedidosPendentes: TJSONArray;
var
  Payload, Response: TJSONObject;
begin
  Payload := TJSONObject.Create;
  try
    Payload.AddPair('acao', 'buscar_pedidos');
    Payload.AddPair('status', 'pendente');
    
    Response := DoRequest(Payload);
    try
      if Response.GetValue<Boolean>('success') then
        Result := Response.GetValue<TJSONArray>('pedidos').Clone as TJSONArray
      else
        Result := TJSONArray.Create;
    finally
      Response.Free;
    end;
  finally
    Payload.Free;
  end;
end;

function TGSATibiriClient.SyncProdutos(const AProdutos: TJSONArray): TJSONObject;
var
  Payload: TJSONObject;
begin
  Payload := TJSONObject.Create;
  try
    Payload.AddPair('acao', 'sync_produtos');
    Payload.AddPair('produtos', AProdutos.Clone as TJSONArray);
    
    Result := DoRequest(Payload);
  finally
    Payload.Free;
  end;
end;

function TGSATibiriClient.ConfirmarImportacao(const APedidoId, ACodigoErp: string): Boolean;
var
  Payload, Response: TJSONObject;
begin
  Payload := TJSONObject.Create;
  try
    Payload.AddPair('acao', 'confirmar_pedido_erp');
    Payload.AddPair('pedido_id', APedidoId);
    Payload.AddPair('codigo_erp', ACodigoErp);
    
    Response := DoRequest(Payload);
    try
      Result := Response.GetValue<Boolean>('success');
    finally
      Response.Free;
    end;
  finally
    Payload.Free;
  end;
end;

// ... demais métodos seguem o mesmo padrão

end.
```

---

## Boas Práticas

### 1. Tratamento de Erros

Sempre verifique o campo `success` na resposta antes de processar os dados. Para ações em lote, verifique também o campo `erros` e processe o array `detalhes`.

### 2. Retry com Backoff

Em caso de erros de rede ou timeout, implemente retry com backoff exponencial:

```python
import time

def request_with_retry(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)  # 1s, 2s, 4s
```

### 3. Sincronização Incremental

Para produtos e clientes, envie apenas registros alterados desde a última sincronização.

### 4. Logs

Mantenha logs detalhados de todas as operações para auditoria e troubleshooting. O Cloud Agent também mantém logs de sincronização acessíveis na aba **Integração ERP**.

### 5. Horários de Sincronização

- **Produtos/Estoque**: A cada 5-15 minutos
- **Pedidos**: A cada 1-2 minutos
- **Status**: Imediatamente após alteração no ERP

### 6. Validação de Erros Parciais

Para sincronizações em lote, sempre processe o array `detalhes` mesmo quando `success: true`:

```python
resultado = client.sync_produtos(produtos)
if resultado.get('erros', 0) > 0:
    for erro in resultado.get('detalhes', []):
        print(f"Erro no produto {erro['codigo_erp']}: {erro['erro']}")
        # Tratar ou logar o erro específico
```

---

## Suporte

Para dúvidas técnicas sobre a integração:
1. Consulte a **Documentação Interativa (Swagger)** para testar ações
2. Verifique os **Logs de Sincronização** na aba **Integração ERP** do Portal
3. Entre em contato pelo suporte do Portal do Fornecedor
