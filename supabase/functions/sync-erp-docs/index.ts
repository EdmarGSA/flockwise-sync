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

## Endpoint Base

Todas as ações utilizam o mesmo endpoint: \`POST /sync-erp\`

O campo \`acao\` no body determina qual operação será executada.`,
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
    { 
      name: "Sincronização", 
      description: "Ações de push do ERP para o Cloud (Produtos, Clientes, Crédito, Vendedores, Formas de Pagamento)" 
    },
    { 
      name: "Pedidos", 
      description: "Ações de gestão de pedidos (Buscar, Confirmar, Atualizar Status, NF-e, Erros)" 
    }
  ],
  paths: {
    // ===================== SINCRONIZAÇÃO =====================
    "/sync-erp#sync_produtos": {
      post: {
        summary: "Sincronizar Produtos",
        description: "Envia catálogo de produtos do ERP para o Cloud. Produtos são identificados pelo `codigo_erp` - se existir atualiza, senão cria novo.",
        operationId: "syncProdutos",
        tags: ["Sincronização"],
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SyncProdutosRequest" },
              example: {
                acao: "sync_produtos",
                produtos: [
                  {
                    codigo_erp: "PROD001",
                    nome: "Ração Inicial Premium",
                    preco: 125.90,
                    estoque: 5000,
                    unidade: "kg",
                    ativo: true
                  }
                ]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Produtos sincronizados com sucesso",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SyncResponse" },
                example: {
                  success: true,
                  acao: "sync_produtos",
                  processados: 1,
                  erros: 0,
                  detalhes: []
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/sync-erp#sync_clientes": {
      post: {
        summary: "Sincronizar Clientes",
        description: "Envia cadastro de clientes do ERP para o Cloud. Vincula automaticamente ao vendedor se `vendedor_codigo_erp` for informado.",
        operationId: "syncClientes",
        tags: ["Sincronização"],
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SyncClientesRequest" },
              example: {
                acao: "sync_clientes",
                clientes: [
                  {
                    codigo_erp: "CLI001",
                    razao_social: "Granja São João LTDA",
                    cpf_cnpj: "12345678000190",
                    email: "contato@granjasaojoao.com.br",
                    telefone: "(11) 99999-9999",
                    limite_credito: 50000,
                    saldo_credito: 35000,
                    vendedor_codigo_erp: "VEND001"
                  }
                ]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Clientes sincronizados com sucesso",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SyncResponse" },
                example: {
                  success: true,
                  acao: "sync_clientes",
                  processados: 1,
                  erros: 0,
                  detalhes: []
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/sync-erp#sync_credito": {
      post: {
        summary: "Sincronizar Crédito",
        description: "Atualiza limite e saldo de crédito dos clientes.",
        operationId: "syncCredito",
        tags: ["Sincronização"],
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SyncCreditoRequest" },
              example: {
                acao: "sync_credito",
                clientes: [
                  {
                    codigo_erp: "CLI001",
                    limite_credito: 60000,
                    saldo_credito: 45000
                  }
                ]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Créditos atualizados com sucesso",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SyncResponse" },
                example: {
                  success: true,
                  updated: 1,
                  message: "1 clientes com crédito atualizado"
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/sync-erp#sync_vendedores": {
      post: {
        summary: "Sincronizar Vendedores",
        description: "Envia equipe de vendedores do ERP para o Cloud. O vínculo de login (`user_id`) é preservado durante atualizações.",
        operationId: "syncVendedores",
        tags: ["Sincronização"],
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SyncVendedoresRequest" },
              example: {
                acao: "sync_vendedores",
                vendedores: [
                  {
                    codigo_erp: "VEND001",
                    nome: "João Silva",
                    email: "joao@empresa.com.br",
                    telefone: "(11) 98888-8888",
                    regiao: "Sul",
                    ativo: true
                  }
                ]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Vendedores sincronizados com sucesso",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SyncResponse" },
                example: {
                  success: true,
                  acao: "sync_vendedores",
                  processados: 1,
                  erros: 0,
                  detalhes: []
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/sync-erp#sync_formas_pagamento": {
      post: {
        summary: "Sincronizar Formas de Pagamento",
        description: "Envia formas e prazos de pagamento do ERP. Prazos são vinculados às formas pelo `forma_codigo_erp`.",
        operationId: "syncFormasPagamento",
        tags: ["Sincronização"],
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SyncFormasPagamentoRequest" },
              example: {
                acao: "sync_formas_pagamento",
                formas: [
                  {
                    codigo_erp: "BOL",
                    nome: "Boleto Bancário",
                    ativo: true
                  }
                ],
                prazos: [
                  {
                    codigo_erp: "BOL-7-14-21",
                    nome: "Boleto 7/14/21 dias",
                    forma_codigo_erp: "BOL",
                    dias_parcelas: [7, 14, 21],
                    quantidade_parcelas: 3,
                    padrao: true,
                    ativo: true
                  }
                ]
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Formas de pagamento sincronizadas com sucesso",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SyncResponse" },
                example: {
                  success: true,
                  acao: "sync_formas_pagamento",
                  formas_processadas: 1,
                  prazos_processados: 1,
                  erros: 0,
                  detalhes: []
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    // ===================== PEDIDOS =====================
    "/sync-erp#buscar_pedidos": {
      post: {
        summary: "Buscar Pedidos",
        description: "Retorna lista de pedidos para importação no ERP. Filtre por status (padrão: `pendente`).",
        operationId: "buscarPedidos",
        tags: ["Pedidos"],
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BuscarPedidosRequest" },
              example: {
                acao: "buscar_pedidos",
                status: "pendente"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Lista de pedidos",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BuscarPedidosResponse" },
                example: {
                  success: true,
                  pedidos: [
                    {
                      id: "550e8400-e29b-41d4-a716-446655440000",
                      numero_pedido: "PED-2026-0001",
                      data_pedido: "2026-01-31T14:30:00Z",
                      cliente: {
                        codigo_erp: "CLI001",
                        razao_social: "Granja São João LTDA",
                        cpf_cnpj: "12345678000190"
                      },
                      valor_total: 15750.00,
                      itens: [
                        {
                          codigo_erp: "PROD001",
                          nome: "Ração Inicial Premium",
                          quantidade: 50,
                          preco_unitario: 185.50,
                          subtotal: 9275.00
                        }
                      ]
                    }
                  ]
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "400": { $ref: "#/components/responses/BadRequest" },
          "500": { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/sync-erp#confirmar_pedido_erp": {
      post: {
        summary: "Confirmar Pedido no ERP",
        description: "Marca o pedido como exportado/importado no ERP. Status muda de `pendente` para `exportado`.",
        operationId: "confirmarPedidoErp",
        tags: ["Pedidos"],
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ConfirmarPedidoErpRequest" },
              example: {
                acao: "confirmar_pedido_erp",
                pedido_id: "550e8400-e29b-41d4-a716-446655440000",
                codigo_erp: "PV-2026-00123"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Pedido confirmado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
                example: {
                  success: true,
                  message: "Pedido confirmado como exportado"
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/sync-erp#atualizar_status": {
      post: {
        summary: "Atualizar Status do Pedido",
        description: "Atualiza o status do pedido conforme progresso no ERP. Fluxo: `pendente → exportado → aprovado → separado → faturado → entregue`",
        operationId: "atualizarStatus",
        tags: ["Pedidos"],
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AtualizarStatusRequest" },
              example: {
                acao: "atualizar_status",
                pedido_id: "550e8400-e29b-41d4-a716-446655440000",
                novo_status: "aprovado"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Status atualizado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
                example: {
                  success: true,
                  message: "Status atualizado para aprovado"
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/sync-erp#confirmar_nfe": {
      post: {
        summary: "Confirmar NF-e",
        description: "Registra a emissão da Nota Fiscal Eletrônica. Status muda automaticamente para `faturado`.",
        operationId: "confirmarNfe",
        tags: ["Pedidos"],
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ConfirmarNfeRequest" },
              example: {
                acao: "confirmar_nfe",
                pedido_id: "550e8400-e29b-41d4-a716-446655440000",
                numero_nfe: "000123456",
                chave_nfe: "35260112345678000123550010001234561234567890",
                data_faturamento: "2026-01-31"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "NF-e registrada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
                example: {
                  success: true,
                  message: "NF-e registrada com sucesso"
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" }
        }
      }
    },
    "/sync-erp#registrar_erro_pedido": {
      post: {
        summary: "Registrar Erro no Pedido",
        description: "Registra um erro no processamento do pedido. **O vendedor verá esta mensagem imediatamente no PWA.**",
        operationId: "registrarErroPedido",
        tags: ["Pedidos"],
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegistrarErroPedidoRequest" },
              example: {
                acao: "registrar_erro_pedido",
                pedido_id: "550e8400-e29b-41d4-a716-446655440000",
                error_message: "Produto PROD001 sem estoque suficiente. Disponível: 30, Solicitado: 50"
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Erro registrado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SuccessResponse" },
                example: {
                  success: true,
                  message: "Erro registrado no pedido"
                }
              }
            }
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
          "500": { $ref: "#/components/responses/InternalError" }
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
    responses: {
      Unauthorized: {
        description: "Não autorizado - API Key inválida ou ausente",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              error: "UNAUTHORIZED",
              message: "API Key inválida ou não fornecida"
            }
          }
        }
      },
      BadRequest: {
        description: "Requisição inválida",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              error: "INVALID_ACTION",
              message: "Ação inválida ou não especificada"
            }
          }
        }
      },
      NotFound: {
        description: "Recurso não encontrado",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              error: "NOT_FOUND",
              message: "Pedido não encontrado"
            }
          }
        }
      },
      InternalError: {
        description: "Erro interno do servidor",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ErrorResponse" },
            example: {
              success: false,
              error: "INTERNAL_ERROR",
              message: "Erro interno ao processar requisição"
            }
          }
        }
      }
    },
    schemas: {
      // ===================== REQUEST SCHEMAS =====================
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
        required: ["acao", "clientes"],
        properties: {
          acao: { type: "string", enum: ["sync_credito"], description: "Ação a ser executada" },
          clientes: {
            type: "array",
            items: { $ref: "#/components/schemas/CreditoCliente" },
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
        required: ["acao"],
        properties: {
          acao: { type: "string", enum: ["sync_formas_pagamento"], description: "Ação a ser executada" },
          formas: {
            type: "array",
            items: { $ref: "#/components/schemas/FormaPagamento" },
            description: "Lista de formas de pagamento"
          },
          prazos: {
            type: "array",
            items: { $ref: "#/components/schemas/PrazoPagamento" },
            description: "Lista de prazos de pagamento"
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
            enum: ["pendente", "exportado", "aprovado", "separado", "faturado", "entregue"],
            default: "pendente",
            description: "Status dos pedidos a buscar"
          }
        }
      },
      ConfirmarPedidoErpRequest: {
        type: "object",
        required: ["acao", "pedido_id", "codigo_erp"],
        properties: {
          acao: { type: "string", enum: ["confirmar_pedido_erp"], description: "Ação a ser executada" },
          pedido_id: { type: "string", format: "uuid", description: "ID do pedido no Cloud" },
          codigo_erp: { type: "string", description: "Código/número do pedido no ERP local" }
        }
      },
      AtualizarStatusRequest: {
        type: "object",
        required: ["acao", "pedido_id", "novo_status"],
        properties: {
          acao: { type: "string", enum: ["atualizar_status"], description: "Ação a ser executada" },
          pedido_id: { type: "string", format: "uuid", description: "ID do pedido no Cloud" },
          novo_status: { 
            type: "string", 
            enum: ["exportado", "aprovado", "separado", "faturado", "entregue"],
            description: "Novo status do pedido"
          }
        }
      },
      ConfirmarNfeRequest: {
        type: "object",
        required: ["acao", "pedido_id", "numero_nfe", "chave_nfe"],
        properties: {
          acao: { type: "string", enum: ["confirmar_nfe"], description: "Ação a ser executada" },
          pedido_id: { type: "string", format: "uuid", description: "ID do pedido no Cloud" },
          numero_nfe: { type: "string", description: "Número da NF-e" },
          chave_nfe: { type: "string", minLength: 44, maxLength: 44, description: "Chave de acesso da NF-e (44 dígitos)" },
          data_faturamento: { type: "string", format: "date", description: "Data de emissão (YYYY-MM-DD)" }
        }
      },
      RegistrarErroPedidoRequest: {
        type: "object",
        required: ["acao", "pedido_id", "error_message"],
        properties: {
          acao: { type: "string", enum: ["registrar_erro_pedido"], description: "Ação a ser executada" },
          pedido_id: { type: "string", format: "uuid", description: "ID do pedido no Cloud" },
          error_message: { type: "string", description: "Mensagem de erro (visível ao vendedor)" }
        }
      },
      // ===================== ENTITY SCHEMAS =====================
      Produto: {
        type: "object",
        required: ["codigo_erp"],
        properties: {
          codigo_erp: { type: "string", description: "Código único do produto no ERP (obrigatório)" },
          nome: { type: "string", description: "Nome do produto" },
          preco: { type: "number", description: "Preço de venda" },
          estoque: { type: "number", description: "Quantidade em estoque" },
          unidade: { type: "string", description: "Unidade de venda (default: UN)" },
          ativo: { type: "boolean", default: true, description: "Se o produto está ativo" }
        }
      },
      Cliente: {
        type: "object",
        required: ["codigo_erp", "cpf_cnpj"],
        properties: {
          codigo_erp: { type: "string", description: "Código único do cliente no ERP (obrigatório)" },
          razao_social: { type: "string", description: "Razão social ou nome" },
          cpf_cnpj: { type: "string", description: "CPF ou CNPJ (apenas números)" },
          email: { type: "string", format: "email" },
          telefone: { type: "string" },
          vendedor_codigo_erp: { type: "string", description: "Código do vendedor responsável (vincula automaticamente)" },
          limite_credito: { type: "number", description: "Limite de crédito do cliente" },
          saldo_credito: { type: "number", description: "Saldo de crédito disponível" },
          endereco: { $ref: "#/components/schemas/Endereco" }
        }
      },
      Endereco: {
        type: "object",
        properties: {
          logradouro: { type: "string" },
          numero: { type: "string" },
          bairro: { type: "string" },
          cidade: { type: "string" },
          estado: { type: "string", description: "UF (2 caracteres)" },
          cep: { type: "string" }
        }
      },
      CreditoCliente: {
        type: "object",
        required: ["codigo_erp"],
        properties: {
          codigo_erp: { type: "string", description: "Código do cliente no ERP" },
          limite_credito: { type: "number", description: "Novo limite de crédito" },
          saldo_credito: { type: "number", description: "Novo saldo disponível" }
        }
      },
      Vendedor: {
        type: "object",
        required: ["codigo_erp", "nome"],
        properties: {
          codigo_erp: { type: "string", description: "Código único do vendedor no ERP" },
          nome: { type: "string", description: "Nome completo do vendedor" },
          email: { type: "string", format: "email" },
          telefone: { type: "string" },
          regiao: { type: "string", description: "Região de atuação" },
          observacoes: { type: "string", description: "Notas adicionais" },
          ativo: { type: "boolean", default: true }
        }
      },
      FormaPagamento: {
        type: "object",
        required: ["codigo_erp", "nome"],
        properties: {
          codigo_erp: { type: "string", description: "Código da forma no ERP" },
          nome: { type: "string", description: "Nome da forma de pagamento" },
          codigo: { type: "string", description: "Código interno (usa codigo_erp se não informado)" },
          ativo: { type: "boolean", default: true }
        }
      },
      PrazoPagamento: {
        type: "object",
        required: ["codigo_erp", "nome", "forma_codigo_erp", "dias_parcelas"],
        properties: {
          codigo_erp: { type: "string", description: "Código do prazo no ERP" },
          nome: { type: "string", description: "Nome do prazo de pagamento" },
          forma_codigo_erp: { type: "string", description: "Código da forma de pagamento vinculada" },
          dias_parcelas: { 
            type: "array", 
            items: { type: "integer" },
            description: "Array com dias de cada parcela [7, 14, 21]" 
          },
          quantidade_parcelas: { type: "integer", description: "Quantidade de parcelas (default: tamanho do array)" },
          padrao: { type: "boolean", default: false, description: "Se é o prazo padrão desta forma" },
          ativo: { type: "boolean", default: true }
        }
      },
      // ===================== RESPONSE SCHEMAS =====================
      SyncResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          acao: { type: "string" },
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
          pedidos: { 
            type: "array", 
            items: { $ref: "#/components/schemas/PedidoCompleto" } 
          }
        }
      },
      PedidoCompleto: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", description: "ID único do pedido no Cloud" },
          numero_pedido: { type: "string", description: "Número sequencial do pedido" },
          data_pedido: { type: "string", format: "date-time", description: "Data/hora de criação" },
          cliente: { $ref: "#/components/schemas/ClienteResumido" },
          valor_total: { type: "number", description: "Valor total do pedido" },
          forma_pagamento: { type: "string", description: "Código da forma de pagamento" },
          prazo_pagamento: { type: "string", description: "Descrição do prazo" },
          observacoes: { type: "string", description: "Observações do vendedor" },
          itens: { 
            type: "array", 
            items: { $ref: "#/components/schemas/ItemPedido" } 
          }
        }
      },
      ClienteResumido: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          codigo_erp: { type: "string" },
          razao_social: { type: "string" },
          cpf_cnpj: { type: "string" }
        }
      },
      ItemPedido: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          produto_id: { type: "string", format: "uuid" },
          codigo_erp: { type: "string" },
          nome: { type: "string" },
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
          error: { type: "string", description: "Código do erro" },
          message: { type: "string", description: "Descrição do erro" }
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
    /* Estilo para tags colapsáveis */
    .swagger-ui .opblock-tag { 
      font-size: 1.1rem !important; 
      border-bottom: 2px solid #e2e8f0 !important;
    }
    .swagger-ui .opblock-tag:hover { 
      background: #f8fafc !important; 
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
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: 'list',
        tagsSorter: 'alpha',
        operationsSorter: 'alpha'
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
