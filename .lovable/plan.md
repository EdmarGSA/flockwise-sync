

# Plano: Reorganizar Swagger UI com Endpoints Separados por Ação

## Problema Atual

A especificação OpenAPI atual define apenas **um endpoint único**:
```
POST /sync-erp (com campo "acao" no body)
```

O Swagger UI mostra isso como um único card, diferente da imagem de referência que mostra endpoints separados e agrupados por tags.

## Formato Desejado (como na imagem)

```text
+------------------------------------------+
| Sincronização (ERP → Cloud)              |
+------------------------------------------+
| POST /sync-erp/produtos   Sync produtos  |
| POST /sync-erp/clientes   Sync clientes  |
| POST /sync-erp/credito    Sync crédito   |
| POST /sync-erp/vendedores Sync vendedores|
| POST /sync-erp/formas     Formas pgto    |
+------------------------------------------+
| Pedidos (Cloud → ERP)                    |
+------------------------------------------+
| POST /sync-erp/pedidos         Buscar    |
| POST /sync-erp/confirmar       Confirmar |
| POST /sync-erp/status          Status    |
| POST /sync-erp/nfe             NF-e      |
| POST /sync-erp/erro            Erro      |
+------------------------------------------+
```

## Solução

Reestruturar a especificação OpenAPI para definir **paths separados** para cada ação, agrupados por **tags**.

## Alterações Necessárias

### Arquivo: supabase/functions/sync-erp-docs/index.ts

**1. Expandir a seção de tags:**
```typescript
tags: [
  { 
    name: "Sincronização", 
    description: "Ações de push do ERP para o Cloud (Produtos, Clientes, Crédito, etc)" 
  },
  { 
    name: "Pedidos", 
    description: "Ações de gestão de pedidos (Buscar, Confirmar, Status, NF-e)" 
  }
]
```

**2. Criar paths separados para cada ação:**

Transformar o único path:
```typescript
paths: {
  "/sync-erp": { post: { ... oneOf schemas ... } }
}
```

Em múltiplos paths virtuais (documentação):
```typescript
paths: {
  "/sync-erp#sync_produtos": {
    post: {
      summary: "Sincronizar Produtos",
      tags: ["Sincronização"],
      operationId: "syncProdutos",
      description: "Envia catálogo de produtos do ERP para o Cloud",
      requestBody: { schema: SyncProdutosRequest },
      responses: { ... }
    }
  },
  "/sync-erp#sync_clientes": {
    post: {
      summary: "Sincronizar Clientes", 
      tags: ["Sincronização"],
      ...
    }
  },
  "/sync-erp#buscar_pedidos": {
    post: {
      summary: "Buscar Pedidos Pendentes",
      tags: ["Pedidos"],
      ...
    }
  }
  // ... demais endpoints
}
```

## Nova Estrutura de Tags

| Tag | Endpoints | Descrição |
|-----|-----------|-----------|
| **Sincronização** | sync_produtos, sync_clientes, sync_credito, sync_vendedores, sync_formas_pagamento | Push do ERP para Cloud |
| **Pedidos** | buscar_pedidos, confirmar_pedido_erp, atualizar_status, confirmar_nfe, registrar_erro_pedido | Gestão de pedidos |

## Considerações Técnicas

A API real continua funcionando com o endpoint único `POST /sync-erp` e o campo `acao` no body. A documentação Swagger apenas **organiza visualmente** as ações como se fossem endpoints separados usando path fragments (`#acao`).

Isso é uma prática comum em APIs que usam "action-based routing" - a documentação mostra cada ação como um endpoint separado para melhor usabilidade, mesmo que internamente seja um único endpoint.

## Resultado Esperado

O Swagger UI exibirá:
- Seções colapsáveis por tag (Sincronização, Pedidos)
- Cada ação como um card separado com método POST
- Request/response schemas específicos por ação
- Botão "Try it out" funcional para cada ação

## Arquivos a Modificar

| Arquivo | Operação |
|---------|----------|
| supabase/functions/sync-erp-docs/index.ts | MODIFICAR |

