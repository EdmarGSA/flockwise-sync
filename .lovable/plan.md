
# Plano Corrigido: App de Vendas E-commerce para Vendedores do Fornecedor

## Problema Identificado no Plano Anterior

O plano original fazia referência incorreta a produtos do sistema interno ("Ração Inicial", etc.). O correto é usar as tabelas exclusivas do Portal do Fornecedor:

| Tabela Correta | Uso |
|----------------|-----|
| `produtos_catalogo_fornecedor` | Produtos do catálogo próprio do fornecedor |
| `clientes_fornecedor` | Clientes virtuais do fornecedor |
| `vendedores_fornecedor` | Vendedores/representantes do fornecedor |
| `promocoes_fornecedor` | Promoções dos produtos do catálogo |

## Problema de Schema Atual

A tabela `pedidos_fornecedor` existente referencia `parceiros` (sistema interno) e `produtos` (também interno). 

Para o App de Vendas do Portal do Fornecedor, precisamos de tabelas que referenciem as entidades corretas:

```text
TABELAS DO PORTAL DO FORNECEDOR (Independentes)
================================================

produtos_catalogo_fornecedor ←──┐
                                │
clientes_fornecedor ←───────────┼── pedidos_catalogo_fornecedor (NOVA)
                                │
vendedores_fornecedor ←─────────┘
                                │
promocoes_fornecedor ───────────┘
```

---

## Fase 1: Criar Nova Estrutura de Pedidos do Catálogo

### 1.1 Nova tabela: `pedidos_catalogo_fornecedor`

```sql
CREATE TABLE public.pedidos_catalogo_fornecedor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fornecedor_global_id UUID NOT NULL REFERENCES fornecedores_globais(id),
  cliente_fornecedor_id UUID NOT NULL REFERENCES clientes_fornecedor(id),
  vendedor_fornecedor_id UUID REFERENCES vendedores_fornecedor(id),
  
  numero_pedido TEXT NOT NULL,
  data_pedido TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Valores
  valor_bruto NUMERIC DEFAULT 0,
  desconto_percentual NUMERIC DEFAULT 0,
  valor_desconto NUMERIC DEFAULT 0,
  valor_total NUMERIC DEFAULT 0,
  
  -- Pagamento e entrega
  condicao_pagamento TEXT,
  data_entrega_prevista DATE,
  data_entrega_real DATE,
  
  -- Status: rascunho → pendente → aprovado → separado → faturado → entregue → cancelado
  status TEXT DEFAULT 'rascunho',
  
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS: Fornecedor ve apenas seus pedidos
CREATE POLICY "Fornecedor acessa seus pedidos"
ON pedidos_catalogo_fornecedor FOR ALL
USING (
  fornecedor_global_id = (
    SELECT fornecedor_global_id FROM profiles WHERE id = auth.uid()
  )
);
```

### 1.2 Nova tabela: `pedidos_catalogo_fornecedor_itens`

```sql
CREATE TABLE public.pedidos_catalogo_fornecedor_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos_catalogo_fornecedor(id) ON DELETE CASCADE,
  produto_catalogo_id UUID NOT NULL REFERENCES produtos_catalogo_fornecedor(id),
  
  quantidade NUMERIC NOT NULL,
  preco_unitario NUMERIC NOT NULL,
  desconto_item NUMERIC DEFAULT 0,
  valor_total NUMERIC NOT NULL,
  
  promocao_id UUID REFERENCES promocoes_fornecedor(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS via pedido pai
CREATE POLICY "Acesso via pedido"
ON pedidos_catalogo_fornecedor_itens FOR ALL
USING (
  pedido_id IN (
    SELECT id FROM pedidos_catalogo_fornecedor 
    WHERE fornecedor_global_id = (
      SELECT fornecedor_global_id FROM profiles WHERE id = auth.uid()
    )
  )
);
```

---

## Fase 2: Arquitetura da Interface

### Layout do App de Vendas

