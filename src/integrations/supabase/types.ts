export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      areas: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          integrado_id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      autopsias: {
        Row: {
          assinado_em: string | null
          assinatura_url: string | null
          audio_url: string | null
          causa_morte: string | null
          created_at: string | null
          criado_por: string
          data_autopsia: string
          diagnostico_presuntivo: string | null
          id: string
          idade_dias: number | null
          integrado_id: string
          local_id: string | null
          lote_id: string
          quantidade_aves: number
          recomendacoes: string | null
          sistema_cardiovascular: string | null
          sistema_digestivo: string | null
          sistema_locomotor: string | null
          sistema_nervoso: string | null
          sistema_reprodutor: string | null
          sistema_respiratorio: string | null
          sistema_tegumentar: string | null
          status: string | null
          sync_status: string | null
          transcricao_voz: string | null
          updated_at: string | null
        }
        Insert: {
          assinado_em?: string | null
          assinatura_url?: string | null
          audio_url?: string | null
          causa_morte?: string | null
          created_at?: string | null
          criado_por: string
          data_autopsia?: string
          diagnostico_presuntivo?: string | null
          id?: string
          idade_dias?: number | null
          integrado_id: string
          local_id?: string | null
          lote_id: string
          quantidade_aves?: number
          recomendacoes?: string | null
          sistema_cardiovascular?: string | null
          sistema_digestivo?: string | null
          sistema_locomotor?: string | null
          sistema_nervoso?: string | null
          sistema_reprodutor?: string | null
          sistema_respiratorio?: string | null
          sistema_tegumentar?: string | null
          status?: string | null
          sync_status?: string | null
          transcricao_voz?: string | null
          updated_at?: string | null
        }
        Update: {
          assinado_em?: string | null
          assinatura_url?: string | null
          audio_url?: string | null
          causa_morte?: string | null
          created_at?: string | null
          criado_por?: string
          data_autopsia?: string
          diagnostico_presuntivo?: string | null
          id?: string
          idade_dias?: number | null
          integrado_id?: string
          local_id?: string | null
          lote_id?: string
          quantidade_aves?: number
          recomendacoes?: string | null
          sistema_cardiovascular?: string | null
          sistema_digestivo?: string | null
          sistema_locomotor?: string | null
          sistema_nervoso?: string | null
          sistema_reprodutor?: string | null
          sistema_respiratorio?: string | null
          sistema_tegumentar?: string | null
          status?: string | null
          sync_status?: string | null
          transcricao_voz?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "autopsias_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      autopsias_midias: {
        Row: {
          autopsia_id: string | null
          created_at: string | null
          descricao: string | null
          id: string
          sistema_afetado: string | null
          tipo: string
          url: string
        }
        Insert: {
          autopsia_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          sistema_afetado?: string | null
          tipo: string
          url: string
        }
        Update: {
          autopsia_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          sistema_afetado?: string | null
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopsias_midias_autopsia_id_fkey"
            columns: ["autopsia_id"]
            isOneToOne: false
            referencedRelation: "autopsias"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          integrado_id: string
          nome: string
          tipo_origem: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id: string
          nome: string
          tipo_origem?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id?: string
          nome?: string
          tipo_origem?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      centro_custos: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          integrado_id: string
          lote_id: string | null
          nome: string
          nucleo_id: string | null
          tipo: Database["public"]["Enums"]["tipo_centro_custo"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id: string
          lote_id?: string | null
          nome: string
          nucleo_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_centro_custo"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id?: string
          lote_id?: string | null
          nome?: string
          nucleo_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_centro_custo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "centro_custos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "centro_custos_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos"
            referencedColumns: ["id"]
          },
        ]
      }
      config_fechamento: {
        Row: {
          constante_ajuste_ca: number
          created_at: string
          id: string
          integrado_id: string
          updated_at: string
        }
        Insert: {
          constante_ajuste_ca?: number
          created_at?: string
          id?: string
          integrado_id: string
          updated_at?: string
        }
        Update: {
          constante_ajuste_ca?: number
          created_at?: string
          id?: string
          integrado_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_producao: {
        Row: {
          created_at: string
          id: string
          integrado_id: string
          modo_producao_padrao: string | null
          tempo_mistura_padrao_min: number | null
          tolerancia_insumo_percentual: number | null
          tolerancia_producao_percentual: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          integrado_id: string
          modo_producao_padrao?: string | null
          tempo_mistura_padrao_min?: number | null
          tolerancia_insumo_percentual?: number | null
          tolerancia_producao_percentual?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          integrado_id?: string
          modo_producao_padrao?: string | null
          tempo_mistura_padrao_min?: number | null
          tolerancia_insumo_percentual?: number | null
          tolerancia_producao_percentual?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      config_silo: {
        Row: {
          created_at: string
          dias_atencao: number
          dias_critico: number
          dias_estoque_sugerido: number
          dias_ok: number
          id: string
          integrado_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dias_atencao?: number
          dias_critico?: number
          dias_estoque_sugerido?: number
          dias_ok?: number
          id?: string
          integrado_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dias_atencao?: number
          dias_critico?: number
          dias_estoque_sugerido?: number
          dias_ok?: number
          id?: string
          integrado_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_silo_integrado_id_fkey"
            columns: ["integrado_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_bancarias: {
        Row: {
          agencia: string
          ativo: boolean
          banco_codigo: string
          banco_nome: string
          conta: string
          created_at: string
          descricao: string | null
          digito: string | null
          id: string
          integrado_id: string
          saldo_atual: number
          saldo_inicial: number
          taxa_manutencao_mensal: number | null
          tipo: Database["public"]["Enums"]["tipo_conta_bancaria"]
          updated_at: string
        }
        Insert: {
          agencia: string
          ativo?: boolean
          banco_codigo: string
          banco_nome: string
          conta: string
          created_at?: string
          descricao?: string | null
          digito?: string | null
          id?: string
          integrado_id: string
          saldo_atual?: number
          saldo_inicial?: number
          taxa_manutencao_mensal?: number | null
          tipo?: Database["public"]["Enums"]["tipo_conta_bancaria"]
          updated_at?: string
        }
        Update: {
          agencia?: string
          ativo?: boolean
          banco_codigo?: string
          banco_nome?: string
          conta?: string
          created_at?: string
          descricao?: string | null
          digito?: string | null
          id?: string
          integrado_id?: string
          saldo_atual?: number
          saldo_inicial?: number
          taxa_manutencao_mensal?: number | null
          tipo?: Database["public"]["Enums"]["tipo_conta_bancaria"]
          updated_at?: string
        }
        Relationships: []
      }
      contas_pagar: {
        Row: {
          categoria: string | null
          centro_custo_id: string | null
          conta_bancaria_id: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          desconto: number | null
          descricao: string
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null
          id: string
          integrado_id: string
          juros: number | null
          multa: number | null
          numero_documento: string | null
          observacoes: string | null
          ordem_compra_id: string | null
          parceiro_id: string | null
          plano_conta_id: string | null
          status: Database["public"]["Enums"]["conta_pagar_status"]
          updated_at: string
          valor: number
          valor_pago: number | null
        }
        Insert: {
          categoria?: string | null
          centro_custo_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          desconto?: number | null
          descricao: string
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          id?: string
          integrado_id: string
          juros?: number | null
          multa?: number | null
          numero_documento?: string | null
          observacoes?: string | null
          ordem_compra_id?: string | null
          parceiro_id?: string | null
          plano_conta_id?: string | null
          status?: Database["public"]["Enums"]["conta_pagar_status"]
          updated_at?: string
          valor: number
          valor_pago?: number | null
        }
        Update: {
          categoria?: string | null
          centro_custo_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          desconto?: number | null
          descricao?: string
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          id?: string
          integrado_id?: string
          juros?: number | null
          multa?: number | null
          numero_documento?: string | null
          observacoes?: string | null
          ordem_compra_id?: string | null
          parceiro_id?: string | null
          plano_conta_id?: string | null
          status?: Database["public"]["Enums"]["conta_pagar_status"]
          updated_at?: string
          valor?: number
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centro_custos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_ordem_compra_id_fkey"
            columns: ["ordem_compra_id"]
            isOneToOne: false
            referencedRelation: "ordens_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          centro_custo_id: string | null
          cliente_id: string | null
          conta_bancaria_id: string | null
          created_at: string
          data_recebimento: string | null
          data_vencimento: string
          desconto: number | null
          descricao: string
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null
          id: string
          integrado_id: string
          juros: number | null
          multa: number | null
          numero_documento: string | null
          observacoes: string | null
          pedido_id: string | null
          plano_conta_id: string | null
          status: Database["public"]["Enums"]["conta_receber_status"]
          updated_at: string
          valor: number
          valor_recebido: number | null
        }
        Insert: {
          centro_custo_id?: string | null
          cliente_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string
          data_recebimento?: string | null
          data_vencimento: string
          desconto?: number | null
          descricao: string
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          id?: string
          integrado_id: string
          juros?: number | null
          multa?: number | null
          numero_documento?: string | null
          observacoes?: string | null
          pedido_id?: string | null
          plano_conta_id?: string | null
          status?: Database["public"]["Enums"]["conta_receber_status"]
          updated_at?: string
          valor: number
          valor_recebido?: number | null
        }
        Update: {
          centro_custo_id?: string | null
          cliente_id?: string | null
          conta_bancaria_id?: string | null
          created_at?: string
          data_recebimento?: string | null
          data_vencimento?: string
          desconto?: number | null
          descricao?: string
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          id?: string
          integrado_id?: string
          juros?: number | null
          multa?: number | null
          numero_documento?: string | null
          observacoes?: string | null
          pedido_id?: string | null
          plano_conta_id?: string | null
          status?: Database["public"]["Enums"]["conta_receber_status"]
          updated_at?: string
          valor?: number
          valor_recebido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_centro_custo_id_fkey"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "centro_custos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      credito_cliente: {
        Row: {
          ativo: boolean | null
          cliente_id: string
          created_at: string | null
          id: string
          integrado_id: string
          limite_credito: number
          observacoes: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cliente_id: string
          created_at?: string | null
          id?: string
          integrado_id: string
          limite_credito?: number
          observacoes?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cliente_id?: string
          created_at?: string | null
          id?: string
          integrado_id?: string
          limite_credito?: number
          observacoes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credito_cliente_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      credito_cliente_formas: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          credito_cliente_id: string
          forma_pagamento_id: string
          id: string
          prazo_pagamento_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          credito_cliente_id: string
          forma_pagamento_id: string
          id?: string
          prazo_pagamento_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          credito_cliente_id?: string
          forma_pagamento_id?: string
          id?: string
          prazo_pagamento_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credito_cliente_formas_credito_cliente_id_fkey"
            columns: ["credito_cliente_id"]
            isOneToOne: false
            referencedRelation: "credito_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_cliente_formas_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credito_cliente_formas_prazo_pagamento_id_fkey"
            columns: ["prazo_pagamento_id"]
            isOneToOne: false
            referencedRelation: "prazos_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_data_templates: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          table_name: string
        }
        Insert: {
          created_at?: string | null
          data: Json
          id?: string
          table_name: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          table_name?: string
        }
        Relationships: []
      }
      desempenho_aves: {
        Row: {
          consumo_acumulado_racao_g: number
          consumo_diario_racao_g: number
          conversao_alimentar_acumulada: number
          created_at: string
          dia: number
          ganho_diario_g: number
          ganho_medio_diario_g: number
          id: string
          linhagem: Database["public"]["Enums"]["linhagem_aves"]
          peso_g: number
          sexo: Database["public"]["Enums"]["sexo_ave"]
          updated_at: string
        }
        Insert: {
          consumo_acumulado_racao_g: number
          consumo_diario_racao_g: number
          conversao_alimentar_acumulada: number
          created_at?: string
          dia: number
          ganho_diario_g: number
          ganho_medio_diario_g: number
          id?: string
          linhagem: Database["public"]["Enums"]["linhagem_aves"]
          peso_g: number
          sexo: Database["public"]["Enums"]["sexo_ave"]
          updated_at?: string
        }
        Update: {
          consumo_acumulado_racao_g?: number
          consumo_diario_racao_g?: number
          conversao_alimentar_acumulada?: number
          created_at?: string
          dia?: number
          ganho_diario_g?: number
          ganho_medio_diario_g?: number
          id?: string
          linhagem?: Database["public"]["Enums"]["linhagem_aves"]
          peso_g?: number
          sexo?: Database["public"]["Enums"]["sexo_ave"]
          updated_at?: string
        }
        Relationships: []
      }
      desempenho_postura: {
        Row: {
          consumo_diario_g: number
          created_at: string
          fase: Database["public"]["Enums"]["fase_postura"]
          id: string
          linhagem: Database["public"]["Enums"]["linhagem_postura"]
          ovos_ave_alojada: number | null
          peso_g: number
          peso_ovo_g: number | null
          producao_percentual: number | null
          semana: number
          updated_at: string
          viabilidade_percentual: number | null
        }
        Insert: {
          consumo_diario_g: number
          created_at?: string
          fase: Database["public"]["Enums"]["fase_postura"]
          id?: string
          linhagem: Database["public"]["Enums"]["linhagem_postura"]
          ovos_ave_alojada?: number | null
          peso_g: number
          peso_ovo_g?: number | null
          producao_percentual?: number | null
          semana: number
          updated_at?: string
          viabilidade_percentual?: number | null
        }
        Update: {
          consumo_diario_g?: number
          created_at?: string
          fase?: Database["public"]["Enums"]["fase_postura"]
          id?: string
          linhagem?: Database["public"]["Enums"]["linhagem_postura"]
          ovos_ave_alojada?: number | null
          peso_g?: number
          peso_ovo_g?: number | null
          producao_percentual?: number | null
          semana?: number
          updated_at?: string
          viabilidade_percentual?: number | null
        }
        Relationships: []
      }
      divergencias_recebimento: {
        Row: {
          aceita: boolean | null
          created_at: string
          criado_por: string | null
          data_resolucao: string | null
          descricao: string
          id: string
          percentual_diferenca: number | null
          recebimento_id: string
          recebimento_item_id: string | null
          resolucao: string | null
          resolvido_por: string | null
          status: Database["public"]["Enums"]["divergencia_status"]
          tipo: Database["public"]["Enums"]["divergencia_tipo"]
          updated_at: string
          valor_fisico: number | null
          valor_nfe: number | null
          valor_oc: number | null
        }
        Insert: {
          aceita?: boolean | null
          created_at?: string
          criado_por?: string | null
          data_resolucao?: string | null
          descricao: string
          id?: string
          percentual_diferenca?: number | null
          recebimento_id: string
          recebimento_item_id?: string | null
          resolucao?: string | null
          resolvido_por?: string | null
          status?: Database["public"]["Enums"]["divergencia_status"]
          tipo: Database["public"]["Enums"]["divergencia_tipo"]
          updated_at?: string
          valor_fisico?: number | null
          valor_nfe?: number | null
          valor_oc?: number | null
        }
        Update: {
          aceita?: boolean | null
          created_at?: string
          criado_por?: string | null
          data_resolucao?: string | null
          descricao?: string
          id?: string
          percentual_diferenca?: number | null
          recebimento_id?: string
          recebimento_item_id?: string | null
          resolucao?: string | null
          resolvido_por?: string | null
          status?: Database["public"]["Enums"]["divergencia_status"]
          tipo?: Database["public"]["Enums"]["divergencia_tipo"]
          updated_at?: string
          valor_fisico?: number | null
          valor_nfe?: number | null
          valor_oc?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "divergencias_recebimento_recebimento_id_fkey"
            columns: ["recebimento_id"]
            isOneToOne: false
            referencedRelation: "recebimentos_mercadoria"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "divergencias_recebimento_recebimento_item_id_fkey"
            columns: ["recebimento_item_id"]
            isOneToOne: false
            referencedRelation: "recebimento_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos_producao: {
        Row: {
          ativo: boolean | null
          codigo_clp: string | null
          created_at: string
          id: string
          integrado_id: string
          ip_comunicacao: string | null
          nome: string
          protocolo: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          codigo_clp?: string | null
          created_at?: string
          id?: string
          integrado_id: string
          ip_comunicacao?: string | null
          nome: string
          protocolo?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          codigo_clp?: string | null
          created_at?: string
          id?: string
          integrado_id?: string
          ip_comunicacao?: string | null
          nome?: string
          protocolo?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      estoque_ovos: {
        Row: {
          ativo: boolean
          classificacao_peso: Database["public"]["Enums"]["classificacao_peso_ovo"]
          created_at: string
          custo_unitario: number | null
          data_producao: string
          data_validade: string
          id: string
          integrado_id: string
          lote_interno: string
          lote_producao_id: string | null
          observacoes: string | null
          quantidade_atual: number
          quantidade_inicial: number
          quantidade_reservada: number
          tipo_ovo: Database["public"]["Enums"]["tipo_ovo"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          classificacao_peso: Database["public"]["Enums"]["classificacao_peso_ovo"]
          created_at?: string
          custo_unitario?: number | null
          data_producao: string
          data_validade: string
          id?: string
          integrado_id: string
          lote_interno: string
          lote_producao_id?: string | null
          observacoes?: string | null
          quantidade_atual: number
          quantidade_inicial: number
          quantidade_reservada?: number
          tipo_ovo: Database["public"]["Enums"]["tipo_ovo"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          classificacao_peso?: Database["public"]["Enums"]["classificacao_peso_ovo"]
          created_at?: string
          custo_unitario?: number | null
          data_producao?: string
          data_validade?: string
          id?: string
          integrado_id?: string
          lote_interno?: string
          lote_producao_id?: string | null
          observacoes?: string | null
          quantidade_atual?: number
          quantidade_inicial?: number
          quantidade_reservada?: number
          tipo_ovo?: Database["public"]["Enums"]["tipo_ovo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_ovos_lote_producao_id_fkey"
            columns: ["lote_producao_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      fases_animal: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          dia_fim: number
          dia_inicio: number
          grupo_id: string
          id: string
          integrado_id: string
          nome: string
          produto_racao_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          dia_fim: number
          dia_inicio?: number
          grupo_id: string
          id?: string
          integrado_id: string
          nome: string
          produto_racao_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          dia_fim?: number
          dia_inicio?: number
          grupo_id?: string
          id?: string
          integrado_id?: string
          nome?: string
          produto_racao_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fases_animal_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_animal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fases_animal_produto_racao_id_fkey"
            columns: ["produto_racao_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      fechamento_lotes: {
        Row: {
          aves_abatidas: number
          aves_alojadas: number
          aves_condenadas_parcial: number | null
          aves_condenadas_total: number | null
          calo_pata_quantidade: number | null
          consumo_total_racao_kg: number
          conv_ajustada_prev: number | null
          conversao_ajustada: number | null
          conversao_alimentar: number
          created_at: string
          data_abate: string
          data_alojamento: string
          fechado_por: string | null
          gpd_kg: number
          id: string
          idade_abate: number
          iee: number | null
          iep: number
          integrado_id: string
          lote_id: string
          mortalidade_percentual: number
          ovos_por_ave_alojada: number | null
          percentual_postura_medio: number | null
          peso_inicial_kg: number
          peso_medio_descarte_kg: number | null
          peso_medio_real_kg: number
          peso_projetado_kg: number | null
          peso_total_abatido_kg: number
          semanas_producao: number | null
          tipo_producao: string | null
          total_ovos_produzidos: number | null
          updated_at: string
          valor_venda_aves: number | null
          viabilidade_percentual: number
        }
        Insert: {
          aves_abatidas: number
          aves_alojadas: number
          aves_condenadas_parcial?: number | null
          aves_condenadas_total?: number | null
          calo_pata_quantidade?: number | null
          consumo_total_racao_kg: number
          conv_ajustada_prev?: number | null
          conversao_ajustada?: number | null
          conversao_alimentar: number
          created_at?: string
          data_abate: string
          data_alojamento: string
          fechado_por?: string | null
          gpd_kg: number
          id?: string
          idade_abate: number
          iee?: number | null
          iep: number
          integrado_id: string
          lote_id: string
          mortalidade_percentual: number
          ovos_por_ave_alojada?: number | null
          percentual_postura_medio?: number | null
          peso_inicial_kg: number
          peso_medio_descarte_kg?: number | null
          peso_medio_real_kg: number
          peso_projetado_kg?: number | null
          peso_total_abatido_kg: number
          semanas_producao?: number | null
          tipo_producao?: string | null
          total_ovos_produzidos?: number | null
          updated_at?: string
          valor_venda_aves?: number | null
          viabilidade_percentual: number
        }
        Update: {
          aves_abatidas?: number
          aves_alojadas?: number
          aves_condenadas_parcial?: number | null
          aves_condenadas_total?: number | null
          calo_pata_quantidade?: number | null
          consumo_total_racao_kg?: number
          conv_ajustada_prev?: number | null
          conversao_ajustada?: number | null
          conversao_alimentar?: number
          created_at?: string
          data_abate?: string
          data_alojamento?: string
          fechado_por?: string | null
          gpd_kg?: number
          id?: string
          idade_abate?: number
          iee?: number | null
          iep?: number
          integrado_id?: string
          lote_id?: string
          mortalidade_percentual?: number
          ovos_por_ave_alojada?: number | null
          percentual_postura_medio?: number | null
          peso_inicial_kg?: number
          peso_medio_descarte_kg?: number | null
          peso_medio_real_kg?: number
          peso_projetado_kg?: number | null
          peso_total_abatido_kg?: number
          semanas_producao?: number | null
          tipo_producao?: string | null
          total_ovos_produzidos?: number | null
          updated_at?: string
          valor_venda_aves?: number | null
          viabilidade_percentual?: number
        }
        Relationships: [
          {
            foreignKeyName: "fechamento_lotes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: true
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      formas_pagamento: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          id: string
          integrado_id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          id?: string
          integrado_id: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          id?: string
          integrado_id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      galpoes: {
        Row: {
          altura: number
          ativo: boolean
          aves_por_m2: number | null
          bebedouro_quantidade: number
          bebedouro_tipo: Database["public"]["Enums"]["tipo_bebedouro"]
          caixa_agua_quantidade: number
          caixa_agua_volume_total: number | null
          comedouro_quantidade: number
          comedouro_tipo: Database["public"]["Enums"]["tipo_comedouro"]
          comprimento: number
          created_at: string
          id: string
          largura: number
          nome: string
          nucleo_id: string
          silo_id: string | null
          silo_quantidade: number
          silo_volume_total: number | null
          tipo_pressao: Database["public"]["Enums"]["tipo_pressao"]
          total_aves: number | null
          updated_at: string
          ventilador_quantidade: number
        }
        Insert: {
          altura: number
          ativo?: boolean
          aves_por_m2?: number | null
          bebedouro_quantidade?: number
          bebedouro_tipo: Database["public"]["Enums"]["tipo_bebedouro"]
          caixa_agua_quantidade?: number
          caixa_agua_volume_total?: number | null
          comedouro_quantidade?: number
          comedouro_tipo: Database["public"]["Enums"]["tipo_comedouro"]
          comprimento: number
          created_at?: string
          id?: string
          largura: number
          nome: string
          nucleo_id: string
          silo_id?: string | null
          silo_quantidade?: number
          silo_volume_total?: number | null
          tipo_pressao: Database["public"]["Enums"]["tipo_pressao"]
          total_aves?: number | null
          updated_at?: string
          ventilador_quantidade?: number
        }
        Update: {
          altura?: number
          ativo?: boolean
          aves_por_m2?: number | null
          bebedouro_quantidade?: number
          bebedouro_tipo?: Database["public"]["Enums"]["tipo_bebedouro"]
          caixa_agua_quantidade?: number
          caixa_agua_volume_total?: number | null
          comedouro_quantidade?: number
          comedouro_tipo?: Database["public"]["Enums"]["tipo_comedouro"]
          comprimento?: number
          created_at?: string
          id?: string
          largura?: number
          nome?: string
          nucleo_id?: string
          silo_id?: string | null
          silo_quantidade?: number
          silo_volume_total?: number | null
          tipo_pressao?: Database["public"]["Enums"]["tipo_pressao"]
          total_aves?: number | null
          updated_at?: string
          ventilador_quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "galpoes_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "galpoes_silo_id_fkey"
            columns: ["silo_id"]
            isOneToOne: false
            referencedRelation: "silos"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_animal: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          integrado_id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      grupos_produto: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          integrado_id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      historico_nivel_silo: {
        Row: {
          created_at: string | null
          divergencia_alerta: boolean | null
          divergencia_percentual: number | null
          galpao_id: string
          id: string
          integrado_id: string
          lote_id: string | null
          nivel_aneis: number
          nivel_esperado_kg: number | null
          nivel_estimado_kg: number
          nivel_funil: number
          observacoes: string | null
          registrado_por: string | null
        }
        Insert: {
          created_at?: string | null
          divergencia_alerta?: boolean | null
          divergencia_percentual?: number | null
          galpao_id: string
          id?: string
          integrado_id: string
          lote_id?: string | null
          nivel_aneis: number
          nivel_esperado_kg?: number | null
          nivel_estimado_kg: number
          nivel_funil: number
          observacoes?: string | null
          registrado_por?: string | null
        }
        Update: {
          created_at?: string | null
          divergencia_alerta?: boolean | null
          divergencia_percentual?: number | null
          galpao_id?: string
          id?: string
          integrado_id?: string
          lote_id?: string | null
          nivel_aneis?: number
          nivel_esperado_kg?: number | null
          nivel_estimado_kg?: number
          nivel_funil?: number
          observacoes?: string | null
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_nivel_silo_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: false
            referencedRelation: "galpoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_nivel_silo_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      kardex: {
        Row: {
          created_at: string
          criado_por: string | null
          custo_unitario: number | null
          documento_ref: string | null
          id: string
          integrado_id: string
          lote_fornecedor: string | null
          observacao: string | null
          produto_id: string
          quantidade: number
          recebimento_id: string | null
          saldo_anterior: number
          saldo_atual: number
          status_quarentena:
            | Database["public"]["Enums"]["status_quarentena"]
            | null
          tipo_movimento: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          custo_unitario?: number | null
          documento_ref?: string | null
          id?: string
          integrado_id: string
          lote_fornecedor?: string | null
          observacao?: string | null
          produto_id: string
          quantidade: number
          recebimento_id?: string | null
          saldo_anterior: number
          saldo_atual: number
          status_quarentena?:
            | Database["public"]["Enums"]["status_quarentena"]
            | null
          tipo_movimento: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          custo_unitario?: number | null
          documento_ref?: string | null
          id?: string
          integrado_id?: string
          lote_fornecedor?: string | null
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          recebimento_id?: string | null
          saldo_anterior?: number
          saldo_atual?: number
          status_quarentena?:
            | Database["public"]["Enums"]["status_quarentena"]
            | null
          tipo_movimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "kardex_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kardex_recebimento_id_fkey"
            columns: ["recebimento_id"]
            isOneToOne: false
            referencedRelation: "recebimentos_mercadoria"
            referencedColumns: ["id"]
          },
        ]
      }
      kardex_ovos: {
        Row: {
          created_at: string
          criado_por: string | null
          documento_ref: string | null
          estoque_ovo_id: string
          id: string
          integrado_id: string
          observacao: string | null
          pedido_id: string | null
          producao_ovos_id: string | null
          quantidade: number
          saldo_anterior: number
          saldo_atual: number
          tipo_movimento: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          documento_ref?: string | null
          estoque_ovo_id: string
          id?: string
          integrado_id: string
          observacao?: string | null
          pedido_id?: string | null
          producao_ovos_id?: string | null
          quantidade: number
          saldo_anterior: number
          saldo_atual: number
          tipo_movimento: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          documento_ref?: string | null
          estoque_ovo_id?: string
          id?: string
          integrado_id?: string
          observacao?: string | null
          pedido_id?: string | null
          producao_ovos_id?: string | null
          quantidade?: number
          saldo_anterior?: number
          saldo_atual?: number
          tipo_movimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "kardex_ovos_estoque_ovo_id_fkey"
            columns: ["estoque_ovo_id"]
            isOneToOne: false
            referencedRelation: "estoque_ovos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kardex_ovos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kardex_ovos_producao_ovos_id_fkey"
            columns: ["producao_ovos_id"]
            isOneToOne: false
            referencedRelation: "producao_ovos"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes: {
        Row: {
          created_at: string
          criador_id: string | null
          custo_aves: number | null
          data_alojamento: string | null
          data_fechamento: string | null
          data_prevista_alojamento: string
          data_prevista_saida: string | null
          fase_postura_atual: Database["public"]["Enums"]["fase_postura"] | null
          galpao_id: string
          horario_inicio_jejum: string | null
          id: string
          integrado_id: string
          jejum_confirmado: boolean | null
          jejum_confirmado_em: string | null
          jejum_confirmado_por: string | null
          linhagem: Database["public"]["Enums"]["linhagem_aves"] | null
          linhagem_postura:
            | Database["public"]["Enums"]["linhagem_postura"]
            | null
          nucleo_id: string
          observacoes: string | null
          peso_medio_pintinhos: number | null
          quantidade_aves: number
          saida_abate: number | null
          saida_venda_externa: number | null
          saida_venda_local: number | null
          sexo: Database["public"]["Enums"]["sexo_ave"]
          status: Database["public"]["Enums"]["lote_status"]
          updated_at: string
          veterinario_id: string | null
        }
        Insert: {
          created_at?: string
          criador_id?: string | null
          custo_aves?: number | null
          data_alojamento?: string | null
          data_fechamento?: string | null
          data_prevista_alojamento: string
          data_prevista_saida?: string | null
          fase_postura_atual?:
            | Database["public"]["Enums"]["fase_postura"]
            | null
          galpao_id: string
          horario_inicio_jejum?: string | null
          id?: string
          integrado_id: string
          jejum_confirmado?: boolean | null
          jejum_confirmado_em?: string | null
          jejum_confirmado_por?: string | null
          linhagem?: Database["public"]["Enums"]["linhagem_aves"] | null
          linhagem_postura?:
            | Database["public"]["Enums"]["linhagem_postura"]
            | null
          nucleo_id: string
          observacoes?: string | null
          peso_medio_pintinhos?: number | null
          quantidade_aves: number
          saida_abate?: number | null
          saida_venda_externa?: number | null
          saida_venda_local?: number | null
          sexo?: Database["public"]["Enums"]["sexo_ave"]
          status?: Database["public"]["Enums"]["lote_status"]
          updated_at?: string
          veterinario_id?: string | null
        }
        Update: {
          created_at?: string
          criador_id?: string | null
          custo_aves?: number | null
          data_alojamento?: string | null
          data_fechamento?: string | null
          data_prevista_alojamento?: string
          data_prevista_saida?: string | null
          fase_postura_atual?:
            | Database["public"]["Enums"]["fase_postura"]
            | null
          galpao_id?: string
          horario_inicio_jejum?: string | null
          id?: string
          integrado_id?: string
          jejum_confirmado?: boolean | null
          jejum_confirmado_em?: string | null
          jejum_confirmado_por?: string | null
          linhagem?: Database["public"]["Enums"]["linhagem_aves"] | null
          linhagem_postura?:
            | Database["public"]["Enums"]["linhagem_postura"]
            | null
          nucleo_id?: string
          observacoes?: string | null
          peso_medio_pintinhos?: number | null
          quantidade_aves?: number
          saida_abate?: number | null
          saida_venda_externa?: number | null
          saida_venda_local?: number | null
          sexo?: Database["public"]["Enums"]["sexo_ave"]
          status?: Database["public"]["Enums"]["lote_status"]
          updated_at?: string
          veterinario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lotes_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: false
            referencedRelation: "galpoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos"
            referencedColumns: ["id"]
          },
        ]
      }
      medicamentos_config: {
        Row: {
          carencia_dias: number
          created_at: string
          dosagem_padrao: string | null
          id: string
          integrado_id: string
          observacoes: string | null
          produto_id: string
          updated_at: string
          via_administracao: string
        }
        Insert: {
          carencia_dias?: number
          created_at?: string
          dosagem_padrao?: string | null
          id?: string
          integrado_id: string
          observacoes?: string | null
          produto_id: string
          updated_at?: string
          via_administracao?: string
        }
        Update: {
          carencia_dias?: number
          created_at?: string
          dosagem_padrao?: string | null
          id?: string
          integrado_id?: string
          observacoes?: string | null
          produto_id?: string
          updated_at?: string
          via_administracao?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicamentos_config_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_peso: {
        Row: {
          created_at: string
          gpd_kg: number
          id: string
          integrado_id: string
          lote_id: string
          meta_14_dias_kg: number
          meta_21_dias_kg: number
          meta_28_dias_kg: number
          meta_35_dias_kg: number
          meta_42_dias_kg: number
          meta_7_dias_kg: number
          peso_inicial_kg: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          gpd_kg: number
          id?: string
          integrado_id: string
          lote_id: string
          meta_14_dias_kg: number
          meta_21_dias_kg: number
          meta_28_dias_kg: number
          meta_35_dias_kg: number
          meta_42_dias_kg: number
          meta_7_dias_kg: number
          peso_inicial_kg: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          gpd_kg?: number
          id?: string
          integrado_id?: string
          lote_id?: string
          meta_14_dias_kg?: number
          meta_21_dias_kg?: number
          meta_28_dias_kg?: number
          meta_35_dias_kg?: number
          meta_42_dias_kg?: number
          meta_7_dias_kg?: number
          peso_inicial_kg?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_peso_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: true
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_postura: {
        Row: {
          created_at: string
          id: string
          integrado_id: string
          lote_id: string
          meta_ovos_incubaveis: number | null
          meta_persistencia: number | null
          meta_peso_ovo_g: number | null
          meta_pico_postura: number | null
          meta_viabilidade: number | null
          semana_pico: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          integrado_id: string
          lote_id: string
          meta_ovos_incubaveis?: number | null
          meta_persistencia?: number | null
          meta_peso_ovo_g?: number | null
          meta_pico_postura?: number | null
          meta_viabilidade?: number | null
          semana_pico?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          integrado_id?: string
          lote_id?: string
          meta_ovos_incubaveis?: number | null
          meta_persistencia?: number | null
          meta_peso_ovo_g?: number | null
          meta_pico_postura?: number | null
          meta_viabilidade?: number | null
          semana_pico?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_postura_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: true
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number | null
          rota: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number | null
          rota: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          rota?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mortalidade: {
        Row: {
          created_at: string
          data_registro: string
          id: string
          integrado_id: string
          lote_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_registro?: string
          id?: string
          integrado_id: string
          lote_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_registro?: string
          id?: string
          integrado_id?: string
          lote_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortalidade_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      mortalidade_itens: {
        Row: {
          created_at: string
          id: string
          mortalidade_id: string
          motivo: Database["public"]["Enums"]["motivo_mortalidade"]
          peso_kg: number | null
          quantidade: number
          submotivo: Database["public"]["Enums"]["submotivo_eliminacao"] | null
        }
        Insert: {
          created_at?: string
          id?: string
          mortalidade_id: string
          motivo: Database["public"]["Enums"]["motivo_mortalidade"]
          peso_kg?: number | null
          quantidade?: number
          submotivo?: Database["public"]["Enums"]["submotivo_eliminacao"] | null
        }
        Update: {
          created_at?: string
          id?: string
          mortalidade_id?: string
          motivo?: Database["public"]["Enums"]["motivo_mortalidade"]
          peso_kg?: number | null
          quantidade?: number
          submotivo?: Database["public"]["Enums"]["submotivo_eliminacao"] | null
        }
        Relationships: [
          {
            foreignKeyName: "mortalidade_itens_mortalidade_id_fkey"
            columns: ["mortalidade_id"]
            isOneToOne: false
            referencedRelation: "mortalidade"
            referencedColumns: ["id"]
          },
        ]
      }
      mortalidade_media: {
        Row: {
          created_at: string
          id: string
          integrado_id: string
          linhagem: Database["public"]["Enums"]["linhagem_aves"]
          mortalidade_14_dias: number
          mortalidade_21_dias: number
          mortalidade_28_dias: number
          mortalidade_35_dias: number
          mortalidade_42_dias: number
          mortalidade_7_dias: number
          mortalidade_acima_42_dias: number
          sexo: Database["public"]["Enums"]["sexo_ave"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          integrado_id: string
          linhagem?: Database["public"]["Enums"]["linhagem_aves"]
          mortalidade_14_dias?: number
          mortalidade_21_dias?: number
          mortalidade_28_dias?: number
          mortalidade_35_dias?: number
          mortalidade_42_dias?: number
          mortalidade_7_dias?: number
          mortalidade_acima_42_dias?: number
          sexo?: Database["public"]["Enums"]["sexo_ave"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          integrado_id?: string
          linhagem?: Database["public"]["Enums"]["linhagem_aves"]
          mortalidade_14_dias?: number
          mortalidade_21_dias?: number
          mortalidade_28_dias?: number
          mortalidade_35_dias?: number
          mortalidade_42_dias?: number
          mortalidade_7_dias?: number
          mortalidade_acima_42_dias?: number
          sexo?: Database["public"]["Enums"]["sexo_ave"]
          updated_at?: string
        }
        Relationships: []
      }
      movimentacoes_bancarias: {
        Row: {
          conciliado: boolean | null
          conta_bancaria_id: string
          conta_pagar_id: string | null
          conta_receber_id: string | null
          created_at: string
          data_conciliacao: string | null
          data_movimento: string
          descricao: string
          documento_ref: string | null
          id: string
          integrado_id: string
          origem: string | null
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          conciliado?: boolean | null
          conta_bancaria_id: string
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          data_conciliacao?: string | null
          data_movimento: string
          descricao: string
          documento_ref?: string | null
          id?: string
          integrado_id: string
          origem?: string | null
          tipo: string
          updated_at?: string
          valor: number
        }
        Update: {
          conciliado?: boolean | null
          conta_bancaria_id?: string
          conta_pagar_id?: string | null
          conta_receber_id?: string | null
          created_at?: string
          data_conciliacao?: string | null
          data_movimento?: string
          descricao?: string
          documento_ref?: string | null
          id?: string
          integrado_id?: string
          origem?: string | null
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_bancarias_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_conta_pagar_id_fkey"
            columns: ["conta_pagar_id"]
            isOneToOne: false
            referencedRelation: "contas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_bancarias_conta_receber_id_fkey"
            columns: ["conta_receber_id"]
            isOneToOne: false
            referencedRelation: "contas_receber"
            referencedColumns: ["id"]
          },
        ]
      }
      multiplicadores_meta_peso: {
        Row: {
          created_at: string
          id: string
          integrado_id: string
          linhagem: Database["public"]["Enums"]["linhagem_aves"]
          mult_14_dias: number
          mult_21_dias: number
          mult_28_dias: number
          mult_35_dias: number
          mult_42_dias: number
          mult_7_dias: number
          sexo: Database["public"]["Enums"]["sexo_ave"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          integrado_id: string
          linhagem: Database["public"]["Enums"]["linhagem_aves"]
          mult_14_dias?: number
          mult_21_dias?: number
          mult_28_dias?: number
          mult_35_dias?: number
          mult_42_dias?: number
          mult_7_dias?: number
          sexo: Database["public"]["Enums"]["sexo_ave"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          integrado_id?: string
          linhagem?: Database["public"]["Enums"]["linhagem_aves"]
          mult_14_dias?: number
          mult_21_dias?: number
          mult_28_dias?: number
          mult_35_dias?: number
          mult_42_dias?: number
          mult_7_dias?: number
          sexo?: Database["public"]["Enums"]["sexo_ave"]
          updated_at?: string
        }
        Relationships: []
      }
      nucleos: {
        Row: {
          area_id: string | null
          ativo: boolean
          bairro: string
          cep: string
          cidade: string
          codigo_ibge: string | null
          complemento: string | null
          created_at: string
          estado: string
          id: string
          integrado_id: string
          latitude: number | null
          logradouro: string
          longitude: number | null
          nome: string
          numero: string | null
          tipo_producao: string
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          ativo?: boolean
          bairro: string
          cep: string
          cidade: string
          codigo_ibge?: string | null
          complemento?: string | null
          created_at?: string
          estado: string
          id?: string
          integrado_id: string
          latitude?: number | null
          logradouro: string
          longitude?: number | null
          nome: string
          numero?: string | null
          tipo_producao: string
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          ativo?: boolean
          bairro?: string
          cep?: string
          cidade?: string
          codigo_ibge?: string | null
          complemento?: string | null
          created_at?: string
          estado?: string
          id?: string
          integrado_id?: string
          latitude?: number | null
          logradouro?: string
          longitude?: number | null
          nome?: string
          numero?: string | null
          tipo_producao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nucleos_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nucleos_integrado_id_fkey"
            columns: ["integrado_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nutricao_itens: {
        Row: {
          created_at: string
          id: string
          insumo_id: string
          integrado_id: string
          nutricao_id: string
          quantidade: number
          unidade_medida: string
        }
        Insert: {
          created_at?: string
          id?: string
          insumo_id: string
          integrado_id: string
          nutricao_id: string
          quantidade: number
          unidade_medida?: string
        }
        Update: {
          created_at?: string
          id?: string
          insumo_id?: string
          integrado_id?: string
          nutricao_id?: string
          quantidade?: number
          unidade_medida?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutricao_itens_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutricao_itens_nutricao_id_fkey"
            columns: ["nutricao_id"]
            isOneToOne: false
            referencedRelation: "nutricoes"
            referencedColumns: ["id"]
          },
        ]
      }
      nutricoes: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          integrado_id: string
          nome: string
          padrao: boolean
          produto_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id: string
          nome: string
          padrao?: boolean
          produto_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id?: string
          nome?: string
          padrao?: boolean
          produto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutricoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      observacoes_lote: {
        Row: {
          created_at: string
          criado_por: string
          descricao: string
          dia_ciclo: number
          id: string
          integrado_id: string
          lido_em: string | null
          lido_por: string | null
          lote_id: string
          prioridade:
            | Database["public"]["Enums"]["observacao_prioridade"]
            | null
          tipo: Database["public"]["Enums"]["observacao_tipo"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por: string
          descricao: string
          dia_ciclo: number
          id?: string
          integrado_id: string
          lido_em?: string | null
          lido_por?: string | null
          lote_id: string
          prioridade?:
            | Database["public"]["Enums"]["observacao_prioridade"]
            | null
          tipo?: Database["public"]["Enums"]["observacao_tipo"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          descricao?: string
          dia_ciclo?: number
          id?: string
          integrado_id?: string
          lido_em?: string | null
          lido_por?: string | null
          lote_id?: string
          prioridade?:
            | Database["public"]["Enums"]["observacao_prioridade"]
            | null
          tipo?: Database["public"]["Enums"]["observacao_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "observacoes_lote_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_compra: {
        Row: {
          aprovado_por: string | null
          created_at: string
          criado_por: string | null
          data_aprovacao: string | null
          data_emissao: string
          data_prevista_entrega: string | null
          data_vencimento: string | null
          desconto: number | null
          forma_pagamento: string | null
          id: string
          integrado_id: string
          numero_oc: number
          observacoes: string | null
          parceiro_id: string
          prazo_pagamento_dias: number | null
          status: Database["public"]["Enums"]["ordem_compra_status"]
          tipo_frete: string | null
          updated_at: string
          valor_frete: number | null
          valor_total: number
        }
        Insert: {
          aprovado_por?: string | null
          created_at?: string
          criado_por?: string | null
          data_aprovacao?: string | null
          data_emissao?: string
          data_prevista_entrega?: string | null
          data_vencimento?: string | null
          desconto?: number | null
          forma_pagamento?: string | null
          id?: string
          integrado_id: string
          numero_oc?: number
          observacoes?: string | null
          parceiro_id: string
          prazo_pagamento_dias?: number | null
          status?: Database["public"]["Enums"]["ordem_compra_status"]
          tipo_frete?: string | null
          updated_at?: string
          valor_frete?: number | null
          valor_total?: number
        }
        Update: {
          aprovado_por?: string | null
          created_at?: string
          criado_por?: string | null
          data_aprovacao?: string | null
          data_emissao?: string
          data_prevista_entrega?: string | null
          data_vencimento?: string | null
          desconto?: number | null
          forma_pagamento?: string | null
          id?: string
          integrado_id?: string
          numero_oc?: number
          observacoes?: string | null
          parceiro_id?: string
          prazo_pagamento_dias?: number | null
          status?: Database["public"]["Enums"]["ordem_compra_status"]
          tipo_frete?: string | null
          updated_at?: string
          valor_frete?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "ordens_compra_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_compra_itens: {
        Row: {
          created_at: string
          fator_conversao: number | null
          id: string
          ordem_compra_id: string
          preco_total: number
          preco_unitario: number
          produto_id: string
          quantidade: number
          quantidade_recebida: number | null
          unidade_compra: string | null
          unidade_medida: string
        }
        Insert: {
          created_at?: string
          fator_conversao?: number | null
          id?: string
          ordem_compra_id: string
          preco_total?: number
          preco_unitario?: number
          produto_id: string
          quantidade: number
          quantidade_recebida?: number | null
          unidade_compra?: string | null
          unidade_medida?: string
        }
        Update: {
          created_at?: string
          fator_conversao?: number | null
          id?: string
          ordem_compra_id?: string
          preco_total?: number
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          quantidade_recebida?: number | null
          unidade_compra?: string | null
          unidade_medida?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_compra_itens_ordem_compra_id_fkey"
            columns: ["ordem_compra_id"]
            isOneToOne: false
            referencedRelation: "ordens_compra"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_compra_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_producao: {
        Row: {
          aprovado_por: string | null
          created_at: string
          criado_por: string | null
          custo_por_kg: number | null
          custo_total_estimado: number | null
          custo_total_real: number | null
          data_aprovacao: string | null
          data_finalizacao: string | null
          data_inicio_producao: string | null
          data_prevista_producao: string | null
          equipamento_id: string | null
          id: string
          integrado_id: string
          lote_producao: string | null
          modo_execucao: string | null
          numero_op: number
          nutricao_id: string | null
          observacoes: string | null
          produto_id: string
          quantidade_planejada: number
          quantidade_produzida: number | null
          status: string
          tempo_mistura_previsto: number | null
          tempo_mistura_real: number | null
          tolerancia_variacao: number | null
          updated_at: string
        }
        Insert: {
          aprovado_por?: string | null
          created_at?: string
          criado_por?: string | null
          custo_por_kg?: number | null
          custo_total_estimado?: number | null
          custo_total_real?: number | null
          data_aprovacao?: string | null
          data_finalizacao?: string | null
          data_inicio_producao?: string | null
          data_prevista_producao?: string | null
          equipamento_id?: string | null
          id?: string
          integrado_id: string
          lote_producao?: string | null
          modo_execucao?: string | null
          numero_op?: number
          nutricao_id?: string | null
          observacoes?: string | null
          produto_id: string
          quantidade_planejada: number
          quantidade_produzida?: number | null
          status?: string
          tempo_mistura_previsto?: number | null
          tempo_mistura_real?: number | null
          tolerancia_variacao?: number | null
          updated_at?: string
        }
        Update: {
          aprovado_por?: string | null
          created_at?: string
          criado_por?: string | null
          custo_por_kg?: number | null
          custo_total_estimado?: number | null
          custo_total_real?: number | null
          data_aprovacao?: string | null
          data_finalizacao?: string | null
          data_inicio_producao?: string | null
          data_prevista_producao?: string | null
          equipamento_id?: string | null
          id?: string
          integrado_id?: string
          lote_producao?: string | null
          modo_execucao?: string | null
          numero_op?: number
          nutricao_id?: string | null
          observacoes?: string | null
          produto_id?: string
          quantidade_planejada?: number
          quantidade_produzida?: number | null
          status?: string
          tempo_mistura_previsto?: number | null
          tempo_mistura_real?: number | null
          tolerancia_variacao?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_producao_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_producao_nutricao_id_fkey"
            columns: ["nutricao_id"]
            isOneToOne: false
            referencedRelation: "nutricoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_producao_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_producao_itens: {
        Row: {
          created_at: string
          custo_total: number | null
          custo_unitario: number | null
          estoque_disponivel: number | null
          id: string
          insumo_id: string
          ordem_producao_id: string
          quantidade_necessaria: number
          quantidade_utilizada: number | null
          unidade_medida: string
        }
        Insert: {
          created_at?: string
          custo_total?: number | null
          custo_unitario?: number | null
          estoque_disponivel?: number | null
          id?: string
          insumo_id: string
          ordem_producao_id: string
          quantidade_necessaria: number
          quantidade_utilizada?: number | null
          unidade_medida?: string
        }
        Update: {
          created_at?: string
          custo_total?: number | null
          custo_unitario?: number | null
          estoque_disponivel?: number | null
          id?: string
          insumo_id?: string
          ordem_producao_id?: string
          quantidade_necessaria?: number
          quantidade_utilizada?: number | null
          unidade_medida?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_producao_itens_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_producao_itens_ordem_producao_id_fkey"
            columns: ["ordem_producao_id"]
            isOneToOne: false
            referencedRelation: "ordens_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      organizacoes: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          cnpj: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          integrado_id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          integrado_id: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          integrado_id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      parceiros: {
        Row: {
          ativo: boolean
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          codigo_ibge: string | null
          complemento: string | null
          cpf_cnpj: string
          created_at: string
          email: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          inscricao_produtor: string | null
          integrado_id: string
          logradouro: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          razao_social_nome: string
          rg: string | null
          telefone: string | null
          tipo_cadastro: Database["public"]["Enums"]["tipo_cadastro"]
          tipo_pessoa: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_ibge?: string | null
          complemento?: string | null
          cpf_cnpj: string
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          inscricao_produtor?: string | null
          integrado_id: string
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social_nome: string
          rg?: string | null
          telefone?: string | null
          tipo_cadastro?: Database["public"]["Enums"]["tipo_cadastro"]
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_ibge?: string | null
          complemento?: string | null
          cpf_cnpj?: string
          created_at?: string
          email?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          inscricao_produtor?: string | null
          integrado_id?: string
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social_nome?: string
          rg?: string | null
          telefone?: string | null
          tipo_cadastro?: Database["public"]["Enums"]["tipo_cadastro"]
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa"]
          updated_at?: string
        }
        Relationships: []
      }
      pedido_itens: {
        Row: {
          created_at: string
          desconto_percentual: number | null
          id: string
          lote_producao_id: string | null
          margem_calculada: number | null
          pedido_id: string
          peso_total_kg: number | null
          preco_tabela: number | null
          preco_unitario: number
          produto_animal_id: string | null
          produto_id: string
          quantidade: number
          unidade_medida: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          desconto_percentual?: number | null
          id?: string
          lote_producao_id?: string | null
          margem_calculada?: number | null
          pedido_id: string
          peso_total_kg?: number | null
          preco_tabela?: number | null
          preco_unitario?: number
          produto_animal_id?: string | null
          produto_id: string
          quantidade: number
          unidade_medida?: string
          valor_total?: number
        }
        Update: {
          created_at?: string
          desconto_percentual?: number | null
          id?: string
          lote_producao_id?: string | null
          margem_calculada?: number | null
          pedido_id?: string
          peso_total_kg?: number | null
          preco_tabela?: number | null
          preco_unitario?: number
          produto_animal_id?: string | null
          produto_id?: string
          quantidade?: number
          unidade_medida?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_animal_id_fkey"
            columns: ["produto_animal_id"]
            isOneToOne: false
            referencedRelation: "produtos_animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens_ovos: {
        Row: {
          created_at: string
          id: string
          pedido_id: string
          preco_unitario: number
          produto_ovo_id: string
          quantidade: number
          quantidade_unidades: number
          valor_total: number
        }
        Insert: {
          created_at?: string
          id?: string
          pedido_id: string
          preco_unitario: number
          produto_ovo_id: string
          quantidade: number
          quantidade_unidades: number
          valor_total: number
        }
        Update: {
          created_at?: string
          id?: string
          pedido_id?: string
          preco_unitario?: number
          produto_ovo_id?: string
          quantidade?: number
          quantidade_unidades?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_ovos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_ovos_produto_ovo_id_fkey"
            columns: ["produto_ovo_id"]
            isOneToOne: false
            referencedRelation: "produtos_ovos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          aprovado_por: string | null
          cliente_id: string
          created_at: string
          data_aprovacao: string | null
          data_emissao: string
          data_entrega_prevista: string | null
          data_faturamento: string | null
          desconto: number | null
          faturado_por: string | null
          forma_pagamento: Database["public"]["Enums"]["forma_pagamento"] | null
          id: string
          integrado_id: string
          numero_nfe: string | null
          numero_pedido: number
          observacoes: string | null
          prazo_pagamento_dias: number | null
          status: Database["public"]["Enums"]["status_pedido"]
          tabela_preco_id: string | null
          updated_at: string
          valor_frete: number | null
          valor_subtotal: number
          valor_total: number
          vendedor_id: string | null
        }
        Insert: {
          aprovado_por?: string | null
          cliente_id: string
          created_at?: string
          data_aprovacao?: string | null
          data_emissao?: string
          data_entrega_prevista?: string | null
          data_faturamento?: string | null
          desconto?: number | null
          faturado_por?: string | null
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          id?: string
          integrado_id: string
          numero_nfe?: string | null
          numero_pedido?: number
          observacoes?: string | null
          prazo_pagamento_dias?: number | null
          status?: Database["public"]["Enums"]["status_pedido"]
          tabela_preco_id?: string | null
          updated_at?: string
          valor_frete?: number | null
          valor_subtotal?: number
          valor_total?: number
          vendedor_id?: string | null
        }
        Update: {
          aprovado_por?: string | null
          cliente_id?: string
          created_at?: string
          data_aprovacao?: string | null
          data_emissao?: string
          data_entrega_prevista?: string | null
          data_faturamento?: string | null
          desconto?: number | null
          faturado_por?: string | null
          forma_pagamento?:
            | Database["public"]["Enums"]["forma_pagamento"]
            | null
          id?: string
          integrado_id?: string
          numero_nfe?: string | null
          numero_pedido?: number
          observacoes?: string | null
          prazo_pagamento_dias?: number | null
          status?: Database["public"]["Enums"]["status_pedido"]
          tabela_preco_id?: string | null
          updated_at?: string
          valor_frete?: number | null
          valor_subtotal?: number
          valor_total?: number
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_faturado_por_fkey"
            columns: ["faturado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_tabela_preco_id_fkey"
            columns: ["tabela_preco_id"]
            isOneToOne: false
            referencedRelation: "tabelas_preco"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pesagem_itens: {
        Row: {
          created_at: string
          id: string
          pesagem_id: string
          peso_bruto_g: number
          peso_liquido_g: number | null
          peso_tara_g: number
          quantidade_aves: number
        }
        Insert: {
          created_at?: string
          id?: string
          pesagem_id: string
          peso_bruto_g: number
          peso_liquido_g?: number | null
          peso_tara_g?: number
          quantidade_aves: number
        }
        Update: {
          created_at?: string
          id?: string
          pesagem_id?: string
          peso_bruto_g?: number
          peso_liquido_g?: number | null
          peso_tara_g?: number
          quantidade_aves?: number
        }
        Relationships: [
          {
            foreignKeyName: "pesagem_itens_pesagem_id_fkey"
            columns: ["pesagem_id"]
            isOneToOne: false
            referencedRelation: "pesagens"
            referencedColumns: ["id"]
          },
        ]
      }
      pesagens: {
        Row: {
          created_at: string
          data_pesagem: string
          id: string
          integrado_id: string
          lote_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_pesagem?: string
          id?: string
          integrado_id: string
          lote_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_pesagem?: string
          id?: string
          integrado_id?: string
          lote_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pesagens_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_contas: {
        Row: {
          ativo: boolean
          codigo: string
          conta_pai_id: string | null
          created_at: string
          descricao: string | null
          id: string
          integrado_id: string
          natureza: Database["public"]["Enums"]["natureza_conta"]
          nivel: number
          nome: string
          tipo: Database["public"]["Enums"]["tipo_plano_conta"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          conta_pai_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id: string
          natureza?: Database["public"]["Enums"]["natureza_conta"]
          nivel?: number
          nome: string
          tipo: Database["public"]["Enums"]["tipo_plano_conta"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          conta_pai_id?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id?: string
          natureza?: Database["public"]["Enums"]["natureza_conta"]
          nivel?: number
          nome?: string
          tipo?: Database["public"]["Enums"]["tipo_plano_conta"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_contas_conta_pai_id_fkey"
            columns: ["conta_pai_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      prazos_pagamento: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          dias_parcelas: number[]
          forma_pagamento_id: string
          id: string
          integrado_id: string
          nome: string
          padrao: boolean | null
          quantidade_parcelas: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          dias_parcelas?: number[]
          forma_pagamento_id: string
          id?: string
          integrado_id: string
          nome: string
          padrao?: boolean | null
          quantidade_parcelas?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          dias_parcelas?: number[]
          forma_pagamento_id?: string
          id?: string
          integrado_id?: string
          nome?: string
          padrao?: boolean | null
          quantidade_parcelas?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prazos_pagamento_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento"
            referencedColumns: ["id"]
          },
        ]
      }
      producao_logs: {
        Row: {
          created_at: string
          dados_adicionais: Json | null
          equipamento_codigo: string | null
          id: string
          insumo_id: string | null
          integrado_id: string | null
          ordem_producao_id: string
          origem: string | null
          quantidade: number | null
          timestamp: string
          tipo_evento: string
        }
        Insert: {
          created_at?: string
          dados_adicionais?: Json | null
          equipamento_codigo?: string | null
          id?: string
          insumo_id?: string | null
          integrado_id?: string | null
          ordem_producao_id: string
          origem?: string | null
          quantidade?: number | null
          timestamp?: string
          tipo_evento: string
        }
        Update: {
          created_at?: string
          dados_adicionais?: Json | null
          equipamento_codigo?: string | null
          id?: string
          insumo_id?: string | null
          integrado_id?: string | null
          ordem_producao_id?: string
          origem?: string | null
          quantidade?: number | null
          timestamp?: string
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "producao_logs_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producao_logs_ordem_producao_id_fkey"
            columns: ["ordem_producao_id"]
            isOneToOne: false
            referencedRelation: "ordens_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      producao_ovos: {
        Row: {
          aves_vivas: number
          created_at: string
          criado_por: string | null
          data_producao: string
          id: string
          integrado_id: string
          lote_id: string
          observacoes: string | null
          ovos_deformados: number | null
          ovos_extra: number | null
          ovos_grande: number | null
          ovos_incubaveis: number | null
          ovos_jumbo: number | null
          ovos_medio: number | null
          ovos_pequenos: number | null
          ovos_quebrados: number | null
          ovos_sujos: number | null
          ovos_totais: number
          ovos_trincados: number | null
          percentual_postura: number | null
          peso_medio_ovo_g: number | null
          updated_at: string
        }
        Insert: {
          aves_vivas: number
          created_at?: string
          criado_por?: string | null
          data_producao?: string
          id?: string
          integrado_id: string
          lote_id: string
          observacoes?: string | null
          ovos_deformados?: number | null
          ovos_extra?: number | null
          ovos_grande?: number | null
          ovos_incubaveis?: number | null
          ovos_jumbo?: number | null
          ovos_medio?: number | null
          ovos_pequenos?: number | null
          ovos_quebrados?: number | null
          ovos_sujos?: number | null
          ovos_totais?: number
          ovos_trincados?: number | null
          percentual_postura?: number | null
          peso_medio_ovo_g?: number | null
          updated_at?: string
        }
        Update: {
          aves_vivas?: number
          created_at?: string
          criado_por?: string | null
          data_producao?: string
          id?: string
          integrado_id?: string
          lote_id?: string
          observacoes?: string | null
          ovos_deformados?: number | null
          ovos_extra?: number | null
          ovos_grande?: number | null
          ovos_incubaveis?: number | null
          ovos_jumbo?: number | null
          ovos_medio?: number | null
          ovos_pequenos?: number | null
          ovos_quebrados?: number | null
          ovos_sujos?: number | null
          ovos_totais?: number
          ovos_trincados?: number | null
          percentual_postura?: number | null
          peso_medio_ovo_g?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producao_ovos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_formulacao: {
        Row: {
          created_at: string
          id: string
          insumo_id: string
          integrado_id: string
          produto_id: string
          quantidade: number
          unidade_medida: string
        }
        Insert: {
          created_at?: string
          id?: string
          insumo_id: string
          integrado_id: string
          produto_id: string
          quantidade: number
          unidade_medida?: string
        }
        Update: {
          created_at?: string
          id?: string
          insumo_id?: string
          integrado_id?: string
          produto_id?: string
          quantidade?: number
          unidade_medida?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_formulacao_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_formulacao_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_fornecedor: {
        Row: {
          ativo: boolean | null
          codigo_produto_fornecedor: string | null
          created_at: string
          fornecedor_principal: boolean | null
          id: string
          integrado_id: string
          parceiro_id: string
          prazo_entrega_dias: number | null
          preco_compra: number | null
          produto_id: string
          quantidade_minima: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          codigo_produto_fornecedor?: string | null
          created_at?: string
          fornecedor_principal?: boolean | null
          id?: string
          integrado_id: string
          parceiro_id: string
          prazo_entrega_dias?: number | null
          preco_compra?: number | null
          produto_id: string
          quantidade_minima?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          codigo_produto_fornecedor?: string | null
          created_at?: string
          fornecedor_principal?: boolean | null
          id?: string
          integrado_id?: string
          parceiro_id?: string
          prazo_entrega_dias?: number | null
          preco_compra?: number | null
          produto_id?: string
          quantidade_minima?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_fornecedor_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_fornecedor_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          atualizado_por: string | null
          categoria_id: string | null
          cest: string | null
          codigo_barras_ean: string | null
          created_at: string
          criado_por: string | null
          custo_medio: number
          custo_unitario: number
          descricao: string | null
          embalagem_primaria: string | null
          embalagem_quantidade: number | null
          embalagem_secundaria: string | null
          embalagem_tipo: string | null
          estoque_atual: number
          estoque_minimo: number
          fase_animal_id: string | null
          fator_conversao: number | null
          grupo_animal_id: string | null
          grupo_produto_id: string | null
          id: string
          integrado_id: string
          localizacao_estoque: string | null
          marca: string | null
          ncm: string | null
          nome: string
          origem_mercadoria: string | null
          preco_venda: number
          requer_quarentena: boolean | null
          sku: string
          status_comercial: string
          unidade_compra: string | null
          unidade_medida: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          atualizado_por?: string | null
          categoria_id?: string | null
          cest?: string | null
          codigo_barras_ean?: string | null
          created_at?: string
          criado_por?: string | null
          custo_medio?: number
          custo_unitario?: number
          descricao?: string | null
          embalagem_primaria?: string | null
          embalagem_quantidade?: number | null
          embalagem_secundaria?: string | null
          embalagem_tipo?: string | null
          estoque_atual?: number
          estoque_minimo?: number
          fase_animal_id?: string | null
          fator_conversao?: number | null
          grupo_animal_id?: string | null
          grupo_produto_id?: string | null
          id?: string
          integrado_id: string
          localizacao_estoque?: string | null
          marca?: string | null
          ncm?: string | null
          nome: string
          origem_mercadoria?: string | null
          preco_venda?: number
          requer_quarentena?: boolean | null
          sku: string
          status_comercial?: string
          unidade_compra?: string | null
          unidade_medida?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          atualizado_por?: string | null
          categoria_id?: string | null
          cest?: string | null
          codigo_barras_ean?: string | null
          created_at?: string
          criado_por?: string | null
          custo_medio?: number
          custo_unitario?: number
          descricao?: string | null
          embalagem_primaria?: string | null
          embalagem_quantidade?: number | null
          embalagem_secundaria?: string | null
          embalagem_tipo?: string | null
          estoque_atual?: number
          estoque_minimo?: number
          fase_animal_id?: string | null
          fator_conversao?: number | null
          grupo_animal_id?: string | null
          grupo_produto_id?: string | null
          id?: string
          integrado_id?: string
          localizacao_estoque?: string | null
          marca?: string | null
          ncm?: string | null
          nome?: string
          origem_mercadoria?: string | null
          preco_venda?: number
          requer_quarentena?: boolean | null
          sku?: string
          status_comercial?: string
          unidade_compra?: string | null
          unidade_medida?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_fase_animal_id_fkey"
            columns: ["fase_animal_id"]
            isOneToOne: false
            referencedRelation: "fases_animal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_grupo_animal_id_fkey"
            columns: ["grupo_animal_id"]
            isOneToOne: false
            referencedRelation: "grupos_animal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_grupo_produto_id_fkey"
            columns: ["grupo_produto_id"]
            isOneToOne: false
            referencedRelation: "grupos_produto"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_animais: {
        Row: {
          ativo: boolean
          cest: string | null
          created_at: string
          descricao: string | null
          grupo_animal_id: string | null
          id: string
          integrado_id: string
          ncm: string | null
          nome: string
          peso_medio_referencia: number | null
          preco_venda_base: number | null
          sku: string
          unidade_venda: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cest?: string | null
          created_at?: string
          descricao?: string | null
          grupo_animal_id?: string | null
          id?: string
          integrado_id: string
          ncm?: string | null
          nome: string
          peso_medio_referencia?: number | null
          preco_venda_base?: number | null
          sku: string
          unidade_venda?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cest?: string | null
          created_at?: string
          descricao?: string | null
          grupo_animal_id?: string | null
          id?: string
          integrado_id?: string
          ncm?: string | null
          nome?: string
          peso_medio_referencia?: number | null
          preco_venda_base?: number | null
          sku?: string
          unidade_venda?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_animais_grupo_animal_id_fkey"
            columns: ["grupo_animal_id"]
            isOneToOne: false
            referencedRelation: "grupos_animal"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos_ovos: {
        Row: {
          ativo: boolean
          classificacao_peso: Database["public"]["Enums"]["classificacao_peso_ovo"]
          codigo: string
          created_at: string
          descricao: string | null
          estoque_minimo: number | null
          fator_conversao: number
          id: string
          integrado_id: string
          margem_minima: number | null
          nome: string
          preco_venda: number | null
          tipo_ovo: Database["public"]["Enums"]["tipo_ovo"]
          unidade_venda: Database["public"]["Enums"]["unidade_venda_ovo"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          classificacao_peso: Database["public"]["Enums"]["classificacao_peso_ovo"]
          codigo: string
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number | null
          fator_conversao?: number
          id?: string
          integrado_id: string
          margem_minima?: number | null
          nome: string
          preco_venda?: number | null
          tipo_ovo: Database["public"]["Enums"]["tipo_ovo"]
          unidade_venda?: Database["public"]["Enums"]["unidade_venda_ovo"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          classificacao_peso?: Database["public"]["Enums"]["classificacao_peso_ovo"]
          codigo?: string
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number | null
          fator_conversao?: number
          id?: string
          integrado_id?: string
          margem_minima?: number | null
          nome?: string
          preco_venda?: number | null
          tipo_ovo?: Database["public"]["Enums"]["tipo_ovo"]
          unidade_venda?: Database["public"]["Enums"]["unidade_venda_ovo"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          integrado_id: string | null
          is_demo: boolean | null
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          integrado_id?: string | null
          is_demo?: boolean | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          integrado_id?: string | null
          is_demo?: boolean | null
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recebimento_itens: {
        Row: {
          codigo_produto_nfe: string | null
          created_at: string
          data_validade: string | null
          descricao_produto_nfe: string | null
          fator_conversao: number | null
          id: string
          lote_fornecedor: string | null
          ordem_compra_item_id: string | null
          preco_nfe: number | null
          preco_oc: number | null
          produto_id: string
          quantidade_estoque: number | null
          quantidade_fisica: number | null
          quantidade_nfe: number | null
          quantidade_oc: number | null
          recebimento_id: string
          unidade_compra: string | null
          unidade_nfe: string | null
        }
        Insert: {
          codigo_produto_nfe?: string | null
          created_at?: string
          data_validade?: string | null
          descricao_produto_nfe?: string | null
          fator_conversao?: number | null
          id?: string
          lote_fornecedor?: string | null
          ordem_compra_item_id?: string | null
          preco_nfe?: number | null
          preco_oc?: number | null
          produto_id: string
          quantidade_estoque?: number | null
          quantidade_fisica?: number | null
          quantidade_nfe?: number | null
          quantidade_oc?: number | null
          recebimento_id: string
          unidade_compra?: string | null
          unidade_nfe?: string | null
        }
        Update: {
          codigo_produto_nfe?: string | null
          created_at?: string
          data_validade?: string | null
          descricao_produto_nfe?: string | null
          fator_conversao?: number | null
          id?: string
          lote_fornecedor?: string | null
          ordem_compra_item_id?: string | null
          preco_nfe?: number | null
          preco_oc?: number | null
          produto_id?: string
          quantidade_estoque?: number | null
          quantidade_fisica?: number | null
          quantidade_nfe?: number | null
          quantidade_oc?: number | null
          recebimento_id?: string
          unidade_compra?: string | null
          unidade_nfe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recebimento_itens_ordem_compra_item_id_fkey"
            columns: ["ordem_compra_item_id"]
            isOneToOne: false
            referencedRelation: "ordens_compra_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimento_itens_recebimento_id_fkey"
            columns: ["recebimento_id"]
            isOneToOne: false
            referencedRelation: "recebimentos_mercadoria"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimento_lotes: {
        Row: {
          aspecto_pintinhos: string
          created_at: string
          id: string
          integrado_id: string
          lote_id: string
          motivo_eliminacao: string | null
          observacoes: string | null
          quantidade_caixas_conferidas: number
          quantidade_eliminados: number
          quantidade_eliminados_classificacao: number
          quantidade_eliminados_locomotor: number
          quantidade_mortos: number
          quantidade_pintinhos_caixa: number
          updated_at: string
        }
        Insert: {
          aspecto_pintinhos: string
          created_at?: string
          id?: string
          integrado_id: string
          lote_id: string
          motivo_eliminacao?: string | null
          observacoes?: string | null
          quantidade_caixas_conferidas?: number
          quantidade_eliminados?: number
          quantidade_eliminados_classificacao?: number
          quantidade_eliminados_locomotor?: number
          quantidade_mortos?: number
          quantidade_pintinhos_caixa?: number
          updated_at?: string
        }
        Update: {
          aspecto_pintinhos?: string
          created_at?: string
          id?: string
          integrado_id?: string
          lote_id?: string
          motivo_eliminacao?: string | null
          observacoes?: string | null
          quantidade_caixas_conferidas?: number
          quantidade_eliminados?: number
          quantidade_eliminados_classificacao?: number
          quantidade_eliminados_locomotor?: number
          quantidade_mortos?: number
          quantidade_pintinhos_caixa?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recebimento_lotes_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimentos_mercadoria: {
        Row: {
          autorizado_por: string | null
          chave_nfe: string | null
          cnpj_fornecedor: string | null
          condicao_pagamento_nfe: string | null
          created_at: string
          data_autorizacao: string | null
          data_emissao_nfe: string | null
          data_liberacao: string | null
          data_recebimento: string
          id: string
          integrado_id: string
          justificativa_autorizacao: string | null
          liberado_por: string | null
          numero_nfe: string | null
          observacoes: string | null
          ordem_compra_id: string | null
          razao_social_fornecedor: string | null
          recebido_por: string | null
          serie_nfe: string | null
          status: Database["public"]["Enums"]["recebimento_status"]
          updated_at: string
          valor_desconto_nfe: number | null
          valor_frete_nfe: number | null
          valor_nfe: number | null
        }
        Insert: {
          autorizado_por?: string | null
          chave_nfe?: string | null
          cnpj_fornecedor?: string | null
          condicao_pagamento_nfe?: string | null
          created_at?: string
          data_autorizacao?: string | null
          data_emissao_nfe?: string | null
          data_liberacao?: string | null
          data_recebimento?: string
          id?: string
          integrado_id: string
          justificativa_autorizacao?: string | null
          liberado_por?: string | null
          numero_nfe?: string | null
          observacoes?: string | null
          ordem_compra_id?: string | null
          razao_social_fornecedor?: string | null
          recebido_por?: string | null
          serie_nfe?: string | null
          status?: Database["public"]["Enums"]["recebimento_status"]
          updated_at?: string
          valor_desconto_nfe?: number | null
          valor_frete_nfe?: number | null
          valor_nfe?: number | null
        }
        Update: {
          autorizado_por?: string | null
          chave_nfe?: string | null
          cnpj_fornecedor?: string | null
          condicao_pagamento_nfe?: string | null
          created_at?: string
          data_autorizacao?: string | null
          data_emissao_nfe?: string | null
          data_liberacao?: string | null
          data_recebimento?: string
          id?: string
          integrado_id?: string
          justificativa_autorizacao?: string | null
          liberado_por?: string | null
          numero_nfe?: string | null
          observacoes?: string | null
          ordem_compra_id?: string | null
          razao_social_fornecedor?: string | null
          recebido_por?: string | null
          serie_nfe?: string | null
          status?: Database["public"]["Enums"]["recebimento_status"]
          updated_at?: string
          valor_desconto_nfe?: number | null
          valor_frete_nfe?: number | null
          valor_nfe?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recebimentos_mercadoria_ordem_compra_id_fkey"
            columns: ["ordem_compra_id"]
            isOneToOne: false
            referencedRelation: "ordens_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      reserva_estoque_ovos: {
        Row: {
          created_at: string
          data_producao: string
          data_validade: string
          estoque_ovo_id: string
          id: string
          lote_interno: string
          pedido_item_ovo_id: string
          quantidade_reservada: number
        }
        Insert: {
          created_at?: string
          data_producao: string
          data_validade: string
          estoque_ovo_id: string
          id?: string
          lote_interno: string
          pedido_item_ovo_id: string
          quantidade_reservada: number
        }
        Update: {
          created_at?: string
          data_producao?: string
          data_validade?: string
          estoque_ovo_id?: string
          id?: string
          lote_interno?: string
          pedido_item_ovo_id?: string
          quantidade_reservada?: number
        }
        Relationships: [
          {
            foreignKeyName: "reserva_estoque_ovos_estoque_ovo_id_fkey"
            columns: ["estoque_ovo_id"]
            isOneToOne: false
            referencedRelation: "estoque_ovos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reserva_estoque_ovos_pedido_item_ovo_id_fkey"
            columns: ["pedido_item_ovo_id"]
            isOneToOne: false
            referencedRelation: "pedido_itens_ovos"
            referencedColumns: ["id"]
          },
        ]
      }
      role_modulos: {
        Row: {
          created_at: string | null
          id: string
          modulo_id: string
          nivel_acesso: Database["public"]["Enums"]["nivel_acesso"] | null
          permitido: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          modulo_id: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso"] | null
          permitido?: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          modulo_id?: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso"] | null
          permitido?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_modulos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      separacao_pedidos: {
        Row: {
          created_at: string
          data_separacao: string
          id: string
          lote_producao_id: string | null
          pedido_id: string
          pedido_item_id: string
          produto_id: string
          quantidade_separada: number
          separado_por: string | null
        }
        Insert: {
          created_at?: string
          data_separacao?: string
          id?: string
          lote_producao_id?: string | null
          pedido_id: string
          pedido_item_id: string
          produto_id: string
          quantidade_separada: number
          separado_por?: string | null
        }
        Update: {
          created_at?: string
          data_separacao?: string
          id?: string
          lote_producao_id?: string | null
          pedido_id?: string
          pedido_item_id?: string
          produto_id?: string
          quantidade_separada?: number
          separado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "separacao_pedidos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "separacao_pedidos_pedido_item_id_fkey"
            columns: ["pedido_item_id"]
            isOneToOne: false
            referencedRelation: "pedido_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "separacao_pedidos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "separacao_pedidos_separado_por_fkey"
            columns: ["separado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      silos: {
        Row: {
          ativo: boolean
          capacidade_toneladas: number | null
          capacidade_volume_m3: number
          created_at: string
          diametro_m: number
          fator_tonelada_m3: number
          id: string
          integrado_id: string
          marca: string | null
          nome: string
          numero_aneis: number
          numero_pernas: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          capacidade_toneladas?: number | null
          capacidade_volume_m3: number
          created_at?: string
          diametro_m: number
          fator_tonelada_m3?: number
          id?: string
          integrado_id: string
          marca?: string | null
          nome: string
          numero_aneis?: number
          numero_pernas?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          capacidade_toneladas?: number | null
          capacidade_volume_m3?: number
          created_at?: string
          diametro_m?: number
          fator_tonelada_m3?: number
          id?: string
          integrado_id?: string
          marca?: string | null
          nome?: string
          numero_aneis?: number
          numero_pernas?: number
          updated_at?: string
        }
        Relationships: []
      }
      silos_modelo: {
        Row: {
          capacidade_ton: number
          created_at: string
          diametro_m: number
          id: string
          numero_aneis: number
          numero_pernas: number
          volume_m3: number
        }
        Insert: {
          capacidade_ton: number
          created_at?: string
          diametro_m: number
          id?: string
          numero_aneis: number
          numero_pernas: number
          volume_m3: number
        }
        Update: {
          capacidade_ton?: number
          created_at?: string
          diametro_m?: number
          id?: string
          numero_aneis?: number
          numero_pernas?: number
          volume_m3?: number
        }
        Relationships: []
      }
      solicitacoes_racao: {
        Row: {
          confirmado_por: string | null
          created_at: string
          data_confirmacao: string | null
          data_devolucao: string | null
          data_envio: string | null
          data_prevista_entrega: string | null
          data_recebimento: string | null
          data_solicitacao: string
          devolucao_confirmada: boolean | null
          divergencia_kg: number | null
          id: string
          integrado_id: string
          lote_id: string
          nivel_aneis: number | null
          nivel_estimado_kg: number | null
          nivel_funil: number | null
          observacoes: string | null
          observacoes_envio: string | null
          quantidade_devolvida_kg: number | null
          quantidade_recebida_kg: number | null
          quantidade_solicitada_kg: number
          solicitado_por: string | null
          status: string
          tipo_racao: string
          updated_at: string
        }
        Insert: {
          confirmado_por?: string | null
          created_at?: string
          data_confirmacao?: string | null
          data_devolucao?: string | null
          data_envio?: string | null
          data_prevista_entrega?: string | null
          data_recebimento?: string | null
          data_solicitacao?: string
          devolucao_confirmada?: boolean | null
          divergencia_kg?: number | null
          id?: string
          integrado_id: string
          lote_id: string
          nivel_aneis?: number | null
          nivel_estimado_kg?: number | null
          nivel_funil?: number | null
          observacoes?: string | null
          observacoes_envio?: string | null
          quantidade_devolvida_kg?: number | null
          quantidade_recebida_kg?: number | null
          quantidade_solicitada_kg: number
          solicitado_por?: string | null
          status?: string
          tipo_racao: string
          updated_at?: string
        }
        Update: {
          confirmado_por?: string | null
          created_at?: string
          data_confirmacao?: string | null
          data_devolucao?: string | null
          data_envio?: string | null
          data_prevista_entrega?: string | null
          data_recebimento?: string | null
          data_solicitacao?: string
          devolucao_confirmada?: boolean | null
          divergencia_kg?: number | null
          id?: string
          integrado_id?: string
          lote_id?: string
          nivel_aneis?: number | null
          nivel_estimado_kg?: number | null
          nivel_funil?: number | null
          observacoes?: string | null
          observacoes_envio?: string | null
          quantidade_devolvida_kg?: number | null
          quantidade_recebida_kg?: number | null
          quantidade_solicitada_kg?: number
          solicitado_por?: string | null
          status?: string
          tipo_racao?: string
          updated_at?: string
        }
        Relationships: []
      }
      tabelas_preco: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          integrado_id: string
          margem_minima_percentual: number
          nome: string
          padrao: boolean
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id: string
          margem_minima_percentual?: number
          nome: string
          padrao?: boolean
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id?: string
          margem_minima_percentual?: number
          nome?: string
          padrao?: boolean
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      tabelas_preco_itens: {
        Row: {
          created_at: string
          desconto_maximo_percentual: number
          id: string
          preco_unitario: number
          produto_animal_id: string | null
          produto_id: string | null
          tabela_preco_id: string
        }
        Insert: {
          created_at?: string
          desconto_maximo_percentual?: number
          id?: string
          preco_unitario?: number
          produto_animal_id?: string | null
          produto_id?: string | null
          tabela_preco_id: string
        }
        Update: {
          created_at?: string
          desconto_maximo_percentual?: number
          id?: string
          preco_unitario?: number
          produto_animal_id?: string | null
          produto_id?: string | null
          tabela_preco_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tabelas_preco_itens_produto_animal_id_fkey"
            columns: ["produto_animal_id"]
            isOneToOne: false
            referencedRelation: "produtos_animais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tabelas_preco_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tabelas_preco_itens_tabela_preco_id_fkey"
            columns: ["tabela_preco_id"]
            isOneToOne: false
            referencedRelation: "tabelas_preco"
            referencedColumns: ["id"]
          },
        ]
      }
      taxas_bancarias: {
        Row: {
          ativo: boolean
          conta_bancaria_id: string | null
          created_at: string
          id: string
          integrado_id: string
          nome: string
          plano_conta_id: string | null
          tipo: Database["public"]["Enums"]["tipo_taxa_bancaria"]
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          conta_bancaria_id?: string | null
          created_at?: string
          id?: string
          integrado_id: string
          nome: string
          plano_conta_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_taxa_bancaria"]
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          conta_bancaria_id?: string | null
          created_at?: string
          id?: string
          integrado_id?: string
          nome?: string
          plano_conta_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_taxa_bancaria"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "taxas_bancarias_conta_bancaria_id_fkey"
            columns: ["conta_bancaria_id"]
            isOneToOne: false
            referencedRelation: "contas_bancarias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxas_bancarias_plano_conta_id_fkey"
            columns: ["plano_conta_id"]
            isOneToOne: false
            referencedRelation: "plano_contas"
            referencedColumns: ["id"]
          },
        ]
      }
      tratamentos_lote: {
        Row: {
          aplicacao_confirmada: boolean | null
          aplicacao_confirmada_em: string | null
          aplicacao_confirmada_por: string | null
          carencia_dias: number
          created_at: string
          criado_por: string
          custo_total: number | null
          data_fim: string | null
          data_inicio: string
          data_liberacao_abate: string | null
          dosagem: string
          id: string
          integrado_id: string
          lote_id: string
          motivo: string | null
          observacoes: string | null
          produto_id: string
          quantidade_utilizada: number
          status: string
          unidade_medida: string
          updated_at: string
          via_administracao: string
        }
        Insert: {
          aplicacao_confirmada?: boolean | null
          aplicacao_confirmada_em?: string | null
          aplicacao_confirmada_por?: string | null
          carencia_dias?: number
          created_at?: string
          criado_por: string
          custo_total?: number | null
          data_fim?: string | null
          data_inicio?: string
          data_liberacao_abate?: string | null
          dosagem: string
          id?: string
          integrado_id: string
          lote_id: string
          motivo?: string | null
          observacoes?: string | null
          produto_id: string
          quantidade_utilizada?: number
          status?: string
          unidade_medida?: string
          updated_at?: string
          via_administracao?: string
        }
        Update: {
          aplicacao_confirmada?: boolean | null
          aplicacao_confirmada_em?: string | null
          aplicacao_confirmada_por?: string | null
          carencia_dias?: number
          created_at?: string
          criado_por?: string
          custo_total?: number | null
          data_fim?: string | null
          data_inicio?: string
          data_liberacao_abate?: string | null
          dosagem?: string
          id?: string
          integrado_id?: string
          lote_id?: string
          motivo?: string | null
          observacoes?: string | null
          produto_id?: string
          quantidade_utilizada?: number
          status?: string
          unidade_medida?: string
          updated_at?: string
          via_administracao?: string
        }
        Relationships: [
          {
            foreignKeyName: "tratamentos_lote_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tratamentos_lote_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_modulos: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          integrado_id: string
          modulo_id: string
          nivel_acesso: Database["public"]["Enums"]["nivel_acesso"] | null
          permitido: boolean
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          integrado_id: string
          modulo_id: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso"] | null
          permitido: boolean
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          integrado_id?: string
          modulo_id?: string
          nivel_acesso?: Database["public"]["Enums"]["nivel_acesso"] | null
          permitido?: boolean
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_modulos_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calcular_fase_postura: {
        Args: { semanas_vida: number }
        Returns: Database["public"]["Enums"]["fase_postura"]
      }
      can_modify_data: { Args: never; Returns: boolean }
      galpao_has_active_lote: { Args: { _galpao_id: string }; Returns: boolean }
      gerar_lote_interno_ovos: {
        Args: { p_integrado_id: string }
        Returns: string
      }
      get_criadores: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      get_my_integrado_id: { Args: never; Returns: string }
      get_user_accessible_modules: {
        Args: { _user_id: string }
        Returns: {
          codigo: string
          fonte_permissao: string
          icone: string
          nivel_acesso: string
          nome: string
          ordem: number
          rota: string
        }[]
      }
      get_veterinarios: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_demo_data: {
        Args: { p_integrado_id: string; p_user_id: string }
        Returns: undefined
      }
      initialize_demo_lotes: {
        Args: { p_integrado_id: string }
        Returns: undefined
      }
      is_demo_user: { Args: never; Returns: boolean }
      reservar_estoque_ovos_fifo: {
        Args: {
          p_classificacao: Database["public"]["Enums"]["classificacao_peso_ovo"]
          p_integrado_id: string
          p_pedido_item_ovo_id: string
          p_quantidade_unidades: number
          p_tipo_ovo: Database["public"]["Enums"]["tipo_ovo"]
        }
        Returns: {
          data_producao: string
          data_validade: string
          estoque_id: string
          lote_interno: string
          quantidade_reservada: number
        }[]
      }
      same_organization: { Args: { _user_id: string }; Returns: boolean }
      user_can_access_module: {
        Args: {
          _module_code: string
          _required_level?: Database["public"]["Enums"]["nivel_acesso"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "integrado"
        | "veterinario"
        | "tecnico"
        | "comprador"
        | "conferente"
        | "criador"
      classificacao_ovo: "medio" | "grande" | "extra" | "jumbo"
      classificacao_peso_ovo: "medio" | "grande" | "extra" | "jumbo"
      conta_pagar_status: "previsto" | "pendente" | "pago" | "cancelado"
      conta_receber_status:
        | "previsao"
        | "pendente"
        | "recebido"
        | "parcial"
        | "cancelado"
      divergencia_status:
        | "aberta"
        | "em_negociacao"
        | "resolvida"
        | "aceita_com_autorizacao"
      divergencia_tipo:
        | "quantidade"
        | "preco"
        | "condicao_pagamento"
        | "produto_nao_previsto"
      fase_postura: "cria" | "recria" | "producao"
      forma_pagamento:
        | "boleto"
        | "pix"
        | "transferencia"
        | "dinheiro"
        | "cheque"
        | "cartao"
      linhagem_aves: "cobb_500" | "ross_308" | "hubbard"
      linhagem_postura:
        | "lohmann_brown_lite"
        | "lohmann_lsl_lite"
        | "hy_line_brown"
        | "hy_line_w36"
        | "isa_brown"
        | "novogen_brown"
        | "dekalb_white"
      lote_status: "previsao" | "saiu_para_entrega" | "alojado" | "fechado"
      motivo_mortalidade: "natural" | "eliminado"
      natureza_conta: "devedora" | "credora"
      nivel_acesso: "view" | "edit" | "full"
      observacao_prioridade: "alta" | "media" | "baixa"
      observacao_tipo: "observacao" | "orientacao"
      ordem_compra_status:
        | "rascunho"
        | "pendente"
        | "aprovada"
        | "parcial_recebida"
        | "recebida"
        | "cancelada"
        | "refaturamento"
      recebimento_status:
        | "em_conferencia"
        | "divergente"
        | "aguardando_autorizacao"
        | "finalizado"
        | "cancelado"
        | "divergente_preco"
      sexo_ave: "macho" | "femea" | "misto"
      status_pedido:
        | "rascunho"
        | "pendente_aprovacao"
        | "aprovado"
        | "em_separacao"
        | "faturado"
        | "cancelado"
      status_quarentena: "quarentena" | "liberado" | "rejeitado"
      submotivo_eliminacao: "problema_locomotor" | "debilitado" | "deficiente"
      tipo_bebedouro: "niple" | "tacas"
      tipo_cadastro: "cliente" | "fornecedor" | "ambos"
      tipo_centro_custo: "lote" | "nucleo" | "geral" | "projeto"
      tipo_comedouro: "manual" | "automatico"
      tipo_conta_bancaria: "corrente" | "poupanca" | "investimento"
      tipo_ovo: "branco" | "castanho" | "vermelho" | "caipira"
      tipo_pessoa: "pf" | "pj" | "produtor_rural"
      tipo_plano_conta: "receita" | "custo" | "despesa" | "investimento"
      tipo_pressao: "positiva" | "negativa" | "darkhouse"
      tipo_producao: "corte" | "postura"
      tipo_taxa_bancaria: "fixo" | "percentual"
      unidade_venda_ovo:
        | "UN"
        | "DZ"
        | "CX_15"
        | "CX_30"
        | "BDJ_30"
        | "BDJ_60"
        | "BDJ_180"
        | "BDJ_360"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "integrado",
        "veterinario",
        "tecnico",
        "comprador",
        "conferente",
        "criador",
      ],
      classificacao_ovo: ["medio", "grande", "extra", "jumbo"],
      classificacao_peso_ovo: ["medio", "grande", "extra", "jumbo"],
      conta_pagar_status: ["previsto", "pendente", "pago", "cancelado"],
      conta_receber_status: [
        "previsao",
        "pendente",
        "recebido",
        "parcial",
        "cancelado",
      ],
      divergencia_status: [
        "aberta",
        "em_negociacao",
        "resolvida",
        "aceita_com_autorizacao",
      ],
      divergencia_tipo: [
        "quantidade",
        "preco",
        "condicao_pagamento",
        "produto_nao_previsto",
      ],
      fase_postura: ["cria", "recria", "producao"],
      forma_pagamento: [
        "boleto",
        "pix",
        "transferencia",
        "dinheiro",
        "cheque",
        "cartao",
      ],
      linhagem_aves: ["cobb_500", "ross_308", "hubbard"],
      linhagem_postura: [
        "lohmann_brown_lite",
        "lohmann_lsl_lite",
        "hy_line_brown",
        "hy_line_w36",
        "isa_brown",
        "novogen_brown",
        "dekalb_white",
      ],
      lote_status: ["previsao", "saiu_para_entrega", "alojado", "fechado"],
      motivo_mortalidade: ["natural", "eliminado"],
      natureza_conta: ["devedora", "credora"],
      nivel_acesso: ["view", "edit", "full"],
      observacao_prioridade: ["alta", "media", "baixa"],
      observacao_tipo: ["observacao", "orientacao"],
      ordem_compra_status: [
        "rascunho",
        "pendente",
        "aprovada",
        "parcial_recebida",
        "recebida",
        "cancelada",
        "refaturamento",
      ],
      recebimento_status: [
        "em_conferencia",
        "divergente",
        "aguardando_autorizacao",
        "finalizado",
        "cancelado",
        "divergente_preco",
      ],
      sexo_ave: ["macho", "femea", "misto"],
      status_pedido: [
        "rascunho",
        "pendente_aprovacao",
        "aprovado",
        "em_separacao",
        "faturado",
        "cancelado",
      ],
      status_quarentena: ["quarentena", "liberado", "rejeitado"],
      submotivo_eliminacao: ["problema_locomotor", "debilitado", "deficiente"],
      tipo_bebedouro: ["niple", "tacas"],
      tipo_cadastro: ["cliente", "fornecedor", "ambos"],
      tipo_centro_custo: ["lote", "nucleo", "geral", "projeto"],
      tipo_comedouro: ["manual", "automatico"],
      tipo_conta_bancaria: ["corrente", "poupanca", "investimento"],
      tipo_ovo: ["branco", "castanho", "vermelho", "caipira"],
      tipo_pessoa: ["pf", "pj", "produtor_rural"],
      tipo_plano_conta: ["receita", "custo", "despesa", "investimento"],
      tipo_pressao: ["positiva", "negativa", "darkhouse"],
      tipo_producao: ["corte", "postura"],
      tipo_taxa_bancaria: ["fixo", "percentual"],
      unidade_venda_ovo: [
        "UN",
        "DZ",
        "CX_15",
        "CX_30",
        "BDJ_30",
        "BDJ_60",
        "BDJ_180",
        "BDJ_360",
      ],
    },
  },
} as const
