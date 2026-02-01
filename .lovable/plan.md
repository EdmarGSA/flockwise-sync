

# Plano Consolidado: Portal do Fornecedor - Automacao de Vendas e Integracao ERP

## Visao Geral

Este plano consolida todas as melhorias planejadas para o modulo de Automacao de Vendas do Portal do Fornecedor, incluindo:

1. **UX Mobile** - Interface otimizada para vendedores em campo (IMPLEMENTADO)
2. **Formas e Prazos de Pagamento** - Cadastro dinamico por fornecedor
3. **Integracao ERP (Padrao GSA Tibiri)** - Sincronizacao bidirecional com sistemas locais

---

## Parte 1: UX Mobile da Aba de Vendas (CONCLUIDO)

### Status: Implementado

Componentes criados:
- `BottomNavVendas.tsx` - Barra de navegacao inferior fixa
- `CategoriasSheet.tsx` - Sheet lateral com categorias
- `MenuVendasSheet.tsx` - Menu de opcoes secundarias

Componentes modificados:
- `VendasTab.tsx` - Logica responsiva mobile/desktop
- `CategoriasSidebar.tsx` - Suporte para uso dentro de Sheet

### Funcionalidades Entregues

| Funcionalidade | Descricao |
|----------------|-----------|
| Barra inferior fixa | Navegacao rapida com polegar (Home, Categorias, Carrinho, Menu) |
| Categorias em Sheet | Abre pela esquerda, fecha ao selecionar |
| Grid responsivo | 2 colunas mobile, 4 colunas desktop |
| Badge no carrinho | Contador de itens em tempo real |
| Safe area | Padding para iPhones com notch |

---

## Parte 2: Formas e Prazos de Pagamento

### Status: IMPLEMENTADO ✅

### 2.1 Problema Atual

O `FinalizarPedidoDialog` usa constante fixa:

```javascript
const CONDICOES_PAGAMENTO = [
  { value: 'a_vista', label: 'A Vista' },
  { value: '7_dias', label: '7 Dias' },
  // ... hardcoded
];
```

### 2.2 Solucao: Tabelas Dinamicas

```text
formas_pagamento_fornecedor
+--------------------+---------------------------+
| Campo              | Descricao                 |
+--------------------+---------------------------+
| id                 | UUID                      |
| fornecedor_global_id | FK fornecedores_globais |
| codigo             | 'boleto', 'pix', 'cartao' |
| nome               | 'Boleto Bancario'         |
| codigo_erp         | Codigo no ERP local       |
| ativo              | Boolean                   |
+--------------------+---------------------------+

prazos_pagamento_fornecedor
+--------------------+---------------------------+
| Campo              | Descricao                 |
+--------------------+---------------------------+
| id                 | UUID                      |
| fornecedor_global_id | FK fornecedores_globais |
| forma_pagamento_id | FK formas_pagamento       |
| nome               | 'A Vista', '7/14/21'      |
| dias_parcelas      | [0] ou [7,14,21]          |
| quantidade_parcelas| 1, 3, etc                 |
| codigo_erp         | Codigo no ERP local       |
| padrao             | Boolean                   |
| ativo              | Boolean                   |
+--------------------+---------------------------+
```

### 2.3 Interface de Configuracao

Nova aba "Comercial" no Portal com:
- Cadastro de formas de pagamento
- Configuracao de prazos por forma
- Toggle ativo/inativo
- Campo codigo_erp para mapeamento

---

## Parte 3: Integracao ERP - Padrao GSA Tibiri

### Status: IMPLEMENTADO ✅

### 3.1 Arquitetura

```text
+-------------------+         +------------------+         +-------------------+
|    ERP LOCAL      |         |   BRIDGE AGENT   |         |   CLOUD (Lovable) |
|  (Firebird, SQL)  |         |   (GSA Tibiri)   |         |                   |
+-------------------+         +------------------+         +-------------------+
        |                            |                            |
        |  1. Extrai dados          |                            |
        |-------------------------->|                            |
        |                           |  2. POST /sync-erp         |
        |                           |     (API Key + JSON)       |
        |                           |--------------------------->|
        |                           |                            |  3. Valida API Key
        |                           |                            |  4. Processa dados
        |                           |  5. Response               |
        |                           |<---------------------------|
        |  6. Atualiza ERP         |                            |
        |<--------------------------|                            |
```

