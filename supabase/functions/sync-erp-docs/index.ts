 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
 };
 
 const openApiSpec = {
   openapi: "3.0.3",
   info: {
     title: "GSA Tibiri - API de Integração ERP",
     version: "1.0.0",
     description: `API bidirecional para integração entre sistemas ERP locais e o Portal do Fornecedor.
 
 ## Autenticação
 
 Todas as requisições devem incluir o header \`X-API-Key\` com uma chave válida gerada no Portal do Fornecedor.
 
 ## Fluxo de Sincronização
 
 ### ERP → Cloud (Push)
 - \`sync_produtos\`: Enviar catálogo de produtos
 - \`sync_clientes\`: Enviar cadastro de clientes
 - \`sync_credito\`: Atualizar limites de crédito
 - \`sync_vendedores\`: Enviar equipe de vendedores
 - \`sync_formas_pagamento\`: Enviar formas e prazos
 
 ### Cloud → ERP (Pull)
 - \`buscar_pedidos\`: Listar pedidos pendentes
 - \`confirmar_pedido_erp\`: Marcar como exportado
 - \`atualizar_status\`: Atualizar status do pedido
 - \`confirmar_nfe\`: Registrar NF-e emitida
 - \`registrar_erro_pedido\`: Informar erro no pedido`,
     contact: {
       name: "Suporte GSA",
       email: "suporte@gsa.com.br"
     }
   },
   servers: [
     { 
       url: "https://zqpjxtlfhxjtenhhzaax.supabase.co/functions/v1",
       description: "Produção"
     }
   ],
   tags: [
     { name: "Sincronização", description: "Ações de push do ERP para o Cloud" },
     { name: "Pedidos", description: "Ações de gestão de pedidos" }
   ],
   paths: {
     "/sync-erp": {
       post: {
         summary: "Executar ação de sincronização",
         description: "Endpoint único para todas as ações de integração. O campo `acao` determina qual operação será executada.",
         operationId: "syncErp",
         tags: ["Sincronização", "Pedidos"],
         security: [{ apiKey: [] }],
         requestBody: {
           required: true,
           content: {
             "application/json": {
               schema: {
                 oneOf: [
                   { $ref: "#/components/schemas/SyncProdutosRequest" },
                   { $ref: "#/components/schemas/SyncClientesRequest" },
                   { $ref: "#/components/schemas/SyncCreditoRequest" },
                   { $ref: "#/components/schemas/SyncVendedoresRequest" },
                   { $ref: "#/components/schemas/SyncFormasPagamentoRequest" },
                   { $ref: "#/components/schemas/BuscarPedidosRequest" },
                   { $ref: "#/components/schemas/ConfirmarPedidoErpRequest" },
                   { $ref: "#/components/schemas/AtualizarStatusRequest" },
                   { $ref: "#/components/schemas/ConfirmarNfeRequest" },
                   { $ref: "#/components/schemas/RegistrarErroPedidoRequest" }
                 ]
               },
               examples: {
                 sync_produtos: {
                   summary: "Sincronizar Produtos",
                   value: {
                     acao: "sync_produtos",
                     produtos: [
                       {
                         codigo_erp: "PROD001",
                         nome: "Ração Inicial Premium",
                         categoria: "Rações",
                         unidade_medida: "kg",
                         preco: 125.90,
                         estoque_disponivel: 5000,
                         ativo: true,
                         descricao: "Ração para frangos de 1-21 dias"
                       }
                     ]
                   }
                 },
                 sync_clientes: {
                   summary: "Sincronizar Clientes",
                   value: {
                     acao: "sync_clientes",
                     clientes: [
                       {
                         codigo_erp: "CLI001",
                         razao_social_nome: "Granja São João LTDA",
                         cpf_cnpj: "12.345.678/0001-90",
                         tipo_pessoa: "juridica",
                         email: "contato@granjasaojoao.com.br",
                         telefone: "(11) 99999-9999",
                         limite_credito: 50000,
                         saldo_credito: 35000,
                         vendedor_codigo_erp: "VEND001",
                         ativo: true
                       }
                     ]
                   }
                 },
                 sync_credito: {
                   summary: "Atualizar Crédito",
                   value: {
                     acao: "sync_credito",
                     creditos: [
                       {
                         cliente_codigo_erp: "CLI001",
                         limite_credito: 60000,
                         saldo_credito: 45000
                       }
                     ]
                   }
                 },
                 sync_vendedores: {
                   summary: "Sincronizar Vendedores",
                   value: {
                     acao: "sync_vendedores",
                     vendedores: [
                       {
                         codigo_vendedor: "VEND001",
                         nome: "João Silva",
                         email: "joao@empresa.com.br",
                         telefone: "(11) 98888-8888",
                         ativo: true
                       }
                     ]
                   }
                 },
                 sync_formas_pagamento: {
                   summary: "Sincronizar Formas de Pagamento",
                   value: {
                     acao: "sync_formas_pagamento",
                     formas: [
                       {
                         codigo_erp: "BOL",
                         nome: "Boleto Bancário",
                         ativo: true,
                         prazos: [
                           { codigo_erp: "BOL-30", nome: "30 dias", dias: 30, ativo: true },
                           { codigo_erp: "BOL-60", nome: "30/60 dias", dias: 60, ativo: true }
                         ]
                       }
                     ]
                   }
                 },
                 buscar_pedidos: {
                   summary: "Buscar Pedidos Pendentes",
                   value: {
                     acao: "buscar_pedidos",
                     status: "pendente",
                     limite: 50
                   }
                 },
                 confirmar_pedido_erp: {
                   summary: "Confirmar Importação do Pedido",
                   value: {
                     acao: "confirmar_pedido_erp",
                     pedido_id: "uuid-do-pedido",
                     numero_pedido_erp: "PED-2024-001234"
                   }
                 },
                 atualizar_status: {
                   summary: "Atualizar Status do Pedido",
                   value: {
                     acao: "atualizar_status",
                     pedido_id: "uuid-do-pedido",
                     status: "aprovado",
                     observacao: "Pedido aprovado pelo financeiro"
                   }
                 },
                 confirmar_nfe: {
                   summary: "Confirmar NF-e Emitida",
                   value: {
                     acao: "confirmar_nfe",
                     pedido_id: "uuid-do-pedido",
                     numero_nfe: "000123456",
                     serie_nfe: "1",
                     chave_nfe: "35240112345678000190550010001234561234567890",
                     data_emissao: "2024-01-15T10:30:00Z",
                     valor_total: 12500.00
                   }
                 },
                 registrar_erro_pedido: {
                   summary: "Registrar Erro no Pedido",
                   value: {
                     acao: "registrar_erro_pedido",
                     pedido_id: "uuid-do-pedido",
                     mensagem_erro: "Cliente com cadastro bloqueado no sistema",
                     codigo_erro: "CLI_BLOQ_001"
                   }
                 }
               }
             }
           }
         },
         responses: {
           "200": {
             description: "Operação realizada com sucesso",
             content: {
               "application/json": {
                 schema: {
                   oneOf: [
                     { $ref: "#/components/schemas/SyncResponse" },
                     { $ref: "#/components/schemas/BuscarPedidosResponse" },
                     { $ref: "#/components/schemas/SuccessResponse" }
                   ]
                 },
                 examples: {
                   sync_success: {
                     summary: "Sincronização bem-sucedida",
                     value: {
                       success: true,
                       message: "Sincronização concluída",
                       processados: 10,
                       erros: 0,
                       detalhes: []
                     }
                   },
                   pedidos_encontrados: {
                     summary: "Pedidos encontrados",
                     value: {
                       success: true,
                       pedidos: [
                         {
                           id: "uuid-do-pedido",
                           numero_pedido: "PED-001",
                           status: "pendente",
                           created_at: "2024-01-15T10:00:00Z",
                           cliente: {
                             codigo_erp: "CLI001",
                             razao_social_nome: "Granja São João",
                             cpf_cnpj: "12.345.678/0001-90"
                           },
                           vendedor: {
                             codigo_vendedor: "VEND001",
                             nome: "João Silva"
                           },
                           itens: [
                             {
                               produto_codigo_erp: "PROD001",
                               produto_nome: "Ração Premium",
                               quantidade: 100,
                               preco_unitario: 125.90,
                               subtotal: 12590.00
                             }
                           ],
                           forma_pagamento: {
                             codigo_erp: "BOL",
                             nome: "Boleto"
                           },
                           prazo_pagamento: {
                             codigo_erp: "BOL-30",
                             nome: "30 dias"
                           },
                           valor_total: 12590.00,
                           observacoes: "Entregar pela manhã"
                         }
                       ],
                       total: 1
                     }
                   }
                 }
               }
             }
           },
           "400": {
             description: "Requisição inválida",
             content: {
               "application/json": {
                 schema: { $ref: "#/components/schemas/ErrorResponse" },
                 example: {
                   success: false,
                   error: "Ação inválida ou não especificada"
                 }
               }
             }
           },
           "401": {
             description: "Não autorizado - API Key inválida ou ausente",
             content: {
               "application/json": {
                 schema: { $ref: "#/components/schemas/ErrorResponse" },
                 example: {
                   success: false,
                   error: "API Key inválida ou não fornecida"
                 }
               }
             }
           },
           "500": {
             description: "Erro interno do servidor",
             content: {
               "application/json": {
                 schema: { $ref: "#/components/schemas/ErrorResponse" },
                 example: {
                   success: false,
                   error: "Erro interno ao processar requisição"
                 }
               }
             }
           }
         }
       }
     }
   },
   components: {
     securitySchemes: {
       apiKey: {
         type: "apiKey",
         in: "header",
         name: "X-API-Key",
         description: "Chave de API gerada no Portal do Fornecedor"
       }
     },
     schemas: {
       // Request Schemas
       SyncProdutosRequest: {
         type: "object",
         required: ["acao", "produtos"],
         properties: {
           acao: { type: "string", enum: ["sync_produtos"], description: "Ação a ser executada" },
           produtos: {
             type: "array",
             items: { $ref: "#/components/schemas/Produto" },
             description: "Lista de produtos para sincronizar"
           }
         }
       },
       SyncClientesRequest: {
         type: "object",
         required: ["acao", "clientes"],
         properties: {
           acao: { type: "string", enum: ["sync_clientes"], description: "Ação a ser executada" },
           clientes: {
             type: "array",
             items: { $ref: "#/components/schemas/Cliente" },
             description: "Lista de clientes para sincronizar"
           }
         }
       },
       SyncCreditoRequest: {
         type: "object",
         required: ["acao", "creditos"],
         properties: {
           acao: { type: "string", enum: ["sync_credito"], description: "Ação a ser executada" },
           creditos: {
             type: "array",
             items: { $ref: "#/components/schemas/Credito" },
             description: "Lista de atualizações de crédito"
           }
         }
       },
       SyncVendedoresRequest: {
         type: "object",
         required: ["acao", "vendedores"],
         properties: {
           acao: { type: "string", enum: ["sync_vendedores"], description: "Ação a ser executada" },
           vendedores: {
             type: "array",
             items: { $ref: "#/components/schemas/Vendedor" },
             description: "Lista de vendedores para sincronizar"
           }
         }
       },
       SyncFormasPagamentoRequest: {
         type: "object",
         required: ["acao", "formas"],
         properties: {
           acao: { type: "string", enum: ["sync_formas_pagamento"], description: "Ação a ser executada" },
           formas: {
             type: "array",
             items: { $ref: "#/components/schemas/FormaPagamento" },
             description: "Lista de formas de pagamento com prazos"
           }
         }
       },
       BuscarPedidosRequest: {
         type: "object",
         required: ["acao"],
         properties: {
           acao: { type: "string", enum: ["buscar_pedidos"], description: "Ação a ser executada" },
           status: { 
             type: "string", 
             enum: ["pendente", "exportado", "aprovado", "separado", "faturado", "entregue", "cancelado", "erro"],
             default: "pendente",
             description: "Status dos pedidos a buscar"
           },
           limite: { type: "integer", default: 50, description: "Número máximo de pedidos a retornar" }
         }
       },
       ConfirmarPedidoErpRequest: {
         type: "object",
         required: ["acao", "pedido_id", "numero_pedido_erp"],
         properties: {
           acao: { type: "string", enum: ["confirmar_pedido_erp"], description: "Ação a ser executada" },
           pedido_id: { type: "string", format: "uuid", description: "ID do pedido no Cloud" },
           numero_pedido_erp: { type: "string", description: "Número do pedido gerado no ERP" }
         }
       },
       AtualizarStatusRequest: {
         type: "object",
         required: ["acao", "pedido_id", "status"],
         properties: {
           acao: { type: "string", enum: ["atualizar_status"], description: "Ação a ser executada" },
           pedido_id: { type: "string", format: "uuid", description: "ID do pedido no Cloud" },
           status: { 
             type: "string", 
             enum: ["aprovado", "separado", "faturado", "entregue", "cancelado"],
             description: "Novo status do pedido"
           },
           observacao: { type: "string", description: "Observação sobre a mudança de status" }
         }
       },
       ConfirmarNfeRequest: {
         type: "object",
         required: ["acao", "pedido_id", "numero_nfe", "chave_nfe"],
         properties: {
           acao: { type: "string", enum: ["confirmar_nfe"], description: "Ação a ser executada" },
           pedido_id: { type: "string", format: "uuid", description: "ID do pedido no Cloud" },
           numero_nfe: { type: "string", description: "Número da NF-e" },
           serie_nfe: { type: "string", description: "Série da NF-e" },
           chave_nfe: { type: "string", minLength: 44, maxLength: 44, description: "Chave de acesso da NF-e (44 dígitos)" },
           data_emissao: { type: "string", format: "date-time", description: "Data/hora de emissão" },
           valor_total: { type: "number", description: "Valor total da NF-e" }
         }
       },
       RegistrarErroPedidoRequest: {
         type: "object",
         required: ["acao", "pedido_id", "mensagem_erro"],
         properties: {
           acao: { type: "string", enum: ["registrar_erro_pedido"], description: "Ação a ser executada" },
           pedido_id: { type: "string", format: "uuid", description: "ID do pedido no Cloud" },
           mensagem_erro: { type: "string", description: "Descrição do erro ocorrido" },
           codigo_erro: { type: "string", description: "Código interno do erro no ERP" }
         }
       },
       // Entity Schemas
       Produto: {
         type: "object",
         required: ["codigo_erp", "nome"],
         properties: {
           codigo_erp: { type: "string", description: "Código único do produto no ERP" },
           nome: { type: "string", description: "Nome do produto" },
           categoria: { type: "string", description: "Categoria do produto" },
           unidade_medida: { type: "string", description: "Unidade de medida (kg, un, cx, etc)" },
           preco: { type: "number", description: "Preço unitário" },
           estoque_disponivel: { type: "number", description: "Quantidade disponível em estoque" },
           ativo: { type: "boolean", default: true, description: "Se o produto está ativo" },
           descricao: { type: "string", description: "Descrição detalhada" },
           peso_kg: { type: "number", description: "Peso em kg (para cálculo de frete)" },
           ncm: { type: "string", description: "Código NCM" }
         }
       },
       Cliente: {
         type: "object",
         required: ["codigo_erp", "razao_social_nome", "cpf_cnpj"],
         properties: {
           codigo_erp: { type: "string", description: "Código único do cliente no ERP" },
           razao_social_nome: { type: "string", description: "Razão social ou nome" },
           nome_fantasia: { type: "string", description: "Nome fantasia" },
           cpf_cnpj: { type: "string", description: "CPF ou CNPJ" },
           tipo_pessoa: { type: "string", enum: ["fisica", "juridica"], default: "juridica" },
           inscricao_estadual: { type: "string", description: "Inscrição estadual" },
           email: { type: "string", format: "email" },
           telefone: { type: "string" },
           celular: { type: "string" },
           logradouro: { type: "string" },
           numero: { type: "string" },
           complemento: { type: "string" },
           bairro: { type: "string" },
           cidade: { type: "string" },
           estado: { type: "string", minLength: 2, maxLength: 2 },
           cep: { type: "string" },
           codigo_ibge: { type: "string", description: "Código IBGE do município" },
           limite_credito: { type: "number", description: "Limite de crédito total" },
           saldo_credito: { type: "number", description: "Saldo disponível" },
           vendedor_codigo_erp: { type: "string", description: "Código do vendedor responsável" },
           ativo: { type: "boolean", default: true }
         }
       },
       Credito: {
         type: "object",
         required: ["cliente_codigo_erp"],
         properties: {
           cliente_codigo_erp: { type: "string", description: "Código do cliente no ERP" },
           limite_credito: { type: "number", description: "Novo limite de crédito" },
           saldo_credito: { type: "number", description: "Novo saldo disponível" }
         }
       },
       Vendedor: {
         type: "object",
         required: ["codigo_vendedor", "nome"],
         properties: {
           codigo_vendedor: { type: "string", description: "Código único do vendedor no ERP" },
           nome: { type: "string", description: "Nome completo" },
           email: { type: "string", format: "email" },
           telefone: { type: "string" },
           ativo: { type: "boolean", default: true }
         }
       },
       FormaPagamento: {
         type: "object",
         required: ["codigo_erp", "nome"],
         properties: {
           codigo_erp: { type: "string", description: "Código da forma de pagamento no ERP" },
           nome: { type: "string", description: "Nome da forma de pagamento" },
           ativo: { type: "boolean", default: true },
           prazos: {
             type: "array",
             items: { $ref: "#/components/schemas/PrazoPagamento" },
             description: "Prazos disponíveis para esta forma"
           }
         }
       },
       PrazoPagamento: {
         type: "object",
         required: ["codigo_erp", "nome", "dias"],
         properties: {
           codigo_erp: { type: "string", description: "Código do prazo no ERP" },
           nome: { type: "string", description: "Descrição do prazo" },
           dias: { type: "integer", description: "Quantidade de dias" },
           ativo: { type: "boolean", default: true }
         }
       },
       // Response Schemas
       SyncResponse: {
         type: "object",
         properties: {
           success: { type: "boolean" },
           message: { type: "string" },
           processados: { type: "integer", description: "Quantidade de registros processados" },
           erros: { type: "integer", description: "Quantidade de erros" },
           detalhes: { 
             type: "array", 
             items: { type: "object" },
             description: "Detalhes de erros, se houver"
           }
         }
       },
       BuscarPedidosResponse: {
         type: "object",
         properties: {
           success: { type: "boolean" },
           pedidos: { type: "array", items: { $ref: "#/components/schemas/PedidoCompleto" } },
           total: { type: "integer" }
         }
       },
       PedidoCompleto: {
         type: "object",
         properties: {
           id: { type: "string", format: "uuid" },
           numero_pedido: { type: "string" },
           status: { type: "string" },
           created_at: { type: "string", format: "date-time" },
           cliente: { $ref: "#/components/schemas/ClienteResumido" },
           vendedor: { $ref: "#/components/schemas/VendedorResumido" },
           itens: { type: "array", items: { $ref: "#/components/schemas/ItemPedido" } },
           forma_pagamento: { type: "object" },
           prazo_pagamento: { type: "object" },
           valor_total: { type: "number" },
           observacoes: { type: "string" }
         }
       },
       ClienteResumido: {
         type: "object",
         properties: {
           codigo_erp: { type: "string" },
           razao_social_nome: { type: "string" },
           cpf_cnpj: { type: "string" }
         }
       },
       VendedorResumido: {
         type: "object",
         properties: {
           codigo_vendedor: { type: "string" },
           nome: { type: "string" }
         }
       },
       ItemPedido: {
         type: "object",
         properties: {
           produto_codigo_erp: { type: "string" },
           produto_nome: { type: "string" },
           quantidade: { type: "number" },
           preco_unitario: { type: "number" },
           subtotal: { type: "number" }
         }
       },
       SuccessResponse: {
         type: "object",
         properties: {
           success: { type: "boolean" },
           message: { type: "string" }
         }
       },
       ErrorResponse: {
         type: "object",
         properties: {
           success: { type: "boolean", example: false },
           error: { type: "string" }
         }
       }
     }
   }
 };
 
 const swaggerHtml = `<!DOCTYPE html>
 <html lang="pt-BR">
 <head>
   <meta charset="UTF-8">
   <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <title>GSA Tibiri - Documentação API</title>
   <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
   <style>
     body { margin: 0; padding: 0; }
     .swagger-ui .topbar { display: none; }
     .swagger-ui .info .title { font-size: 2rem; }
     .swagger-ui .info { margin: 20px 0; }
     .header-bar {
       background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
       color: white;
       padding: 16px 24px;
       display: flex;
       align-items: center;
       gap: 16px;
     }
     .header-bar h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }
     .header-bar .badge { 
       background: #22c55e; 
       padding: 4px 12px; 
       border-radius: 12px; 
       font-size: 0.75rem; 
       font-weight: 500;
     }
   </style>
 </head>
 <body>
   <div class="header-bar">
     <h1>🔗 GSA Tibiri</h1>
     <span class="badge">API v1.0</span>
   </div>
   <div id="swagger-ui"></div>
   <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
   <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
   <script>
     window.onload = function() {
       SwaggerUIBundle({
         url: './openapi.json',
         dom_id: '#swagger-ui',
         presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
         layout: 'StandaloneLayout',
         deepLinking: true,
         persistAuthorization: true,
         displayRequestDuration: true,
         filter: true,
         showExtensions: true,
         showCommonExtensions: true,
         defaultModelsExpandDepth: 2,
         defaultModelExpandDepth: 2,
         docExpansion: 'list'
       });
     };
   </script>
 </body>
 </html>`;
 
 serve(async (req) => {
   const url = new URL(req.url);
   
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
   
   // Rota: /openapi.json
   if (url.pathname.endsWith('/openapi.json')) {
     return new Response(JSON.stringify(openApiSpec, null, 2), {
       headers: { ...corsHeaders, 'Content-Type': 'application/json' }
     });
   }
   
   // Rota padrão: Swagger UI
   return new Response(swaggerHtml, {
     headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
   });
 });