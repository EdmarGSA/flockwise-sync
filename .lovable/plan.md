
# Plano: Swagger UI Interativo para API sync-erp

## Resumo

Criar uma Edge Function dedicada (`sync-erp-docs`) que serve documentacao OpenAPI 3.0 interativa via Swagger UI, permitindo que desenvolvedores testem a API GSA Tibiri diretamente no navegador.

## Contexto Atual

### Situacao Existente

| Item | Status |
|------|--------|
| API sync-erp | 10 acoes implementadas e funcionais |
| Documentacao Markdown | docs/GSA-TIBIRI-PROTOCOL.md (completa) |
| Swagger UI | Nao implementado |

### Problema

Desenvolvedores precisam implementar integracoes ERP sem uma interface interativa para testar as chamadas. Atualmente dependem apenas de documentacao estatica e ferramentas externas como Postman.

## Arquitetura Proposta

```text
+-------------------+         +----------------------+
|   Navegador       |         |   sync-erp-docs      |
|                   |         |   (Edge Function)    |
+-------------------+         +----------------------+
        |                              |
        |  GET /sync-erp-docs          |
        |----------------------------->|
        |                              |
        |  HTML + Swagger UI           |
        |<-----------------------------|
        |                              |
        |  Teste via UI                |
        |  POST /sync-erp              |
        |----------------------------->|
```

## Etapas de Implementacao

### 1. Criar Edge Function sync-erp-docs

Nova funcao que serve:
- Rota `/` (GET): Swagger UI HTML
- Rota `/openapi.json` (GET): Especificacao OpenAPI 3.0

| Arquivo | Descricao |
|---------|-----------|
| supabase/functions/sync-erp-docs/index.ts | Edge function com HTML inline |

### 2. Especificacao OpenAPI 3.0

Documentar todas as 10 acoes com schemas detalhados:

| Acao | Metodo | Descricao |
|------|--------|-----------|
| sync_produtos | POST | Sincroniza catalogo de produtos |
| sync_clientes | POST | Sincroniza cadastro de clientes |
| sync_credito | POST | Atualiza limite/saldo de credito |
| sync_vendedores | POST | Sincroniza equipe de vendedores |
| sync_formas_pagamento | POST | Sincroniza formas e prazos |
| buscar_pedidos | POST | Lista pedidos para importacao |
| confirmar_pedido_erp | POST | Confirma importacao do pedido |
| atualizar_status | POST | Atualiza status do pedido |
| confirmar_nfe | POST | Registra NF-e emitida |
| registrar_erro_pedido | POST | Registra erro no pedido |

### 3. Configurar Acesso Publico

Adicionar no config.toml:

```toml
[functions.sync-erp-docs]
verify_jwt = false
```

## Detalhes Tecnicos

### Estrutura da Edge Function

```typescript
// supabase/functions/sync-erp-docs/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// OpenAPI 3.0 Specification
const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "GSA Tibiri - API de Integracao ERP",
    version: "1.0.0",
    description: "API bidirecional para integracao entre sistemas ERP locais e o Portal do Fornecedor."
  },
  servers: [
    { url: "https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1" }
  ],
  paths: {
    "/sync-erp": {
      post: {
        summary: "Executar acao de sincronizacao",
        // ... schemas completos
      }
    }
  },
  components: {
    securitySchemes: {
      apiKey: {
        type: "apiKey",
        in: "header",
        name: "X-API-Key"
      }
    },
    schemas: {
      // ... schemas de request/response
    }
  }
};

// Swagger UI HTML
const swaggerHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>GSA Tibiri - Documentacao API</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: './openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        layout: 'StandaloneLayout',
      });
    };
  </script>
</body>
</html>
`;

serve(async (req) => {
  const url = new URL(req.url);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Rota: /openapi.json
  if (url.pathname.endsWith('/openapi.json')) {
    return new Response(JSON.stringify(openApiSpec), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  // Rota padrao: Swagger UI
  return new Response(swaggerHtml, {
    headers: { ...corsHeaders, 'Content-Type': 'text/html' }
  });
});
```

### Schemas OpenAPI Detalhados

Cada acao tera:
- Descricao clara
- Exemplos de request/response
- Schemas de validacao
- Codigos de erro documentados

### Acesso

```text
URL Swagger UI: https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/sync-erp-docs
URL OpenAPI JSON: https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1/sync-erp-docs/openapi.json
```

## Arquivos a Criar/Modificar

| Arquivo | Operacao |
|---------|----------|
| supabase/functions/sync-erp-docs/index.ts | CRIAR |
| supabase/config.toml | MODIFICAR (adicionar config) |

## Beneficios

| Beneficio | Descricao |
|-----------|-----------|
| Exploracao interativa | Desenvolvedores podem testar endpoints diretamente |
| Documentacao viva | Sempre sincronizada com a implementacao real |
| Try it out | Botao para executar chamadas reais com API Key |
| Acesso publico | Sem necessidade de autenticacao para visualizar |
| Self-service | Desenvolvedores externos podem integrar sem suporte |

## Consideracoes de Seguranca

| Aspecto | Abordagem |
|---------|-----------|
| Documentacao | Acessivel publicamente (apenas leitura) |
| Testes reais | Requerem API Key valida no header |
| CORS | Habilitado para permitir uso em qualquer origem |

## Proximos Passos Opcionais

| Melhoria | Descricao |
|----------|-----------|
| Temas personalizados | CSS customizado com cores do Portal |
| Webhooks docs | Documentar eventos de notificacao |
| SDK Generator | Botao para baixar SDK em Python/Delphi |