### 3.2 Seguranca via API Key

| Aspecto | Implementacao |
|---------|---------------|
| Armazenamento | Apenas hash SHA-256 no banco |
| Geracao | Chave exibida UMA VEZ para o usuario |
| Validacao | Compara hash antes de processar |
| Isolamento | `fornecedor_global_id` vinculado a API Key |
| Revogacao | Toggle `ativo = false` invalida imediatamente |

### 3.3 Acoes da Edge Function

```text
+------------------------------------------------------------------+
|                    EDGE FUNCTION: sync-erp                       |
+------------------------------------------------------------------+
| ACAO                  | DIRECAO        | DESCRICAO               |
|-----------------------|----------------|-------------------------|
| sync_produtos         | ERP -> Cloud   | Atualiza estoque/preco  |
| sync_clientes         | ERP -> Cloud   | Sincroniza cadastro     |
| sync_credito          | ERP -> Cloud   | Atualiza limite/saldo   |
| buscar_pedidos        | Cloud -> ERP   | Lista pedidos novos     |
| confirmar_pedido_erp  | ERP -> Cloud   | Marca como exportado    |
| atualizar_status      | ERP -> Cloud   | Transicao de status     |
| confirmar_nfe         | ERP -> Cloud   | Registra NF-e emitida   |
| registrar_erro_pedido | ERP -> Cloud   | Registra erro (vendedor ve)|
+------------------------------------------------------------------+
```

### 3.4 Ciclo de Vida do Pedido

```text
[PWA Vendas]                     [Bridge/ERP]
     |                                |
     |-- Cria pedido (pendente) ----->|
     |                                |
     |                    GET buscar_pedidos
     |                                |
     |<---- confirmar_pedido_erp -----|  (exportado)
     |                                |
     |<---- atualizar_status ---------|  (aprovado)
     |                                |
     |<---- atualizar_status ---------|  (separado)
     |                                |
     |<---- confirmar_nfe ------------|  (faturado + NF-e)
     |                                |
     |<---- atualizar_status ---------|  (entregue)
     |                                |

FLUXO DE ERRO:
     |                                |
     |<---- registrar_erro_pedido ----|  (erro + mensagem)
     |                                |
[Vendedor ve erro no PWA imediatamente]
```

### 3.5 Transicoes de Status Validas

```text
pendente -> exportado -> aprovado -> separado -> faturado -> entregue
                  |           |           |
                  v           v           v
                erro        erro        erro
```

---

## Migracao SQL Consolidada

### Novas Tabelas

```sql
-- Formas de pagamento do fornecedor
CREATE TABLE formas_pagamento_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES fornecedores_globais(id),
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  codigo_erp TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fornecedor_global_id, codigo)
);

-- Prazos vinculados as formas
CREATE TABLE prazos_pagamento_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES fornecedores_globais(id),
  forma_pagamento_id UUID NOT NULL REFERENCES formas_pagamento_fornecedor(id),
  nome TEXT NOT NULL,
  dias_parcelas INTEGER[] NOT NULL DEFAULT '{0}',
  quantidade_parcelas INTEGER DEFAULT 1,
  codigo_erp TEXT,
  padrao BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Campos ERP nas Tabelas Existentes

```sql
-- Pedidos
ALTER TABLE pedidos_catalogo_fornecedor 
ADD COLUMN codigo_erp TEXT,
ADD COLUMN numero_nfe TEXT,
ADD COLUMN chave_nfe TEXT,
ADD COLUMN data_faturamento TIMESTAMPTZ,
ADD COLUMN erp_error_message TEXT,
ADD COLUMN erp_error_at TIMESTAMPTZ;

-- Clientes
ALTER TABLE clientes_fornecedor 
ADD COLUMN codigo_erp TEXT;

-- Produtos
ALTER TABLE produtos_catalogo_fornecedor 
ADD COLUMN codigo_erp TEXT;