```text
+------------------------------------------------------------------+
|  [Logo]  VENDAS                    [🔍 Busca]  [🛒 Carrinho (3)] |
+------------------------------------------------------------------+
|                                                                  |
|  SIDEBAR              AREA PRINCIPAL                             |
|  +--------------+    +----------------------------------------+  |
|  |              |    | CLIENTE: [Selecionar Cliente ▼]        |  |
|  | CATEGORIAS   |    | Limite: R$ 10.000 | Saldo: R$ 7.500    |  |
|  | ──────────── |    +----------------------------------------+  |
|  |              |    |                                        |  |
|  | > Todos (45) |    |  +--------+  +--------+  +--------+    |  |
|  |              |    |  | [FOTO] |  | [FOTO] |  | [FOTO] |    |  |
|  | Racoes       |    |  | Prod A |  | Prod B |  | Prod C |    |  |
|  |   Inicial    |    |  | R$ 185 |  | R$ 72  |  | R$ 320 |    |  |
|  |   Engorda    |    |  | [+ADD] |  | [+ADD] |  | [+ADD] |    |  |
|  |              |    |  +--------+  +--------+  +--------+    |  |
|  | Suplementos  |    |                                        |  |
|  |              |    |  +--------+  +--------+  +--------+    |  |
|  | Medicamentos |    |  | [FOTO] |  | [FOTO] |  | [FOTO] |    |  |
|  |              |    |  | Prod D |  | Prod E |  | Prod F |    |  |
|  +--------------+    +----------------------------------------+  |
|                                                                  |
+------------------------------------------------------------------+
```

### Drawer do Carrinho (lateral direita)

```text
+------------------------------------------+
|  CARRINHO                     [X Fechar] |
+------------------------------------------+
|                                          |
|  CLIENTE SELECIONADO:                    |
|  Fazenda Boa Vista                       |
|  ──────────────────────────────────────  |
|  Limite: R$ 10.000                       |
|  Saldo Disponivel: R$ 7.500              |
|  [✓] Credito suficiente                  |
|                                          |
+------------------------------------------+
|                                          |
|  [Img] Produto A                         |
|        R$ 185,00 x [10] = R$ 1.850,00    |
|        [Remover]                         |
|                                          |
|  [Img] Produto B                         |
|        R$ 72,50 x [20] = R$ 1.450,00     |
|        [Remover]                         |
|                                          |
+------------------------------------------+
|  Subtotal:              R$ 3.300,00      |
|  ──────────────────────────────────────  |
|  Desconto (5%):         - R$ 165,00      |
|  TOTAL:                 R$ 3.135,00      |
+------------------------------------------+
|                                          |
|  [Finalizar Pedido]                      |
|  [Limpar Carrinho]                       |
|                                          |
+------------------------------------------+
```

---

## Fase 3: Componentes a Criar

### Novos Arquivos

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `src/pages/AppVendasFornecedor.tsx` | Pagina principal do e-commerce |
| 2 | `src/pages/MeusPedidosFornecedor.tsx` | Lista de pedidos do vendedor |
| 3 | `src/components/fornecedor/vendas/CategoriasSidebar.tsx` | Filtro por categoria (extraido de `produtos_catalogo_fornecedor.categoria`) |
| 4 | `src/components/fornecedor/vendas/ProdutoVendaCard.tsx` | Card do produto com botao ADD |
| 5 | `src/components/fornecedor/vendas/CarrinhoDrawer.tsx` | Drawer lateral com carrinho |
| 6 | `src/components/fornecedor/vendas/FinalizarPedidoDialog.tsx` | Checkout final |
| 7 | `src/components/fornecedor/vendas/PedidoDetalheDialog.tsx` | Visualizacao do pedido com timeline |
| 8 | `src/hooks/useVendedorFornecedor.tsx` | Identifica vendedor logado via `vendedores_fornecedor.user_id` |
| 9 | `src/hooks/useCarrinhoVendas.tsx` | Context do carrinho com persistencia localStorage |
| 10 | `src/hooks/usePromocoesFornecedor.tsx` | Busca promocoes ativas |

### Arquivos a Modificar

| # | Arquivo | Modificacao |
|---|---------|-------------|
| 1 | `src/pages/PortalFornecedor.tsx` | Adicionar tab "Vendas" |
| 2 | `src/App.tsx` | Adicionar rotas `/app-vendas` e `/meus-pedidos-fornecedor` |
| 3 | `src/hooks/useFornecedorData.tsx` | Adicionar fetch de promocoes |

