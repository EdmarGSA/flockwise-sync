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
      contas_pagar: {
        Row: {
          categoria: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          id: string
          integrado_id: string
          observacoes: string | null
          ordem_compra_id: string | null
          parceiro_id: string | null
          status: Database["public"]["Enums"]["conta_pagar_status"]
          updated_at: string
          valor: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          id?: string
          integrado_id: string
          observacoes?: string | null
          ordem_compra_id?: string | null
          parceiro_id?: string | null
          status?: Database["public"]["Enums"]["conta_pagar_status"]
          updated_at?: string
          valor: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          id?: string
          integrado_id?: string
          observacoes?: string | null
          ordem_compra_id?: string | null
          parceiro_id?: string | null
          status?: Database["public"]["Enums"]["conta_pagar_status"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
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
        ]
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
      lotes: {
        Row: {
          created_at: string
          data_alojamento: string | null
          data_fechamento: string | null
          data_prevista_alojamento: string
          galpao_id: string
          id: string
          integrado_id: string
          linhagem: Database["public"]["Enums"]["linhagem_aves"]
          nucleo_id: string
          observacoes: string | null
          peso_medio_pintinhos: number | null
          quantidade_aves: number
          sexo: Database["public"]["Enums"]["sexo_ave"]
          status: Database["public"]["Enums"]["lote_status"]
          updated_at: string
          veterinario_id: string | null
        }
        Insert: {
          created_at?: string
          data_alojamento?: string | null
          data_fechamento?: string | null
          data_prevista_alojamento: string
          galpao_id: string
          id?: string
          integrado_id: string
          linhagem: Database["public"]["Enums"]["linhagem_aves"]
          nucleo_id: string
          observacoes?: string | null
          peso_medio_pintinhos?: number | null
          quantidade_aves: number
          sexo?: Database["public"]["Enums"]["sexo_ave"]
          status?: Database["public"]["Enums"]["lote_status"]
          updated_at?: string
          veterinario_id?: string | null
        }
        Update: {
          created_at?: string
          data_alojamento?: string | null
          data_fechamento?: string | null
          data_prevista_alojamento?: string
          galpao_id?: string
          id?: string
          integrado_id?: string
          linhagem?: Database["public"]["Enums"]["linhagem_aves"]
          nucleo_id?: string
          observacoes?: string | null
          peso_medio_pintinhos?: number | null
          quantidade_aves?: number
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
          mortalidade_14_dias: number
          mortalidade_21_dias: number
          mortalidade_28_dias: number
          mortalidade_35_dias: number
          mortalidade_42_dias: number
          mortalidade_7_dias: number
          mortalidade_acima_42_dias: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          integrado_id: string
          mortalidade_14_dias?: number
          mortalidade_21_dias?: number
          mortalidade_28_dias?: number
          mortalidade_35_dias?: number
          mortalidade_42_dias?: number
          mortalidade_7_dias?: number
          mortalidade_acima_42_dias?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          integrado_id?: string
          mortalidade_14_dias?: number
          mortalidade_21_dias?: number
          mortalidade_28_dias?: number
          mortalidade_35_dias?: number
          mortalidade_42_dias?: number
          mortalidade_7_dias?: number
          mortalidade_acima_42_dias?: number
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
          id: string
          integrado_id: string
          numero_op: number
          nutricao_id: string | null
          observacoes: string | null
          produto_id: string
          quantidade_planejada: number
          quantidade_produzida: number | null
          status: string
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
          id?: string
          integrado_id: string
          numero_op?: number
          nutricao_id?: string | null
          observacoes?: string | null
          produto_id: string
          quantidade_planejada: number
          quantidade_produzida?: number | null
          status?: string
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
          id?: string
          integrado_id?: string
          numero_op?: number
          nutricao_id?: string | null
          observacoes?: string | null
          produto_id?: string
          quantidade_planejada?: number
          quantidade_produzida?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
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
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
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
          id: string
          integrado_id: string
          lote_id: string
          observacoes: string | null
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
          id?: string
          integrado_id: string
          lote_id: string
          observacoes?: string | null
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
          id?: string
          integrado_id?: string
          lote_id?: string
          observacoes?: string | null
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
      galpao_has_active_lote: { Args: { _galpao_id: string }; Returns: boolean }
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
    }
    Enums: {
      app_role:
        | "admin"
        | "integrado"
        | "veterinario"
        | "tecnico"
        | "comprador"
        | "conferente"
      conta_pagar_status: "previsto" | "pendente" | "pago" | "cancelado"
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
      linhagem_aves: "cobb_500" | "ross_308" | "hubbard"
      lote_status: "previsao" | "saiu_para_entrega" | "alojado" | "fechado"
      motivo_mortalidade: "natural" | "eliminado"
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
      status_quarentena: "quarentena" | "liberado" | "rejeitado"
      submotivo_eliminacao: "problema_locomotor" | "debilitado" | "deficiente"
      tipo_bebedouro: "niple" | "tacas"
      tipo_cadastro: "cliente" | "fornecedor" | "ambos"
      tipo_comedouro: "manual" | "automatico"
      tipo_pessoa: "pf" | "pj" | "produtor_rural"
      tipo_pressao: "positiva" | "negativa" | "darkhouse"
      tipo_producao: "corte" | "postura"
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
      ],
      conta_pagar_status: ["previsto", "pendente", "pago", "cancelado"],
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
      linhagem_aves: ["cobb_500", "ross_308", "hubbard"],
      lote_status: ["previsao", "saiu_para_entrega", "alojado", "fechado"],
      motivo_mortalidade: ["natural", "eliminado"],
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
      status_quarentena: ["quarentena", "liberado", "rejeitado"],
      submotivo_eliminacao: ["problema_locomotor", "debilitado", "deficiente"],
      tipo_bebedouro: ["niple", "tacas"],
      tipo_cadastro: ["cliente", "fornecedor", "ambos"],
      tipo_comedouro: ["manual", "automatico"],
      tipo_pessoa: ["pf", "pj", "produtor_rural"],
      tipo_pressao: ["positiva", "negativa", "darkhouse"],
      tipo_producao: ["corte", "postura"],
    },
  },
} as const