-- Indices
CREATE INDEX idx_pedidos_catalogo_codigo_erp ON pedidos_catalogo_fornecedor(codigo_erp);
CREATE INDEX idx_clientes_fornecedor_codigo_erp ON clientes_fornecedor(codigo_erp);
CREATE INDEX idx_produtos_catalogo_codigo_erp ON produtos_catalogo_fornecedor(codigo_erp);
```

---

## Arquivos a Criar

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `supabase/functions/sync-erp/index.ts` | Edge Function de integracao |
| 2 | `src/components/fornecedor/FornecedorIntegracaoERPTab.tsx` | Aba de gerenciamento ERP |
| 3 | `src/components/fornecedor/FormasPagamentoFornecedorTab.tsx` | Cadastro formas/prazos |
| 4 | `src/components/fornecedor/ApiKeyDialog.tsx` | Dialog geracao API Key |
| 5 | `src/hooks/useSyncErpLogs.tsx` | Hook para logs de sincronizacao |

## Arquivos a Modificar

| # | Arquivo | Modificacao |
|---|---------|-------------|
| 1 | `src/pages/PortalFornecedor.tsx` | Adicionar abas "Comercial" e "Integracao ERP" |
| 2 | `src/components/fornecedor/vendas/FinalizarPedidoDialog.tsx` | Usar formas/prazos do banco |
| 3 | `src/pages/MeusPedidosFornecedor.tsx` | Exibir erros do ERP |
| 4 | `supabase/config.toml` | Adicionar config da edge function |

---

## Protocolo GSA Tibiri - Especificacao para Bridge Agent

### Endpoint

```text
POST https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/sync-erp
Header: X-API-Key: <chave-gerada-no-portal>
Content-Type: application/json
```

### Exemplos de Requisicoes

```javascript
// 1. Buscar pedidos novos
{ "acao": "buscar_pedidos", "status": "pendente" }

// 2. Confirmar importacao no ERP
{ "acao": "confirmar_pedido_erp", "pedido_id": "uuid", "codigo_erp": "12345" }

// 3. Atualizar status
{ "acao": "atualizar_status", "pedido_id": "uuid", "novo_status": "aprovado" }

// 4. Registrar erro
{ "acao": "registrar_erro_pedido", "pedido_id": "uuid", "error_message": "Produto sem estoque" }

// 5. Confirmar NF-e
{ 
  "acao": "confirmar_nfe", 
  "pedido_id": "uuid", 
  "numero_nfe": "123456", 
  "chave_nfe": "35260112345678000123550010001234561234567890",
  "data_faturamento": "2026-01-31"
}

// 6. Sincronizar produtos
{ 
  "acao": "sync_produtos", 
  "produtos": [
    { "codigo_erp": "PROD001", "nome": "Racao Inicial", "preco": 185.00, "estoque": 500 }
  ]
}

// 7. Sincronizar clientes
{ 
  "acao": "sync_clientes", 
  "clientes": [
    { "codigo_erp": "CLI001", "razao_social": "Fazenda Boa Vista", "cpf_cnpj": "12345678000199" }
  ]
}
```

---

## Analise de Seguranca

| Risco | Mitigacao |
|-------|-----------|
| Exposicao de API Key | Armazena apenas hash SHA-256 |
| Acesso cruzado | Valida `fornecedor_global_id` em TODA operacao |
| Injecao SQL | Supabase client com prepared statements |
| Rate limiting | 100 req/min por API Key |
| Revogacao | Toggle `ativo = false` invalida imediatamente |
| Auditoria | Log de todas operacoes em `sync_erp_log` |

---

## Ordem de Implementacao

| Fase | Descricao | Status |
|------|-----------|--------|
| 1 | Migracao SQL (tabelas + campos) | ✅ CONCLUÍDO |
| 2 | Edge Function sync-erp | ✅ CONCLUÍDO |
| 3 | Aba Integracao ERP (API Keys + Logs) | ✅ CONCLUÍDO |
| 4 | Formas/Prazos de Pagamento | ✅ CONCLUÍDO |
| 5 | Exibicao de erros ERP no PWA | ✅ CONCLUÍDO |
| 6 | Documentacao para Bridge Agent | ✅ CONCLUÍDO |

---

## Resultado Esperado

| Funcionalidade | Beneficio |
|----------------|-----------|
| UX Mobile | Vendedores usam como app nativo |
| Formas/Prazos dinamicos | Fornecedor configura suas condicoes |
| API Key segura | Integracao sem expor credenciais |
| Sincronizacao bidirecional | Produtos, clientes, pedidos, NF-e |
| Erros em tempo real | Vendedor ve problemas imediatamente |
| Auditoria completa | Rastreabilidade de operacoes |
| Padrao GSA Tibiri | Desenvolvimento do Bridge facilitado |