---

## Fase 4: Fluxos de Uso

### Vendedor Tirando Pedido

1. Acessa tab "Vendas" no Portal do Fornecedor
2. Seleciona cliente do dropdown (busca em `clientes_fornecedor`)
3. Sistema exibe limite e saldo de credito do cliente
4. Navega por categorias ou busca produto
5. Clica em "Adicionar" nos produtos do catalogo
6. Abre carrinho lateral
7. Ajusta quantidades
8. Sistema valida: `saldo_credito >= valor_total`
9. Clica em "Finalizar Pedido"
10. Pedido salvo em `pedidos_catalogo_fornecedor`
11. Saldo do cliente atualizado

### Acompanhamento de Pedidos

```text
TIMELINE DO PEDIDO
==================
[✓] Pedido criado - 15/01 10:30
    Vendedor: Joao Silva
    
[✓] Aprovado - 15/01 14:00
    
[✓] Separado - 16/01 09:00
    
[✓] Faturado - 16/01 10:00
    NF: 12345
    
[ ] Em transito
    
[ ] Entregue
```

---

## Fase 5: Validacoes de Negocio

### Credito do Cliente

```tsx
// Validar antes de finalizar
const validarCredito = (cliente: ClienteFornecedor, valorPedido: number) => {
  if (valorPedido > cliente.saldo_credito) {
    return {
      valido: false,
      mensagem: `Saldo insuficiente. Disponivel: R$ ${cliente.saldo_credito.toFixed(2)}`
    };
  }
  return { valido: true };
};
```

### Estoque do Produto

```tsx
// Verificar estoque ao adicionar
const validarEstoque = (produto: ProdutoCatalogo, quantidade: number) => {
  if (quantidade > produto.estoque_proprio) {
    return {
      valido: false,
      mensagem: `Estoque insuficiente. Disponivel: ${produto.estoque_proprio}`
    };
  }
  return { valido: true };
};
```

### Promocao Ativa

```tsx
// Aplicar preco promocional se houver
const getPrecoFinal = (produto: ProdutoCatalogo, promocoes: PromocaoFornecedor[]) => {
  const promo = promocoes.find(p => 
    p.produto_id === produto.id &&
    p.ativo &&
    new Date(p.data_inicio) <= new Date() &&
    new Date(p.data_fim) >= new Date()
  );
  
  if (promo?.preco_promocional) {
    return promo.preco_promocional;
  }
  if (promo?.percentual_desconto) {
    return produto.preco_tabela * (1 - promo.percentual_desconto / 100);
  }
  return produto.preco_tabela;
};
```

---

## Fase 6: Performance

| Tecnica | Beneficio |
|---------|-----------|
| Lazy loading de imagens | Usa `loading="lazy"` no `imagem_url` |
| Context do carrinho | Evita prop drilling |
| localStorage | Carrinho persiste entre sessoes |
| Debounce na busca | Evita queries excessivas |
| Categorias dinamicas | Extraidas de `DISTINCT categoria` |

---

## Resumo da Correcao

| Antes (Incorreto) | Depois (Correto) |
|-------------------|------------------|
| Referencia a tabela `produtos` | Usa `produtos_catalogo_fornecedor` |
| Referencia a `parceiros` | Usa `clientes_fornecedor` |
| Tabela `pedidos_fornecedor` | Nova tabela `pedidos_catalogo_fornecedor` |
| Sem vinculo com vendedor | Vincula via `vendedor_fornecedor_id` |

---

## Resultado Esperado

| Funcionalidade | Descricao |
|----------------|-----------|
| E-commerce visual | Grid de produtos com fotos do catalogo do fornecedor |
| Categorias laterais | Filtro dinamico por `categoria` |
| Carrinho intuitivo | Drawer lateral com validacao de credito |
| Promocoes | Precos promocionais em destaque |
| Meus Pedidos | Lista com timeline de status |
| Isolamento de dados | 100% separado do sistema interno |
