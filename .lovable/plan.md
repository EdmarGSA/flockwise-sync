

# Plano: Documentacao Swagger/OpenAPI para API sync-erp

## Objetivo

Criar uma interface interativa Swagger UI para documentar a API de integracao ERP (GSA Tibiri), permitindo que desenvolvedores testem endpoints diretamente pelo navegador.

## Arquitetura

```text
+------------------------------------------+
|          SWAGGER DOCUMENTATION           |
+------------------------------------------+
|                                          |
|  /sync-erp-docs                          |
|    |                                     |
|    +-- GET /           -> Swagger UI     |
|    +-- GET /openapi    -> OpenAPI JSON   |
|                                          |
+------------------------------------------+
|                                          |
|  /sync-erp  (API existente)              |
|    |                                     |
|    +-- POST /  -> Processar acoes        |
|                                          |
+------------------------------------------+
```

## Tecnologias

| Tecnologia | Uso |
|------------|-----|
| Hono | Framework HTTP para Edge Functions |
| @hono/swagger-ui | Renderizacao da interface Swagger |
| OpenAPI 3.0 | Especificacao da API |

## Implementacao

### Fase 1: Criar Edge Function sync-erp-docs

Nova edge function dedicada para servir a documentacao:

**Arquivo:** `supabase/functions/sync-erp-docs/index.ts`

```typescript
import { Hono } from "https://deno.land/x/hono@v4.0.0/mod.ts";
import { swaggerUI } from "npm:@hono/swagger-ui";

const app = new Hono();

// OpenAPI Specification completa
const openApiDoc = {
  openapi: "3.0.0",
  info: {
    title: "GSA Tibiri - API de Integracao ERP",
    version: "1.0.0",
    description: "API para sincronizacao bidirecional entre ERP local e Cloud",
    contact: { name: "Suporte GSA", email: "suporte@gsa.com" }
  },
  servers: [
    { url: "https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1" }
  ],
  // ... paths, schemas, security definitions
};

// Rota principal - Swagger UI
app.get("/", swaggerUI({ url: "/sync-erp-docs/openapi" }));

// Rota do OpenAPI JSON
app.get("/openapi", (c) => c.json(openApiDoc));

Deno.serve(app.fetch);
```

### Fase 2: Especificacao OpenAPI Completa

Documentar todas as 8 acoes da API:

| Acao | Metodo | Descricao |
|------|--------|-----------|
| sync_produtos | POST | Sincronizar catalogo de produtos |
| sync_clientes | POST | Sincronizar cadastro de clientes |
| sync_credito | POST | Atualizar limite/saldo de credito |
| buscar_pedidos | POST | Listar pedidos para importacao |
| confirmar_pedido_erp | POST | Confirmar importacao no ERP |
| atualizar_status | POST | Atualizar status do pedido |
| confirmar_nfe | POST | Registrar NF-e emitida |
| registrar_erro_pedido | POST | Registrar erro visivel ao vendedor |

**Schemas definidos:**
- ProdutoSync
- ClienteSync
- CreditoSync
- Pedido (com nested Cliente e Itens)
- ErroResponse
- SuccessResponse

**Seguranca:**
- apiKey via header X-API-Key

### Fase 3: Configuracao

Adicionar ao `supabase/config.toml`:

```toml
[functions.sync-erp-docs]
verify_jwt = false
```

## Resultado Final

**URL da Documentacao:**
```
https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/sync-erp-docs
```

**Funcionalidades:**
- Interface interativa para testar endpoints
- Schemas de request/response com exemplos
- Autenticacao via API Key integrada
- Visualizacao do fluxo de status dos pedidos
- Codigos de erro documentados

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `supabase/functions/sync-erp-docs/index.ts` | Edge Function com Swagger UI |

## Arquivos a Modificar

| Arquivo | Modificacao |
|---------|-------------|
| `supabase/config.toml` | Adicionar config da nova function |
| `docs/GSA-TIBIRI-PROTOCOL.md` | Adicionar link para Swagger UI |

## Beneficios

| Beneficio | Descricao |
|-----------|-----------|
| Documentacao viva | Sempre sincronizada com a API real |
| Testes interativos | Desenvolvedores testam direto no browser |
| Reducao de erros | Schemas validados automaticamente |
| Onboarding rapido | Novos integradores entendem a API em minutos |
| Exportacao | Possibilidade de exportar para Postman/Insomnia |

