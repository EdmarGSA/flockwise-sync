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
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          integrado_id: string | null
          lida: boolean
          mensagem: string | null
          tipo: string
          titulo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          integrado_id?: string | null
          lida?: boolean
          mensagem?: string | null
          tipo?: string
          titulo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          integrado_id?: string | null
          lida?: boolean
          mensagem?: string | null
          tipo?: string
          titulo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      alarmes_disparados: {
        Row: {
          acionado_em: string
          canal_id: string | null
          contexto: Json | null
          galpao_id: string | null
          id: string
          integrado_id: string
          lote_id: string | null
          mensagem: string
          resolvido: boolean
          resolvido_em: string | null
          severidade: string
          tipo: string
        }
        Insert: {
          acionado_em?: string
          canal_id?: string | null
          contexto?: Json | null
          galpao_id?: string | null
          id?: string
          integrado_id: string
          lote_id?: string | null
          mensagem: string
          resolvido?: boolean
          resolvido_em?: string | null
          severidade?: string
          tipo: string
        }
        Update: {
          acionado_em?: string
          canal_id?: string | null
          contexto?: Json | null
          galpao_id?: string | null
          id?: string
          integrado_id?: string
          lote_id?: string | null
          mensagem?: string
          resolvido?: boolean
          resolvido_em?: string | null
          severidade?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alarmes_disparados_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "canais_dispositivo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alarmes_disparados_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: false
            referencedRelation: "galpoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alarmes_disparados_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_climaticos: {
        Row: {
          contexto: Json | null
          created_at: string
          galpao_id: string | null
          hora_chave: string | null
          horario_acao: string | null
          horario_evento: string
          id: string
          integrado_id: string
          lote_id: string | null
          mensagem: string
          nucleo_id: string
          reconhecido_em: string | null
          reconhecido_por: string | null
          severidade: string
          tipo: string
          titulo: string
        }
        Insert: {
          contexto?: Json | null
          created_at?: string
          galpao_id?: string | null
          hora_chave?: string | null
          horario_acao?: string | null
          horario_evento: string
          id?: string
          integrado_id: string
          lote_id?: string | null
          mensagem: string
          nucleo_id: string
          reconhecido_em?: string | null
          reconhecido_por?: string | null
          severidade?: string
          tipo: string
          titulo: string
        }
        Update: {
          contexto?: Json | null
          created_at?: string
          galpao_id?: string | null
          hora_chave?: string | null
          horario_acao?: string | null
          horario_evento?: string
          id?: string
          integrado_id?: string
          lote_id?: string | null
          mensagem?: string
          nucleo_id?: string
          reconhecido_em?: string | null
          reconhecido_por?: string | null
          severidade?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_climaticos_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: false
            referencedRelation: "galpoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_climaticos_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_climaticos_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos"
            referencedColumns: ["id"]
          },
        ]
      }
      alertas_qualidade_ar: {
        Row: {
          created_at: string
          dispositivo_id: string | null
          galpao_id: string | null
          id: string
          integrado_id: string
          limite_configurado: number
          lote_id: string | null
          resolvido_em: string | null
          severidade: string
          tipo: string
          valor_lido: number
        }
        Insert: {
          created_at?: string
          dispositivo_id?: string | null
          galpao_id?: string | null
          id?: string
          integrado_id: string
          limite_configurado: number
          lote_id?: string | null
          resolvido_em?: string | null
          severidade: string
          tipo: string
          valor_lido: number
        }
        Update: {
          created_at?: string
          dispositivo_id?: string | null
          galpao_id?: string | null
          id?: string
          integrado_id?: string
          limite_configurado?: number
          lote_id?: string | null
          resolvido_em?: string | null
          severidade?: string
          tipo?: string
          valor_lido?: number
        }
        Relationships: []
      }
      alertas_temperatura: {
        Row: {
          created_at: string
          duracao_minutos: number
          galpao_id: string
          id: string
          integrado_id: string
          lote_id: string
          notificado: boolean
          primeira_leitura_fora: string
          resolvido: boolean
          resolvido_em: string | null
          temp_max_regra: number
          temp_min_regra: number
          temperatura_lida: number
          tipo: string
          ultima_leitura_fora: string
        }
        Insert: {
          created_at?: string
          duracao_minutos?: number
          galpao_id: string
          id?: string
          integrado_id: string
          lote_id: string
          notificado?: boolean
          primeira_leitura_fora?: string
          resolvido?: boolean
          resolvido_em?: string | null
          temp_max_regra: number
          temp_min_regra: number
          temperatura_lida: number
          tipo: string
          ultima_leitura_fora?: string
        }
        Update: {
          created_at?: string
          duracao_minutos?: number
          galpao_id?: string
          id?: string
          integrado_id?: string
          lote_id?: string
          notificado?: boolean
          primeira_leitura_fora?: string
          resolvido?: boolean
          resolvido_em?: string | null
          temp_max_regra?: number
          temp_min_regra?: number
          temperatura_lida?: number
          tipo?: string
          ultima_leitura_fora?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_temperatura_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: false
            referencedRelation: "galpoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alertas_temperatura_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      aprendizado_galpao: {
        Row: {
          amostras_treinadas: number
          created_at: string
          fator_isolamento: number
          fator_perda_calor_noturna: number
          galpao_id: string
          inercia_estimada_min: number
          integrado_id: string
          metricas: Json | null
          modelo_versao: number
          narrativa_atualizada_em: string | null
          narrativa_ia: string | null
          offset_temp_aprendido_c: number
          offset_ur_aprendido_pct: number
          ultimo_treino_em: string | null
          updated_at: string
        }
        Insert: {
          amostras_treinadas?: number
          created_at?: string
          fator_isolamento?: number
          fator_perda_calor_noturna?: number
          galpao_id: string
          inercia_estimada_min?: number
          integrado_id: string
          metricas?: Json | null
          modelo_versao?: number
          narrativa_atualizada_em?: string | null
          narrativa_ia?: string | null
          offset_temp_aprendido_c?: number
          offset_ur_aprendido_pct?: number
          ultimo_treino_em?: string | null
          updated_at?: string
        }
        Update: {
          amostras_treinadas?: number
          created_at?: string
          fator_isolamento?: number
          fator_perda_calor_noturna?: number
          galpao_id?: string
          inercia_estimada_min?: number
          integrado_id?: string
          metricas?: Json | null
          modelo_versao?: number
          narrativa_atualizada_em?: string | null
          narrativa_ia?: string | null
          offset_temp_aprendido_c?: number
          offset_ur_aprendido_pct?: number
          ultimo_treino_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "aprendizado_galpao_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: true
            referencedRelation: "galpoes"
            referencedColumns: ["id"]
          },
        ]
      }
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
      cameras_canais: {
        Row: {
          ativo: boolean
          canal_numero: number
          created_at: string
          dvr_id: string
          funcao: Database["public"]["Enums"]["camera_funcao"]
          galpao_id: string | null
          id: string
          lote_id: string | null
          nome: string
          snapshot_intervalo_seg: number
          ultimo_snapshot_em: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          canal_numero: number
          created_at?: string
          dvr_id: string
          funcao?: Database["public"]["Enums"]["camera_funcao"]
          galpao_id?: string | null
          id?: string
          lote_id?: string | null
          nome: string
          snapshot_intervalo_seg?: number
          ultimo_snapshot_em?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          canal_numero?: number
          created_at?: string
          dvr_id?: string
          funcao?: Database["public"]["Enums"]["camera_funcao"]
          galpao_id?: string | null
          id?: string
          lote_id?: string | null
          nome?: string
          snapshot_intervalo_seg?: number
          ultimo_snapshot_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cameras_canais_dvr_id_fkey"
            columns: ["dvr_id"]
            isOneToOne: false
            referencedRelation: "cameras_dvr"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cameras_canais_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: false
            referencedRelation: "galpoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cameras_canais_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      cameras_dvr: {
        Row: {
          ativo: boolean
          created_at: string
          host: string
          id: string
          integrado_id: string
          marca: string
          modelo: string | null
          nome: string
          num_canais: number
          observacoes: string | null
          porta_http: number
          porta_https: number
          porta_rtsp: number
          protocolo: string
          senha_encrypted: string
          status_conexao: Database["public"]["Enums"]["camera_status"]
          ultimo_erro: string | null
          ultimo_sync: string | null
          updated_at: string
          usuario: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          host: string
          id?: string
          integrado_id: string
          marca?: string
          modelo?: string | null
          nome: string
          num_canais?: number
          observacoes?: string | null
          porta_http?: number
          porta_https?: number
          porta_rtsp?: number
          protocolo?: string
          senha_encrypted: string
          status_conexao?: Database["public"]["Enums"]["camera_status"]
          ultimo_erro?: string | null
          ultimo_sync?: string | null
          updated_at?: string
          usuario: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          host?: string
          id?: string
          integrado_id?: string
          marca?: string
          modelo?: string | null
          nome?: string
          num_canais?: number
          observacoes?: string | null
          porta_http?: number
          porta_https?: number
          porta_rtsp?: number
          protocolo?: string
          senha_encrypted?: string
          status_conexao?: Database["public"]["Enums"]["camera_status"]
          ultimo_erro?: string | null
          ultimo_sync?: string | null
          updated_at?: string
          usuario?: string
        }
        Relationships: []
      }
      cameras_eventos: {
        Row: {
          canal_id: string
          created_at: string
          id: string
          ocorrido_em: string
          payload: Json | null
          processado: boolean
          snapshot_id: string | null
          tipo_evento: Database["public"]["Enums"]["camera_evento_tipo"]
        }
        Insert: {
          canal_id: string
          created_at?: string
          id?: string
          ocorrido_em?: string
          payload?: Json | null
          processado?: boolean
          snapshot_id?: string | null
          tipo_evento: Database["public"]["Enums"]["camera_evento_tipo"]
        }
        Update: {
          canal_id?: string
          created_at?: string
          id?: string
          ocorrido_em?: string
          payload?: Json | null
          processado?: boolean
          snapshot_id?: string | null
          tipo_evento?: Database["public"]["Enums"]["camera_evento_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "cameras_eventos_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "cameras_canais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cameras_eventos_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "cameras_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      cameras_snapshots: {
        Row: {
          canal_id: string
          capturado_em: string
          created_at: string
          id: string
          lote_id: string | null
          metadata: Json | null
          storage_path: string
          tamanho_bytes: number | null
          tipo: Database["public"]["Enums"]["camera_snapshot_tipo"]
        }
        Insert: {
          canal_id: string
          capturado_em?: string
          created_at?: string
          id?: string
          lote_id?: string | null
          metadata?: Json | null
          storage_path: string
          tamanho_bytes?: number | null
          tipo?: Database["public"]["Enums"]["camera_snapshot_tipo"]
        }
        Update: {
          canal_id?: string
          capturado_em?: string
          created_at?: string
          id?: string
          lote_id?: string | null
          metadata?: Json | null
          storage_path?: string
          tamanho_bytes?: number | null
          tipo?: Database["public"]["Enums"]["camera_snapshot_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "cameras_snapshots_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "cameras_canais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cameras_snapshots_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      canais_dispositivo: {
        Row: {
          ativo: boolean
          automacao_ativa: boolean
          canal_numero: number
          cfm_nominal: number | null
          created_at: string
          dispositivo_id: string
          estado_atual: string | null
          funcao_automacao: Database["public"]["Enums"]["funcao_automacao"]
          id: string
          integrado_id: string
          intensidade_atual: number | null
          nome: string
          observacoes: string | null
          posicao_atual_pct: number | null
          recuperacao_apos_falha: boolean
          suporta_dimer: boolean
          suporta_posicionamento: boolean
          tipo_equipamento: Database["public"]["Enums"]["tipo_equipamento_canal"]
          ultimo_comando_em: string | null
          ultimo_estado_persistido: string | null
          ultimo_estado_persistido_em: string | null
          ultimo_off_em: string | null
          ultimo_on_em: string | null
          updated_at: string
          watts_nominal: number | null
        }
        Insert: {
          ativo?: boolean
          automacao_ativa?: boolean
          canal_numero: number
          cfm_nominal?: number | null
          created_at?: string
          dispositivo_id: string
          estado_atual?: string | null
          funcao_automacao?: Database["public"]["Enums"]["funcao_automacao"]
          id?: string
          integrado_id: string
          intensidade_atual?: number | null
          nome: string
          observacoes?: string | null
          posicao_atual_pct?: number | null
          recuperacao_apos_falha?: boolean
          suporta_dimer?: boolean
          suporta_posicionamento?: boolean
          tipo_equipamento?: Database["public"]["Enums"]["tipo_equipamento_canal"]
          ultimo_comando_em?: string | null
          ultimo_estado_persistido?: string | null
          ultimo_estado_persistido_em?: string | null
          ultimo_off_em?: string | null
          ultimo_on_em?: string | null
          updated_at?: string
          watts_nominal?: number | null
        }
        Update: {
          ativo?: boolean
          automacao_ativa?: boolean
          canal_numero?: number
          cfm_nominal?: number | null
          created_at?: string
          dispositivo_id?: string
          estado_atual?: string | null
          funcao_automacao?: Database["public"]["Enums"]["funcao_automacao"]
          id?: string
          integrado_id?: string
          intensidade_atual?: number | null
          nome?: string
          observacoes?: string | null
          posicao_atual_pct?: number | null
          recuperacao_apos_falha?: boolean
          suporta_dimer?: boolean
          suporta_posicionamento?: boolean
          tipo_equipamento?: Database["public"]["Enums"]["tipo_equipamento_canal"]
          ultimo_comando_em?: string | null
          ultimo_estado_persistido?: string | null
          ultimo_estado_persistido_em?: string | null
          ultimo_off_em?: string | null
          ultimo_on_em?: string | null
          updated_at?: string
          watts_nominal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "canais_dispositivo_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos_iot"
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
      clientes_fornecedor: {
        Row: {
          ativo: boolean
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          codigo_erp: string | null
          codigo_ibge: string | null
          complemento: string | null
          cpf_cnpj: string
          created_at: string
          email: string | null
          estado: string | null
          fornecedor_global_id: string
          id: string
          inscricao_estadual: string | null
          limite_credito: number | null
          logradouro: string | null
          nome_fantasia: string | null
          numero: string | null
          observacoes: string | null
          razao_social_nome: string
          saldo_credito: number | null
          telefone: string | null
          tipo_pessoa: string
          updated_at: string
          vendedor_fornecedor_id: string | null
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_erp?: string | null
          codigo_ibge?: string | null
          complemento?: string | null
          cpf_cnpj: string
          created_at?: string
          email?: string | null
          estado?: string | null
          fornecedor_global_id: string
          id?: string
          inscricao_estadual?: string | null
          limite_credito?: number | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social_nome: string
          saldo_credito?: number | null
          telefone?: string | null
          tipo_pessoa?: string
          updated_at?: string
          vendedor_fornecedor_id?: string | null
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          codigo_erp?: string | null
          codigo_ibge?: string | null
          complemento?: string | null
          cpf_cnpj?: string
          created_at?: string
          email?: string | null
          estado?: string | null
          fornecedor_global_id?: string
          id?: string
          inscricao_estadual?: string | null
          limite_credito?: number | null
          logradouro?: string | null
          nome_fantasia?: string | null
          numero?: string | null
          observacoes?: string | null
          razao_social_nome?: string
          saldo_credito?: number | null
          telefone?: string | null
          tipo_pessoa?: string
          updated_at?: string
          vendedor_fornecedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_fornecedor_fornecedor_global_id_fkey"
            columns: ["fornecedor_global_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_globais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_fornecedor_vendedor_fornecedor_id_fkey"
            columns: ["vendedor_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores_fornecedor"
            referencedColumns: ["id"]
          },
        ]
      }
      config_alarme_lote: {
        Row: {
          alarme_duracao_seg: number
          ativo: boolean
          comando_falha_count: number
          created_at: string
          id: string
          integrado_id: string
          internet_offline_min: number
          mortalidade_subita_pct: number
          sensor_offline_min: number
          temp_critica_c: number
          temp_fora_faixa_min: number
          umid_critica_max_pct: number
          umid_critica_min_pct: number
          updated_at: string
        }
        Insert: {
          alarme_duracao_seg?: number
          ativo?: boolean
          comando_falha_count?: number
          created_at?: string
          id?: string
          integrado_id: string
          internet_offline_min?: number
          mortalidade_subita_pct?: number
          sensor_offline_min?: number
          temp_critica_c?: number
          temp_fora_faixa_min?: number
          umid_critica_max_pct?: number
          umid_critica_min_pct?: number
          updated_at?: string
        }
        Update: {
          alarme_duracao_seg?: number
          ativo?: boolean
          comando_falha_count?: number
          created_at?: string
          id?: string
          integrado_id?: string
          internet_offline_min?: number
          mortalidade_subita_pct?: number
          sensor_offline_min?: number
          temp_critica_c?: number
          temp_fora_faixa_min?: number
          umid_critica_max_pct?: number
          umid_critica_min_pct?: number
          updated_at?: string
        }
        Relationships: []
      }
      config_alertas_qualidade_ar: {
        Row: {
          ativo: boolean
          co2_amarelo_ppm: number
          co2_vermelho_ppm: number
          cooldown_minutos: number
          created_at: string
          integrado_id: string
          nh3_amarelo_ppm: number
          nh3_vermelho_ppm: number
          pressao_max_pa: number
          pressao_min_pa: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          co2_amarelo_ppm?: number
          co2_vermelho_ppm?: number
          cooldown_minutos?: number
          created_at?: string
          integrado_id: string
          nh3_amarelo_ppm?: number
          nh3_vermelho_ppm?: number
          pressao_max_pa?: number
          pressao_min_pa?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          co2_amarelo_ppm?: number
          co2_vermelho_ppm?: number
          cooldown_minutos?: number
          created_at?: string
          integrado_id?: string
          nh3_amarelo_ppm?: number
          nh3_vermelho_ppm?: number
          pressao_max_pa?: number
          pressao_min_pa?: number
          updated_at?: string
        }
        Relationships: []
      }
      config_custo_postura: {
        Row: {
          created_at: string | null
          custo_ave_dia: number | null
          custo_mao_obra_dia: number | null
          id: string
          integrado_id: string
          outros_custos_dia: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custo_ave_dia?: number | null
          custo_mao_obra_dia?: number | null
          id?: string
          integrado_id: string
          outros_custos_dia?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custo_ave_dia?: number | null
          custo_mao_obra_dia?: number | null
          id?: string
          integrado_id?: string
          outros_custos_dia?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      config_estimulo_postura: {
        Row: {
          aplicado_em: string | null
          auto_aplicar: boolean
          created_at: string
          ganho_semanal_min: number
          horas_alvo: number
          horas_inicio: number
          id: string
          idade_min_semanas: number
          integrado_id: string
          intensidade_pct: number
          lote_id: string
          peso_min_kg: number
          programa_gerado_id: string | null
          updated_at: string
        }
        Insert: {
          aplicado_em?: string | null
          auto_aplicar?: boolean
          created_at?: string
          ganho_semanal_min?: number
          horas_alvo?: number
          horas_inicio?: number
          id?: string
          idade_min_semanas?: number
          integrado_id: string
          intensidade_pct?: number
          lote_id: string
          peso_min_kg?: number
          programa_gerado_id?: string | null
          updated_at?: string
        }
        Update: {
          aplicado_em?: string | null
          auto_aplicar?: boolean
          created_at?: string
          ganho_semanal_min?: number
          horas_alvo?: number
          horas_inicio?: number
          id?: string
          idade_min_semanas?: number
          integrado_id?: string
          intensidade_pct?: number
          lote_id?: string
          peso_min_kg?: number
          programa_gerado_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_estimulo_postura_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: true
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "config_estimulo_postura_programa_gerado_id_fkey"
            columns: ["programa_gerado_id"]
            isOneToOne: false
            referencedRelation: "programa_iluminacao_lote"
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
      config_histerese_organizacao: {
        Row: {
          created_at: string
          deadband_temp_c: number
          integrado_id: string
          ith_amarelo: number
          ith_vermelho: number
          modo_seguro_vent_min_pct: number
          protege_pintinho_ate_dias: number
          sensor_max_idade_min: number
          tempo_min_off_aquecedor_seg: number
          tempo_min_off_nebulizador_seg: number
          tempo_min_off_ventilador_seg: number
          tempo_min_on_aquecedor_seg: number
          tempo_min_on_nebulizador_seg: number
          tempo_min_on_ventilador_seg: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deadband_temp_c?: number
          integrado_id: string
          ith_amarelo?: number
          ith_vermelho?: number
          modo_seguro_vent_min_pct?: number
          protege_pintinho_ate_dias?: number
          sensor_max_idade_min?: number
          tempo_min_off_aquecedor_seg?: number
          tempo_min_off_nebulizador_seg?: number
          tempo_min_off_ventilador_seg?: number
          tempo_min_on_aquecedor_seg?: number
          tempo_min_on_nebulizador_seg?: number
          tempo_min_on_ventilador_seg?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deadband_temp_c?: number
          integrado_id?: string
          ith_amarelo?: number
          ith_vermelho?: number
          modo_seguro_vent_min_pct?: number
          protege_pintinho_ate_dias?: number
          sensor_max_idade_min?: number
          tempo_min_off_aquecedor_seg?: number
          tempo_min_off_nebulizador_seg?: number
          tempo_min_off_ventilador_seg?: number
          tempo_min_on_aquecedor_seg?: number
          tempo_min_on_nebulizador_seg?: number
          tempo_min_on_ventilador_seg?: number
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
      config_validade_ovos: {
        Row: {
          created_at: string
          dias_validade_branco: number | null
          dias_validade_caipira: number | null
          dias_validade_castanho: number | null
          dias_validade_padrao: number
          dias_validade_vermelho: number | null
          id: string
          integrado_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dias_validade_branco?: number | null
          dias_validade_caipira?: number | null
          dias_validade_castanho?: number | null
          dias_validade_padrao?: number
          dias_validade_vermelho?: number | null
          id?: string
          integrado_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dias_validade_branco?: number | null
          dias_validade_caipira?: number | null
          dias_validade_castanho?: number | null
          dias_validade_padrao?: number
          dias_validade_vermelho?: number | null
          id?: string
          integrado_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      conforto_termico_ave: {
        Row: {
          created_at: string
          id: string
          idade_dia_fim: number
          idade_dia_inicio: number
          ith_max_critico: number | null
          ith_max_ok: number | null
          observacao: string | null
          temp_max_critico: number
          temp_max_ok: number
          temp_min_critico: number
          temp_min_ok: number
          tipo_producao: string
          ur_max_ok: number | null
          ur_min_ok: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          idade_dia_fim: number
          idade_dia_inicio: number
          ith_max_critico?: number | null
          ith_max_ok?: number | null
          observacao?: string | null
          temp_max_critico: number
          temp_max_ok: number
          temp_min_critico: number
          temp_min_ok: number
          tipo_producao: string
          ur_max_ok?: number | null
          ur_min_ok?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          idade_dia_fim?: number
          idade_dia_inicio?: number
          ith_max_critico?: number | null
          ith_max_ok?: number | null
          observacao?: string | null
          temp_max_critico?: number
          temp_max_ok?: number
          temp_min_critico?: number
          temp_min_ok?: number
          tipo_producao?: string
          ur_max_ok?: number | null
          ur_min_ok?: number | null
        }
        Relationships: []
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
      cortina_estado_atual: {
        Row: {
          galpao_id: string
          integrado_id: string
          posicao_alvo_pct: number | null
          posicao_atual_pct: number | null
          reason_chain: Json | null
          ultima_movimentacao_em: string | null
          ultimo_motivo: string | null
          updated_at: string
        }
        Insert: {
          galpao_id: string
          integrado_id: string
          posicao_alvo_pct?: number | null
          posicao_atual_pct?: number | null
          reason_chain?: Json | null
          ultima_movimentacao_em?: string | null
          ultimo_motivo?: string | null
          updated_at?: string
        }
        Update: {
          galpao_id?: string
          integrado_id?: string
          posicao_alvo_pct?: number | null
          posicao_atual_pct?: number | null
          reason_chain?: Json | null
          ultima_movimentacao_em?: string | null
          ultimo_motivo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cortina_estado_atual_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: true
            referencedRelation: "galpoes"
            referencedColumns: ["id"]
          },
        ]
      }
      create_user_audit_log: {
        Row: {
          attempt: number
          created_at: string
          created_user_id: string | null
          error_message: string | null
          error_type: string | null
          id: string
          integrado_id: string | null
          max_attempts: number
          metadata: Json | null
          request_id: string
          requested_by: string | null
          status: string
          target_email: string
        }
        Insert: {
          attempt?: number
          created_at?: string
          created_user_id?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string
          integrado_id?: string | null
          max_attempts?: number
          metadata?: Json | null
          request_id: string
          requested_by?: string | null
          status: string
          target_email: string
        }
        Update: {
          attempt?: number
          created_at?: string
          created_user_id?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string
          integrado_id?: string | null
          max_attempts?: number
          metadata?: Json | null
          request_id?: string
          requested_by?: string | null
          status?: string
          target_email?: string
        }
        Relationships: []
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
      curva_climatica_ponto: {
        Row: {
          co2_max_ppm: number | null
          curva_id: string
          dia_idade: number
          id: string
          ith_alarme_amarelo: number | null
          ith_alarme_vermelho: number | null
          nh3_max_ppm: number | null
          temp_alvo_c: number
          temp_max_alarme_c: number
          temp_min_alarme_c: number
          ur_max_pct: number | null
          ur_min_pct: number | null
          vazao_min_m3h_por_kg: number | null
          velocidade_ar_max_ms: number | null
          velocidade_ar_min_ms: number | null
        }
        Insert: {
          co2_max_ppm?: number | null
          curva_id: string
          dia_idade: number
          id?: string
          ith_alarme_amarelo?: number | null
          ith_alarme_vermelho?: number | null
          nh3_max_ppm?: number | null
          temp_alvo_c: number
          temp_max_alarme_c: number
          temp_min_alarme_c: number
          ur_max_pct?: number | null
          ur_min_pct?: number | null
          vazao_min_m3h_por_kg?: number | null
          velocidade_ar_max_ms?: number | null
          velocidade_ar_min_ms?: number | null
        }
        Update: {
          co2_max_ppm?: number | null
          curva_id?: string
          dia_idade?: number
          id?: string
          ith_alarme_amarelo?: number | null
          ith_alarme_vermelho?: number | null
          nh3_max_ppm?: number | null
          temp_alvo_c?: number
          temp_max_alarme_c?: number
          temp_min_alarme_c?: number
          ur_max_pct?: number | null
          ur_min_pct?: number | null
          vazao_min_m3h_por_kg?: number | null
          velocidade_ar_max_ms?: number | null
          velocidade_ar_min_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "curva_climatica_ponto_curva_id_fkey"
            columns: ["curva_id"]
            isOneToOne: false
            referencedRelation: "curva_climatica_referencia"
            referencedColumns: ["id"]
          },
        ]
      }
      curva_climatica_referencia: {
        Row: {
          created_at: string
          fonte: string | null
          id: string
          integrado_id: string | null
          linhagem: string
          nome: string
          publica: boolean
          sexo: string
          tipo_producao: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fonte?: string | null
          id?: string
          integrado_id?: string | null
          linhagem: string
          nome: string
          publica?: boolean
          sexo?: string
          tipo_producao?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fonte?: string | null
          id?: string
          integrado_id?: string | null
          linhagem?: string
          nome?: string
          publica?: boolean
          sexo?: string
          tipo_producao?: string
          updated_at?: string
        }
        Relationships: []
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
      descarte_ovos: {
        Row: {
          created_at: string
          destino: Database["public"]["Enums"]["destino_descarte_ovo"]
          estoque_ovo_id: string | null
          id: string
          integrado_id: string
          motivo: string | null
          observacao: string | null
          quantidade: number
        }
        Insert: {
          created_at?: string
          destino: Database["public"]["Enums"]["destino_descarte_ovo"]
          estoque_ovo_id?: string | null
          id?: string
          integrado_id: string
          motivo?: string | null
          observacao?: string | null
          quantidade: number
        }
        Update: {
          created_at?: string
          destino?: Database["public"]["Enums"]["destino_descarte_ovo"]
          estoque_ovo_id?: string | null
          id?: string
          integrado_id?: string
          motivo?: string | null
          observacao?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "descarte_ovos_estoque_ovo_id_fkey"
            columns: ["estoque_ovo_id"]
            isOneToOne: false
            referencedRelation: "estoque_ovos"
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
      dispositivos_iot: {
        Row: {
          ativo: boolean
          auth_token: string | null
          automacao_ativa: boolean
          boot_count: number
          created_at: string
          device_id_ewelink: string
          driver: Database["public"]["Enums"]["driver_iot"]
          endpoint_local: string | null
          funcao_automacao: Database["public"]["Enums"]["funcao_automacao"]
          galpao_id: string | null
          id: string
          integrado_id: string
          marca: string | null
          modelo: string | null
          nome: string
          num_canais: number
          programa_versao: string | null
          regra_grupo: string | null
          suporta_anemometro: boolean | null
          suporta_co2: boolean | null
          suporta_lux: boolean | null
          suporta_manometro: boolean | null
          suporta_nh3: boolean | null
          tipo: string
          ultima_inicializacao: string | null
          ultimo_boot_reason: string | null
          ultimo_sync: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          auth_token?: string | null
          automacao_ativa?: boolean
          boot_count?: number
          created_at?: string
          device_id_ewelink: string
          driver?: Database["public"]["Enums"]["driver_iot"]
          endpoint_local?: string | null
          funcao_automacao?: Database["public"]["Enums"]["funcao_automacao"]
          galpao_id?: string | null
          id?: string
          integrado_id: string
          marca?: string | null
          modelo?: string | null
          nome: string
          num_canais?: number
          programa_versao?: string | null
          regra_grupo?: string | null
          suporta_anemometro?: boolean | null
          suporta_co2?: boolean | null
          suporta_lux?: boolean | null
          suporta_manometro?: boolean | null
          suporta_nh3?: boolean | null
          tipo?: string
          ultima_inicializacao?: string | null
          ultimo_boot_reason?: string | null
          ultimo_sync?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          auth_token?: string | null
          automacao_ativa?: boolean
          boot_count?: number
          created_at?: string
          device_id_ewelink?: string
          driver?: Database["public"]["Enums"]["driver_iot"]
          endpoint_local?: string | null
          funcao_automacao?: Database["public"]["Enums"]["funcao_automacao"]
          galpao_id?: string | null
          id?: string
          integrado_id?: string
          marca?: string | null
          modelo?: string | null
          nome?: string
          num_canais?: number
          programa_versao?: string | null
          regra_grupo?: string | null
          suporta_anemometro?: boolean | null
          suporta_co2?: boolean | null
          suporta_lux?: boolean | null
          suporta_manometro?: boolean | null
          suporta_nh3?: boolean | null
          tipo?: string
          ultima_inicializacao?: string | null
          ultimo_boot_reason?: string | null
          ultimo_sync?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispositivos_iot_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: false
            referencedRelation: "galpoes"
            referencedColumns: ["id"]
          },
        ]
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
      estagio_ventilacao_estado: {
        Row: {
          cfm_total_ativo: number | null
          estagio_atual: string
          galpao_id: string
          integrado_id: string
          permanencia_minima_seg: number
          pressao_estatica_pa: number | null
          reason: Json | null
          ultima_transicao_em: string
          updated_at: string
          velocidade_estimada_ms: number | null
        }
        Insert: {
          cfm_total_ativo?: number | null
          estagio_atual?: string
          galpao_id: string
          integrado_id: string
          permanencia_minima_seg?: number
          pressao_estatica_pa?: number | null
          reason?: Json | null
          ultima_transicao_em?: string
          updated_at?: string
          velocidade_estimada_ms?: number | null
        }
        Update: {
          cfm_total_ativo?: number | null
          estagio_atual?: string
          galpao_id?: string
          integrado_id?: string
          permanencia_minima_seg?: number
          pressao_estatica_pa?: number | null
          reason?: Json | null
          ultima_transicao_em?: string
          updated_at?: string
          velocidade_estimada_ms?: number | null
        }
        Relationships: []
      }
      estoque_ovos: {
        Row: {
          ativo: boolean
          bloqueado_carencia: boolean | null
          classificacao_peso: Database["public"]["Enums"]["classificacao_peso_ovo"]
          created_at: string
          custo_unitario: number | null
          data_liberacao_carencia: string | null
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
          tratamento_lote_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bloqueado_carencia?: boolean | null
          classificacao_peso: Database["public"]["Enums"]["classificacao_peso_ovo"]
          created_at?: string
          custo_unitario?: number | null
          data_liberacao_carencia?: string | null
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
          tratamento_lote_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bloqueado_carencia?: boolean | null
          classificacao_peso?: Database["public"]["Enums"]["classificacao_peso_ovo"]
          created_at?: string
          custo_unitario?: number | null
          data_liberacao_carencia?: string | null
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
          tratamento_lote_id?: string | null
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
          {
            foreignKeyName: "estoque_ovos_tratamento_lote_id_fkey"
            columns: ["tratamento_lote_id"]
            isOneToOne: false
            referencedRelation: "tratamentos_lote"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_dispositivo_iot: {
        Row: {
          criado_em: string
          detalhes: Json | null
          dispositivo_id: string
          id: string
          integrado_id: string
          tipo: string
        }
        Insert: {
          criado_em?: string
          detalhes?: Json | null
          dispositivo_id: string
          id?: string
          integrado_id: string
          tipo: string
        }
        Update: {
          criado_em?: string
          detalhes?: Json | null
          dispositivo_id?: string
          id?: string
          integrado_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_dispositivo_iot_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos_iot"
            referencedColumns: ["id"]
          },
        ]
      }
      ewelink_tokens: {
        Row: {
          access_token: string
          at_expired_at: string
          created_at: string
          id: string
          integrado_id: string
          refresh_token: string
          region: string
          rt_expired_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          at_expired_at: string
          created_at?: string
          id?: string
          integrado_id: string
          refresh_token: string
          region?: string
          rt_expired_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          at_expired_at?: string
          created_at?: string
          id?: string
          integrado_id?: string
          refresh_token?: string
          region?: string
          rt_expired_at?: string
          updated_at?: string
        }
        Relationships: []
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
      formas_pagamento_fornecedor: {
        Row: {
          ativo: boolean | null
          codigo: string
          codigo_erp: string | null
          created_at: string | null
          fornecedor_global_id: string
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          codigo_erp?: string | null
          created_at?: string | null
          fornecedor_global_id: string
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          codigo_erp?: string | null
          created_at?: string | null
          fornecedor_global_id?: string
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formas_pagamento_fornecedor_fornecedor_global_id_fkey"
            columns: ["fornecedor_global_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_globais"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores_globais: {
        Row: {
          ativo: boolean | null
          cpf_cnpj: string
          created_at: string | null
          email: string | null
          id: string
          nome_fantasia: string | null
          razao_social_nome: string
          telefone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpf_cnpj: string
          created_at?: string | null
          email?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social_nome: string
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpf_cnpj?: string
          created_at?: string | null
          email?: string | null
          id?: string
          nome_fantasia?: string | null
          razao_social_nome?: string
          telefone?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          inercia_termica_min: number | null
          largura: number
          latitude: number | null
          longitude: number | null
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
          inercia_termica_min?: number | null
          largura: number
          latitude?: number | null
          longitude?: number | null
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
          inercia_termica_min?: number | null
          largura?: number
          latitude?: number | null
          longitude?: number | null
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
      galpoes_fornecedor: {
        Row: {
          ativo: boolean
          capacidade_aves: number
          comprimento: number | null
          created_at: string
          fornecedor_global_id: string
          id: string
          largura: number | null
          nome: string
          nucleo_fornecedor_id: string
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          capacidade_aves?: number
          comprimento?: number | null
          created_at?: string
          fornecedor_global_id: string
          id?: string
          largura?: number | null
          nome: string
          nucleo_fornecedor_id: string
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          capacidade_aves?: number
          comprimento?: number | null
          created_at?: string
          fornecedor_global_id?: string
          id?: string
          largura?: number | null
          nome?: string
          nucleo_fornecedor_id?: string
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "galpoes_fornecedor_fornecedor_global_id_fkey"
            columns: ["fornecedor_global_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_globais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "galpoes_fornecedor_nucleo_fornecedor_id_fkey"
            columns: ["nucleo_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "nucleos_fornecedor"
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
      historico_estado_canal: {
        Row: {
          canal_id: string
          contexto: Json | null
          created_at: string
          desligado_em: string | null
          estado: string
          id: string
          integrado_id: string
          ligado_em: string | null
          motivo: string | null
        }
        Insert: {
          canal_id: string
          contexto?: Json | null
          created_at?: string
          desligado_em?: string | null
          estado: string
          id?: string
          integrado_id: string
          ligado_em?: string | null
          motivo?: string | null
        }
        Update: {
          canal_id?: string
          contexto?: Json | null
          created_at?: string
          desligado_em?: string | null
          estado?: string
          id?: string
          integrado_id?: string
          ligado_em?: string | null
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_estado_canal_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "canais_dispositivo"
            referencedColumns: ["id"]
          },
        ]
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
      historico_precos_fornecedor: {
        Row: {
          criado_por: string | null
          data_alteracao: string
          id: string
          motivo: string | null
          preco_anterior: number | null
          preco_novo: number
          produto_fornecedor_id: string
        }
        Insert: {
          criado_por?: string | null
          data_alteracao?: string
          id?: string
          motivo?: string | null
          preco_anterior?: number | null
          preco_novo: number
          produto_fornecedor_id: string
        }
        Update: {
          criado_por?: string | null
          data_alteracao?: string
          id?: string
          motivo?: string | null
          preco_anterior?: number | null
          preco_novo?: number
          produto_fornecedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_precos_fornecedor_produto_fornecedor_id_fkey"
            columns: ["produto_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "produto_fornecedor"
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
      leituras_sensores: {
        Row: {
          co2_ppm: number | null
          created_at: string
          dispositivo_id: string
          id: string
          lido_em: string
          lux: number | null
          nh3_ppm: number | null
          online: boolean | null
          pressao_estatica_pa: number | null
          raw_data: Json | null
          temperatura_c: number | null
          umidade_pct: number | null
          velocidade_ar_ms: number | null
        }
        Insert: {
          co2_ppm?: number | null
          created_at?: string
          dispositivo_id: string
          id?: string
          lido_em?: string
          lux?: number | null
          nh3_ppm?: number | null
          online?: boolean | null
          pressao_estatica_pa?: number | null
          raw_data?: Json | null
          temperatura_c?: number | null
          umidade_pct?: number | null
          velocidade_ar_ms?: number | null
        }
        Update: {
          co2_ppm?: number | null
          created_at?: string
          dispositivo_id?: string
          id?: string
          lido_em?: string
          lux?: number | null
          nh3_ppm?: number | null
          online?: boolean | null
          pressao_estatica_pa?: number | null
          raw_data?: Json | null
          temperatura_c?: number | null
          umidade_pct?: number | null
          velocidade_ar_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leituras_sensores_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos_iot"
            referencedColumns: ["id"]
          },
        ]
      }
      log_automacao_temperatura: {
        Row: {
          acao: string
          created_at: string
          dispositivo_id: string
          id: string
          lote_id: string | null
          resultado: string | null
          temp_max_regra: number | null
          temp_min_regra: number | null
          temperatura_lida: number | null
          tempo_resposta_ms: number | null
        }
        Insert: {
          acao: string
          created_at?: string
          dispositivo_id: string
          id?: string
          lote_id?: string | null
          resultado?: string | null
          temp_max_regra?: number | null
          temp_min_regra?: number | null
          temperatura_lida?: number | null
          tempo_resposta_ms?: number | null
        }
        Update: {
          acao?: string
          created_at?: string
          dispositivo_id?: string
          id?: string
          lote_id?: string | null
          resultado?: string | null
          temp_max_regra?: number | null
          temp_min_regra?: number | null
          temperatura_lida?: number | null
          tempo_resposta_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "log_automacao_temperatura_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos_iot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_automacao_temperatura_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      log_decisao_clima: {
        Row: {
          bloqueado_por: string | null
          canal_id: string | null
          created_at: string
          dispositivo_id: string | null
          estado_decidido: string | null
          estagio: string | null
          funcao_automacao: string | null
          galpao_id: string | null
          id: string
          integrado_id: string
          ith_calc: number | null
          lote_id: string | null
          modo_dominante: string | null
          offset_aprendido_aplicado_c: number | null
          reason_chain: Json
          setpoint_alvo: number | null
          temp_lida: number | null
          ur_lida: number | null
        }
        Insert: {
          bloqueado_por?: string | null
          canal_id?: string | null
          created_at?: string
          dispositivo_id?: string | null
          estado_decidido?: string | null
          estagio?: string | null
          funcao_automacao?: string | null
          galpao_id?: string | null
          id?: string
          integrado_id: string
          ith_calc?: number | null
          lote_id?: string | null
          modo_dominante?: string | null
          offset_aprendido_aplicado_c?: number | null
          reason_chain: Json
          setpoint_alvo?: number | null
          temp_lida?: number | null
          ur_lida?: number | null
        }
        Update: {
          bloqueado_por?: string | null
          canal_id?: string | null
          created_at?: string
          dispositivo_id?: string | null
          estado_decidido?: string | null
          estagio?: string | null
          funcao_automacao?: string | null
          galpao_id?: string | null
          id?: string
          integrado_id?: string
          ith_calc?: number | null
          lote_id?: string | null
          modo_dominante?: string | null
          offset_aprendido_aplicado_c?: number | null
          reason_chain?: Json
          setpoint_alvo?: number | null
          temp_lida?: number | null
          ur_lida?: number | null
        }
        Relationships: []
      }
      lotes: {
        Row: {
          analise_ia_relatorio: Json | null
          created_at: string
          criador_id: string | null
          curva_climatica_id: string | null
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
          programa_iluminacao_id: string | null
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
          analise_ia_relatorio?: Json | null
          created_at?: string
          criador_id?: string | null
          curva_climatica_id?: string | null
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
          programa_iluminacao_id?: string | null
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
          analise_ia_relatorio?: Json | null
          created_at?: string
          criador_id?: string | null
          curva_climatica_id?: string | null
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
          programa_iluminacao_id?: string | null
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
            foreignKeyName: "lotes_curva_climatica_id_fkey"
            columns: ["curva_climatica_id"]
            isOneToOne: false
            referencedRelation: "curva_climatica_referencia"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "lotes_programa_iluminacao_id_fkey"
            columns: ["programa_iluminacao_id"]
            isOneToOne: false
            referencedRelation: "programa_iluminacao_lote"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes_fornecedor: {
        Row: {
          codigo_lote: string | null
          created_at: string
          data_alojamento: string | null
          data_prevista_saida: string | null
          fornecedor_global_id: string
          galpao_fornecedor_id: string
          id: string
          linhagem: string | null
          nucleo_fornecedor_id: string
          observacoes: string | null
          quantidade_aves: number
          sexo: string | null
          status: string
          tipo_producao: string | null
          updated_at: string
          vendedor_fornecedor_id: string | null
        }
        Insert: {
          codigo_lote?: string | null
          created_at?: string
          data_alojamento?: string | null
          data_prevista_saida?: string | null
          fornecedor_global_id: string
          galpao_fornecedor_id: string
          id?: string
          linhagem?: string | null
          nucleo_fornecedor_id: string
          observacoes?: string | null
          quantidade_aves: number
          sexo?: string | null
          status?: string
          tipo_producao?: string | null
          updated_at?: string
          vendedor_fornecedor_id?: string | null
        }
        Update: {
          codigo_lote?: string | null
          created_at?: string
          data_alojamento?: string | null
          data_prevista_saida?: string | null
          fornecedor_global_id?: string
          galpao_fornecedor_id?: string
          id?: string
          linhagem?: string | null
          nucleo_fornecedor_id?: string
          observacoes?: string | null
          quantidade_aves?: number
          sexo?: string | null
          status?: string
          tipo_producao?: string | null
          updated_at?: string
          vendedor_fornecedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lotes_fornecedor_fornecedor_global_id_fkey"
            columns: ["fornecedor_global_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_globais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_fornecedor_galpao_fornecedor_id_fkey"
            columns: ["galpao_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "galpoes_fornecedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_fornecedor_nucleo_fornecedor_id_fkey"
            columns: ["nucleo_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "nucleos_fornecedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lotes_fornecedor_vendedor_fornecedor_id_fkey"
            columns: ["vendedor_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores_fornecedor"
            referencedColumns: ["id"]
          },
        ]
      }
      mapbox_config: {
        Row: {
          created_at: string
          created_by: string | null
          default_lat: number | null
          default_lng: number | null
          default_zoom: number | null
          id: string
          integrado_id: string
          public_token: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          default_lat?: number | null
          default_lng?: number | null
          default_zoom?: number | null
          id?: string
          integrado_id: string
          public_token: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          default_lat?: number | null
          default_lng?: number | null
          default_zoom?: number | null
          id?: string
          integrado_id?: string
          public_token?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
      metas_zootecnicas: {
        Row: {
          ca_14_dias_alerta: number | null
          ca_14_dias_ok: number | null
          ca_21_dias_alerta: number | null
          ca_21_dias_ok: number | null
          ca_28_dias_alerta: number | null
          ca_28_dias_ok: number | null
          ca_35_dias_alerta: number | null
          ca_35_dias_ok: number | null
          ca_42_dias_alerta: number | null
          ca_42_dias_ok: number | null
          ca_7_dias_alerta: number | null
          ca_7_dias_ok: number | null
          carencia_medicamento_minimo: number | null
          consumo_14_dias_max: number | null
          consumo_14_dias_min: number | null
          consumo_21_dias_max: number | null
          consumo_21_dias_min: number | null
          consumo_28_dias_max: number | null
          consumo_28_dias_min: number | null
          consumo_35_dias_max: number | null
          consumo_35_dias_min: number | null
          consumo_42_dias_max: number | null
          consumo_42_dias_min: number | null
          consumo_7_dias_max: number | null
          consumo_7_dias_min: number | null
          created_at: string | null
          id: string
          integrado_id: string
          mortalidade_14_dias_alerta: number | null
          mortalidade_14_dias_ok: number | null
          mortalidade_21_dias_alerta: number | null
          mortalidade_21_dias_ok: number | null
          mortalidade_28_dias_alerta: number | null
          mortalidade_28_dias_ok: number | null
          mortalidade_35_dias_alerta: number | null
          mortalidade_35_dias_ok: number | null
          mortalidade_42_dias_alerta: number | null
          mortalidade_42_dias_ok: number | null
          mortalidade_7_dias_alerta: number | null
          mortalidade_7_dias_ok: number | null
          updated_at: string | null
        }
        Insert: {
          ca_14_dias_alerta?: number | null
          ca_14_dias_ok?: number | null
          ca_21_dias_alerta?: number | null
          ca_21_dias_ok?: number | null
          ca_28_dias_alerta?: number | null
          ca_28_dias_ok?: number | null
          ca_35_dias_alerta?: number | null
          ca_35_dias_ok?: number | null
          ca_42_dias_alerta?: number | null
          ca_42_dias_ok?: number | null
          ca_7_dias_alerta?: number | null
          ca_7_dias_ok?: number | null
          carencia_medicamento_minimo?: number | null
          consumo_14_dias_max?: number | null
          consumo_14_dias_min?: number | null
          consumo_21_dias_max?: number | null
          consumo_21_dias_min?: number | null
          consumo_28_dias_max?: number | null
          consumo_28_dias_min?: number | null
          consumo_35_dias_max?: number | null
          consumo_35_dias_min?: number | null
          consumo_42_dias_max?: number | null
          consumo_42_dias_min?: number | null
          consumo_7_dias_max?: number | null
          consumo_7_dias_min?: number | null
          created_at?: string | null
          id?: string
          integrado_id: string
          mortalidade_14_dias_alerta?: number | null
          mortalidade_14_dias_ok?: number | null
          mortalidade_21_dias_alerta?: number | null
          mortalidade_21_dias_ok?: number | null
          mortalidade_28_dias_alerta?: number | null
          mortalidade_28_dias_ok?: number | null
          mortalidade_35_dias_alerta?: number | null
          mortalidade_35_dias_ok?: number | null
          mortalidade_42_dias_alerta?: number | null
          mortalidade_42_dias_ok?: number | null
          mortalidade_7_dias_alerta?: number | null
          mortalidade_7_dias_ok?: number | null
          updated_at?: string | null
        }
        Update: {
          ca_14_dias_alerta?: number | null
          ca_14_dias_ok?: number | null
          ca_21_dias_alerta?: number | null
          ca_21_dias_ok?: number | null
          ca_28_dias_alerta?: number | null
          ca_28_dias_ok?: number | null
          ca_35_dias_alerta?: number | null
          ca_35_dias_ok?: number | null
          ca_42_dias_alerta?: number | null
          ca_42_dias_ok?: number | null
          ca_7_dias_alerta?: number | null
          ca_7_dias_ok?: number | null
          carencia_medicamento_minimo?: number | null
          consumo_14_dias_max?: number | null
          consumo_14_dias_min?: number | null
          consumo_21_dias_max?: number | null
          consumo_21_dias_min?: number | null
          consumo_28_dias_max?: number | null
          consumo_28_dias_min?: number | null
          consumo_35_dias_max?: number | null
          consumo_35_dias_min?: number | null
          consumo_42_dias_max?: number | null
          consumo_42_dias_min?: number | null
          consumo_7_dias_max?: number | null
          consumo_7_dias_min?: number | null
          created_at?: string | null
          id?: string
          integrado_id?: string
          mortalidade_14_dias_alerta?: number | null
          mortalidade_14_dias_ok?: number | null
          mortalidade_21_dias_alerta?: number | null
          mortalidade_21_dias_ok?: number | null
          mortalidade_28_dias_alerta?: number | null
          mortalidade_28_dias_ok?: number | null
          mortalidade_35_dias_alerta?: number | null
          mortalidade_35_dias_ok?: number | null
          mortalidade_42_dias_alerta?: number | null
          mortalidade_42_dias_ok?: number | null
          mortalidade_7_dias_alerta?: number | null
          mortalidade_7_dias_ok?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
          analise_ia: Json | null
          created_at: string
          data_registro: string
          id: string
          integrado_id: string
          lote_id: string
          temperatura_c: number | null
          umidade_pct: number | null
          updated_at: string
        }
        Insert: {
          analise_ia?: Json | null
          created_at?: string
          data_registro?: string
          id?: string
          integrado_id: string
          lote_id: string
          temperatura_c?: number | null
          umidade_pct?: number | null
          updated_at?: string
        }
        Update: {
          analise_ia?: Json | null
          created_at?: string
          data_registro?: string
          id?: string
          integrado_id?: string
          lote_id?: string
          temperatura_c?: number | null
          umidade_pct?: number | null
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
      mortalidade_fotos: {
        Row: {
          created_at: string
          id: string
          mortalidade_id: string
          motivo: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          mortalidade_id: string
          motivo: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          mortalidade_id?: string
          motivo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "mortalidade_fotos_mortalidade_id_fkey"
            columns: ["mortalidade_id"]
            isOneToOne: false
            referencedRelation: "mortalidade"
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
      nfe_racao_recebidas: {
        Row: {
          chave_nfe: string | null
          cnpj_fornecedor: string | null
          created_at: string
          data_emissao: string | null
          email_message_id: string | null
          erro_mensagem: string | null
          id: string
          integrado_id: string
          itens: Json | null
          lote_id: string | null
          numero_nfe: string | null
          processado_em: string | null
          processado_por: string | null
          razao_social_fornecedor: string | null
          serie: string | null
          solicitacao_racao_id: string | null
          status: Database["public"]["Enums"]["nfe_racao_status"]
          updated_at: string
          valor_frete: number | null
          valor_total: number | null
          xml_raw: string | null
        }
        Insert: {
          chave_nfe?: string | null
          cnpj_fornecedor?: string | null
          created_at?: string
          data_emissao?: string | null
          email_message_id?: string | null
          erro_mensagem?: string | null
          id?: string
          integrado_id: string
          itens?: Json | null
          lote_id?: string | null
          numero_nfe?: string | null
          processado_em?: string | null
          processado_por?: string | null
          razao_social_fornecedor?: string | null
          serie?: string | null
          solicitacao_racao_id?: string | null
          status?: Database["public"]["Enums"]["nfe_racao_status"]
          updated_at?: string
          valor_frete?: number | null
          valor_total?: number | null
          xml_raw?: string | null
        }
        Update: {
          chave_nfe?: string | null
          cnpj_fornecedor?: string | null
          created_at?: string
          data_emissao?: string | null
          email_message_id?: string | null
          erro_mensagem?: string | null
          id?: string
          integrado_id?: string
          itens?: Json | null
          lote_id?: string | null
          numero_nfe?: string | null
          processado_em?: string | null
          processado_por?: string | null
          razao_social_fornecedor?: string | null
          serie?: string | null
          solicitacao_racao_id?: string | null
          status?: Database["public"]["Enums"]["nfe_racao_status"]
          updated_at?: string
          valor_frete?: number | null
          valor_total?: number | null
          xml_raw?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfe_racao_recebidas_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfe_racao_recebidas_solicitacao_racao_id_fkey"
            columns: ["solicitacao_racao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_racao"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_fornecedor: {
        Row: {
          created_at: string
          data_leitura: string | null
          fornecedor_id: string
          id: string
          integrado_id: string
          lida: boolean
          mensagem: string
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string
          data_leitura?: string | null
          fornecedor_id: string
          id?: string
          integrado_id: string
          lida?: boolean
          mensagem: string
          tipo: string
          titulo: string
        }
        Update: {
          created_at?: string
          data_leitura?: string | null
          fornecedor_id?: string
          id?: string
          integrado_id?: string
          lida?: boolean
          mensagem?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_fornecedor_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes_usuario: {
        Row: {
          contexto: Json | null
          created_at: string
          id: string
          integrado_id: string | null
          lida: boolean
          lida_em: string | null
          link: string | null
          mensagem: string | null
          severidade: string
          tipo_evento_codigo: string
          titulo: string
          user_id: string
        }
        Insert: {
          contexto?: Json | null
          created_at?: string
          id?: string
          integrado_id?: string | null
          lida?: boolean
          lida_em?: string | null
          link?: string | null
          mensagem?: string | null
          severidade?: string
          tipo_evento_codigo: string
          titulo: string
          user_id: string
        }
        Update: {
          contexto?: Json | null
          created_at?: string
          id?: string
          integrado_id?: string | null
          lida?: boolean
          lida_em?: string | null
          link?: string | null
          mensagem?: string | null
          severidade?: string
          tipo_evento_codigo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      nucleo_alertas_config: {
        Row: {
          created_at: string
          created_by: string | null
          divergencia_temp_c: number
          habilitar_calor: boolean
          habilitar_chuva: boolean
          habilitar_frio: boolean
          habilitar_ith: boolean
          habilitar_sensor_suspeito: boolean
          habilitar_vento: boolean
          id: string
          integrado_id: string
          ith_max_critico: number | null
          nucleo_id: string | null
          prob_chuva_min_pct: number | null
          sensor_estagnado_min: number
          sensor_offline_min: number
          temp_max_critico: number | null
          temp_min_critico: number | null
          updated_at: string
          ur_divergencia_pp: number
          ur_suspeita_alta_pct: number
          ur_suspeita_baixa_pct: number
          vento_max_kmh: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          divergencia_temp_c?: number
          habilitar_calor?: boolean
          habilitar_chuva?: boolean
          habilitar_frio?: boolean
          habilitar_ith?: boolean
          habilitar_sensor_suspeito?: boolean
          habilitar_vento?: boolean
          id?: string
          integrado_id: string
          ith_max_critico?: number | null
          nucleo_id?: string | null
          prob_chuva_min_pct?: number | null
          sensor_estagnado_min?: number
          sensor_offline_min?: number
          temp_max_critico?: number | null
          temp_min_critico?: number | null
          updated_at?: string
          ur_divergencia_pp?: number
          ur_suspeita_alta_pct?: number
          ur_suspeita_baixa_pct?: number
          vento_max_kmh?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          divergencia_temp_c?: number
          habilitar_calor?: boolean
          habilitar_chuva?: boolean
          habilitar_frio?: boolean
          habilitar_ith?: boolean
          habilitar_sensor_suspeito?: boolean
          habilitar_vento?: boolean
          id?: string
          integrado_id?: string
          ith_max_critico?: number | null
          nucleo_id?: string | null
          prob_chuva_min_pct?: number | null
          sensor_estagnado_min?: number
          sensor_offline_min?: number
          temp_max_critico?: number | null
          temp_min_critico?: number | null
          updated_at?: string
          ur_divergencia_pp?: number
          ur_suspeita_alta_pct?: number
          ur_suspeita_baixa_pct?: number
          vento_max_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nucleo_alertas_config_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos"
            referencedColumns: ["id"]
          },
        ]
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
          timezone: string
          tipo_producao: string
          updated_at: string
          weather_ativo: boolean
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
          timezone?: string
          tipo_producao: string
          updated_at?: string
          weather_ativo?: boolean
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
          timezone?: string
          tipo_producao?: string
          updated_at?: string
          weather_ativo?: boolean
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
      nucleos_fornecedor: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          cliente_fornecedor_id: string
          created_at: string
          estado: string | null
          fornecedor_global_id: string
          id: string
          nome: string
          observacoes: string | null
          tipo_producao: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cliente_fornecedor_id: string
          created_at?: string
          estado?: string | null
          fornecedor_global_id: string
          id?: string
          nome: string
          observacoes?: string | null
          tipo_producao?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cliente_fornecedor_id?: string
          created_at?: string
          estado?: string | null
          fornecedor_global_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          tipo_producao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nucleos_fornecedor_cliente_fornecedor_id_fkey"
            columns: ["cliente_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "clientes_fornecedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nucleos_fornecedor_fornecedor_global_id_fkey"
            columns: ["fornecedor_global_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_globais"
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
      onboarding_steps: {
        Row: {
          concluida: boolean
          concluida_em: string | null
          created_at: string
          etapa: string
          id: string
          integrado_id: string
          notas: string | null
          updated_at: string
        }
        Insert: {
          concluida?: boolean
          concluida_em?: string | null
          created_at?: string
          etapa: string
          id?: string
          integrado_id: string
          notas?: string | null
          updated_at?: string
        }
        Update: {
          concluida?: boolean
          concluida_em?: string | null
          created_at?: string
          etapa?: string
          id?: string
          integrado_id?: string
          notas?: string | null
          updated_at?: string
        }
        Relationships: []
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
          fornecedor_confirmado_em: string | null
          fornecedor_enviado_em: string | null
          fornecedor_nf_numero: string | null
          fornecedor_observacoes: string | null
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
          fornecedor_confirmado_em?: string | null
          fornecedor_enviado_em?: string | null
          fornecedor_nf_numero?: string | null
          fornecedor_observacoes?: string | null
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
          fornecedor_confirmado_em?: string | null
          fornecedor_enviado_em?: string | null
          fornecedor_nf_numero?: string | null
          fornecedor_observacoes?: string | null
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
      override_iluminacao_canal: {
        Row: {
          ate_quando: string
          canal_id: string
          created_at: string
          created_by: string | null
          estado_forcado: string
          id: string
          integrado_id: string
          intensidade_pct: number | null
          motivo: string | null
        }
        Insert: {
          ate_quando: string
          canal_id: string
          created_at?: string
          created_by?: string | null
          estado_forcado: string
          id?: string
          integrado_id: string
          intensidade_pct?: number | null
          motivo?: string | null
        }
        Update: {
          ate_quando?: string
          canal_id?: string
          created_at?: string
          created_by?: string | null
          estado_forcado?: string
          id?: string
          integrado_id?: string
          intensidade_pct?: number | null
          motivo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "override_iluminacao_canal_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "canais_dispositivo"
            referencedColumns: ["id"]
          },
        ]
      }
      parceiros: {
        Row: {
          ativo: boolean
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          codigo_erp: string | null
          codigo_ibge: string | null
          complemento: string | null
          cpf_cnpj: string
          created_at: string
          email: string | null
          estado: string | null
          fornecedor_global_id: string | null
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
          codigo_erp?: string | null
          codigo_ibge?: string | null
          complemento?: string | null
          cpf_cnpj: string
          created_at?: string
          email?: string | null
          estado?: string | null
          fornecedor_global_id?: string | null
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
          codigo_erp?: string | null
          codigo_ibge?: string | null
          complemento?: string | null
          cpf_cnpj?: string
          created_at?: string
          email?: string | null
          estado?: string | null
          fornecedor_global_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "parceiros_fornecedor_global_id_fkey"
            columns: ["fornecedor_global_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_globais"
            referencedColumns: ["id"]
          },
        ]
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
          produto_id: string | null
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
          produto_id?: string | null
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
          produto_id?: string | null
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
      pedidos_catalogo_fornecedor: {
        Row: {
          chave_nfe: string | null
          cliente_fornecedor_id: string
          codigo_erp: string | null
          condicao_pagamento: string | null
          created_at: string | null
          data_entrega_prevista: string | null
          data_entrega_real: string | null
          data_faturamento: string | null
          data_pedido: string | null
          desconto_percentual: number | null
          erp_error_at: string | null
          erp_error_message: string | null
          fornecedor_global_id: string
          id: string
          numero_nfe: string | null
          numero_pedido: string
          observacoes: string | null
          status: string | null
          updated_at: string | null
          valor_bruto: number | null
          valor_desconto: number | null
          valor_total: number | null
          vendedor_fornecedor_id: string | null
        }
        Insert: {
          chave_nfe?: string | null
          cliente_fornecedor_id: string
          codigo_erp?: string | null
          condicao_pagamento?: string | null
          created_at?: string | null
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          data_faturamento?: string | null
          data_pedido?: string | null
          desconto_percentual?: number | null
          erp_error_at?: string | null
          erp_error_message?: string | null
          fornecedor_global_id: string
          id?: string
          numero_nfe?: string | null
          numero_pedido: string
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
          valor_bruto?: number | null
          valor_desconto?: number | null
          valor_total?: number | null
          vendedor_fornecedor_id?: string | null
        }
        Update: {
          chave_nfe?: string | null
          cliente_fornecedor_id?: string
          codigo_erp?: string | null
          condicao_pagamento?: string | null
          created_at?: string | null
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          data_faturamento?: string | null
          data_pedido?: string | null
          desconto_percentual?: number | null
          erp_error_at?: string | null
          erp_error_message?: string | null
          fornecedor_global_id?: string
          id?: string
          numero_nfe?: string | null
          numero_pedido?: string
          observacoes?: string | null
          status?: string | null
          updated_at?: string | null
          valor_bruto?: number | null
          valor_desconto?: number | null
          valor_total?: number | null
          vendedor_fornecedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_catalogo_fornecedor_cliente_fornecedor_id_fkey"
            columns: ["cliente_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "clientes_fornecedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_catalogo_fornecedor_fornecedor_global_id_fkey"
            columns: ["fornecedor_global_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_globais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_catalogo_fornecedor_vendedor_fornecedor_id_fkey"
            columns: ["vendedor_fornecedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores_fornecedor"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_catalogo_fornecedor_itens: {
        Row: {
          created_at: string | null
          desconto_item: number | null
          id: string
          pedido_id: string
          preco_unitario: number
          produto_catalogo_id: string
          promocao_id: string | null
          quantidade: number
          valor_total: number
        }
        Insert: {
          created_at?: string | null
          desconto_item?: number | null
          id?: string
          pedido_id: string
          preco_unitario: number
          produto_catalogo_id: string
          promocao_id?: string | null
          quantidade: number
          valor_total: number
        }
        Update: {
          created_at?: string | null
          desconto_item?: number | null
          id?: string
          pedido_id?: string
          preco_unitario?: number
          produto_catalogo_id?: string
          promocao_id?: string | null
          quantidade?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_catalogo_fornecedor_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_catalogo_fornecedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_catalogo_fornecedor_itens_produto_catalogo_id_fkey"
            columns: ["produto_catalogo_id"]
            isOneToOne: false
            referencedRelation: "produtos_catalogo_fornecedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_catalogo_fornecedor_itens_promocao_id_fkey"
            columns: ["promocao_id"]
            isOneToOne: false
            referencedRelation: "promocoes_fornecedor"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_fornecedor: {
        Row: {
          created_at: string
          data_entrega_prevista: string | null
          data_entrega_real: string | null
          data_pedido: string
          fornecedor_id: string
          id: string
          integrado_id: string
          numero_pedido: string
          observacoes: string | null
          status: string
          updated_at: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          data_pedido?: string
          fornecedor_id: string
          id?: string
          integrado_id: string
          numero_pedido: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Update: {
          created_at?: string
          data_entrega_prevista?: string | null
          data_entrega_real?: string | null
          data_pedido?: string
          fornecedor_id?: string
          id?: string
          integrado_id?: string
          numero_pedido?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_fornecedor_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos_fornecedor_itens: {
        Row: {
          created_at: string
          id: string
          pedido_id: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          unidade: string
          valor_total: number
        }
        Insert: {
          created_at?: string
          id?: string
          pedido_id: string
          preco_unitario: number
          produto_id: string
          quantidade: number
          unidade: string
          valor_total: number
        }
        Update: {
          created_at?: string
          id?: string
          pedido_id?: string
          preco_unitario?: number
          produto_id?: string
          quantidade?: number
          unidade?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_fornecedor_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos_fornecedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_fornecedor_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
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
          consumo_real_kg: number | null
          conversao_alimentar: number | null
          created_at: string
          data_pesagem: string
          id: string
          integrado_id: string
          lote_id: string
          nivel_silo_kg: number | null
          total_recebido_kg: number | null
          updated_at: string
        }
        Insert: {
          consumo_real_kg?: number | null
          conversao_alimentar?: number | null
          created_at?: string
          data_pesagem?: string
          id?: string
          integrado_id: string
          lote_id: string
          nivel_silo_kg?: number | null
          total_recebido_kg?: number | null
          updated_at?: string
        }
        Update: {
          consumo_real_kg?: number | null
          conversao_alimentar?: number | null
          created_at?: string
          data_pesagem?: string
          id?: string
          integrado_id?: string
          lote_id?: string
          nivel_silo_kg?: number | null
          total_recebido_kg?: number | null
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
      politica_recuperacao_iot: {
        Row: {
          aplicar_schedule_offline: boolean
          created_at: string
          dispositivo_id: string | null
          escopo: string
          galpao_id: string | null
          id: string
          integrado_id: string
          limite_horas_offline: number
          observacoes: string | null
          restaurar_ultimo_estado: boolean
          updated_at: string
        }
        Insert: {
          aplicar_schedule_offline?: boolean
          created_at?: string
          dispositivo_id?: string | null
          escopo: string
          galpao_id?: string | null
          id?: string
          integrado_id: string
          limite_horas_offline?: number
          observacoes?: string | null
          restaurar_ultimo_estado?: boolean
          updated_at?: string
        }
        Update: {
          aplicar_schedule_offline?: boolean
          created_at?: string
          dispositivo_id?: string | null
          escopo?: string
          galpao_id?: string | null
          id?: string
          integrado_id?: string
          limite_horas_offline?: number
          observacoes?: string | null
          restaurar_ultimo_estado?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "politica_recuperacao_iot_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos_iot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "politica_recuperacao_iot_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: false
            referencedRelation: "galpoes"
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
      prazos_pagamento_fornecedor: {
        Row: {
          ativo: boolean | null
          codigo_erp: string | null
          created_at: string | null
          dias_parcelas: number[]
          forma_pagamento_id: string
          fornecedor_global_id: string
          id: string
          nome: string
          padrao: boolean | null
          quantidade_parcelas: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo_erp?: string | null
          created_at?: string | null
          dias_parcelas?: number[]
          forma_pagamento_id: string
          fornecedor_global_id: string
          id?: string
          nome: string
          padrao?: boolean | null
          quantidade_parcelas?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo_erp?: string | null
          created_at?: string | null
          dias_parcelas?: number[]
          forma_pagamento_id?: string
          fornecedor_global_id?: string
          id?: string
          nome?: string
          padrao?: boolean | null
          quantidade_parcelas?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prazos_pagamento_fornecedor_forma_pagamento_id_fkey"
            columns: ["forma_pagamento_id"]
            isOneToOne: false
            referencedRelation: "formas_pagamento_fornecedor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prazos_pagamento_fornecedor_fornecedor_global_id_fkey"
            columns: ["fornecedor_global_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_globais"
            referencedColumns: ["id"]
          },
        ]
      }
      preferencias_notificacao: {
        Row: {
          created_at: string
          email_ativo: boolean
          id: string
          push_ativo: boolean
          tipo_evento_codigo: string
          updated_at: string
          user_id: string
          whatsapp_ativo: boolean
        }
        Insert: {
          created_at?: string
          email_ativo?: boolean
          id?: string
          push_ativo?: boolean
          tipo_evento_codigo: string
          updated_at?: string
          user_id: string
          whatsapp_ativo?: boolean
        }
        Update: {
          created_at?: string
          email_ativo?: boolean
          id?: string
          push_ativo?: boolean
          tipo_evento_codigo?: string
          updated_at?: string
          user_id?: string
          whatsapp_ativo?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "preferencias_notificacao_tipo_evento_codigo_fkey"
            columns: ["tipo_evento_codigo"]
            isOneToOne: false
            referencedRelation: "tipos_evento_notificacao"
            referencedColumns: ["codigo"]
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
          codigo_erp: string | null
          codigo_produto_fornecedor: string | null
          created_at: string
          descricao_produto_fornecedor: string | null
          fator_conversao_fornecedor: number | null
          fornecedor_principal: boolean | null
          gtin_esperado: string | null
          id: string
          integrado_id: string
          parceiro_id: string
          prazo_entrega_dias: number | null
          preco_compra: number | null
          produto_id: string
          quantidade_minima: number | null
          unidade_compra_fornecedor: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          codigo_erp?: string | null
          codigo_produto_fornecedor?: string | null
          created_at?: string
          descricao_produto_fornecedor?: string | null
          fator_conversao_fornecedor?: number | null
          fornecedor_principal?: boolean | null
          gtin_esperado?: string | null
          id?: string
          integrado_id: string
          parceiro_id: string
          prazo_entrega_dias?: number | null
          preco_compra?: number | null
          produto_id: string
          quantidade_minima?: number | null
          unidade_compra_fornecedor?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          codigo_erp?: string | null
          codigo_produto_fornecedor?: string | null
          created_at?: string
          descricao_produto_fornecedor?: string | null
          fator_conversao_fornecedor?: number | null
          fornecedor_principal?: boolean | null
          gtin_esperado?: string | null
          id?: string
          integrado_id?: string
          parceiro_id?: string
          prazo_entrega_dias?: number | null
          preco_compra?: number | null
          produto_id?: string
          quantidade_minima?: number | null
          unidade_compra_fornecedor?: string | null
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
      produtos_catalogo_fornecedor: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo_barras: string | null
          codigo_erp: string | null
          codigo_interno: string
          created_at: string
          custo: number | null
          descricao: string | null
          estoque_minimo: number | null
          estoque_proprio: number | null
          fornecedor_global_id: string
          id: string
          imagem_url: string | null
          marca: string | null
          ncm: string | null
          nome: string
          preco_tabela: number | null
          unidade_venda: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo_barras?: string | null
          codigo_erp?: string | null
          codigo_interno: string
          created_at?: string
          custo?: number | null
          descricao?: string | null
          estoque_minimo?: number | null
          estoque_proprio?: number | null
          fornecedor_global_id: string
          id?: string
          imagem_url?: string | null
          marca?: string | null
          ncm?: string | null
          nome: string
          preco_tabela?: number | null
          unidade_venda?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo_barras?: string | null
          codigo_erp?: string | null
          codigo_interno?: string
          created_at?: string
          custo?: number | null
          descricao?: string | null
          estoque_minimo?: number | null
          estoque_proprio?: number | null
          fornecedor_global_id?: string
          id?: string
          imagem_url?: string | null
          marca?: string | null
          ncm?: string | null
          nome?: string
          preco_tabela?: number | null
          unidade_venda?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_catalogo_fornecedor_fornecedor_global_id_fkey"
            columns: ["fornecedor_global_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_globais"
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
          estoque_alerta: number | null
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
          estoque_alerta?: number | null
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
          estoque_alerta?: number | null
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
          fornecedor_global_id: string | null
          full_name: string | null
          id: string
          integrado_id: string | null
          is_demo: boolean | null
          parceiro_id: string | null
          phone: string | null
          role: string | null
          senha_alterada: boolean | null
          updated_at: string
          vendedor_fornecedor_id: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          fornecedor_global_id?: string | null
          full_name?: string | null
          id: string
          integrado_id?: string | null
          is_demo?: boolean | null
          parceiro_id?: string | null
          phone?: string | null
          role?: string | null
          senha_alterada?: boolean | null
          updated_at?: string
          vendedor_fornecedor_id?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string
          fornecedor_global_id?: string | null
          full_name?: string | null
          id?: string
          integrado_id?: string | null
          is_demo?: boolean | null
          parceiro_id?: string | null
          phone?: string | null
          role?: string | null
          senha_alterada?: boolean | null
          updated_at?: string
          vendedor_fornecedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_fornecedor_global_id_fkey"
            columns: ["fornecedor_global_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_globais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      programa_cortina_inteligente: {
        Row: {
          ativo: boolean
          considerar_vento_externo: boolean
          created_at: string
          galpao_id: string
          id: string
          integrado_id: string
          modo: string
          offset_estagio_heat_stress_pct: number
          offset_estagio_min_pct: number
          offset_estagio_transicao_pct: number
          offset_estagio_tunel_pct: number
          posicao_max_pct: number
          posicao_min_pct: number
          programa_ventilacao_id: string | null
          updated_at: string
          velocidade_abertura_pct_min: number
          velocidade_fechamento_pct_min: number
          vento_externo_max_ms: number | null
        }
        Insert: {
          ativo?: boolean
          considerar_vento_externo?: boolean
          created_at?: string
          galpao_id: string
          id?: string
          integrado_id: string
          modo?: string
          offset_estagio_heat_stress_pct?: number
          offset_estagio_min_pct?: number
          offset_estagio_transicao_pct?: number
          offset_estagio_tunel_pct?: number
          posicao_max_pct?: number
          posicao_min_pct?: number
          programa_ventilacao_id?: string | null
          updated_at?: string
          velocidade_abertura_pct_min?: number
          velocidade_fechamento_pct_min?: number
          vento_externo_max_ms?: number | null
        }
        Update: {
          ativo?: boolean
          considerar_vento_externo?: boolean
          created_at?: string
          galpao_id?: string
          id?: string
          integrado_id?: string
          modo?: string
          offset_estagio_heat_stress_pct?: number
          offset_estagio_min_pct?: number
          offset_estagio_transicao_pct?: number
          offset_estagio_tunel_pct?: number
          posicao_max_pct?: number
          posicao_min_pct?: number
          programa_ventilacao_id?: string | null
          updated_at?: string
          velocidade_abertura_pct_min?: number
          velocidade_fechamento_pct_min?: number
          vento_externo_max_ms?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "programa_cortina_inteligente_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: true
            referencedRelation: "galpoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programa_cortina_inteligente_programa_ventilacao_id_fkey"
            columns: ["programa_ventilacao_id"]
            isOneToOne: false
            referencedRelation: "programa_ventilacao_galpao"
            referencedColumns: ["id"]
          },
        ]
      }
      programa_cortina_lote: {
        Row: {
          ativo: boolean
          created_at: string
          dia_fim: number
          dia_inicio: number
          hora_abrir: string
          hora_fechar: string
          id: string
          integrado_id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dia_fim: number
          dia_inicio: number
          hora_abrir?: string
          hora_fechar?: string
          id?: string
          integrado_id: string
          nome?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dia_fim?: number
          dia_inicio?: number
          hora_abrir?: string
          hora_fechar?: string
          id?: string
          integrado_id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      programa_iluminacao_faixa: {
        Row: {
          acender_offset_min: number
          apagar_offset_min: number
          blocos: Json
          created_at: string
          dia_fim: number
          dia_inicio: number
          horas_luz: number
          id: string
          intensidade_pct: number
          modo_horario: string
          observacoes: string | null
          programa_id: string
          ramp_down_min: number
          ramp_up_min: number
        }
        Insert: {
          acender_offset_min?: number
          apagar_offset_min?: number
          blocos?: Json
          created_at?: string
          dia_fim: number
          dia_inicio: number
          horas_luz: number
          id?: string
          intensidade_pct?: number
          modo_horario?: string
          observacoes?: string | null
          programa_id: string
          ramp_down_min?: number
          ramp_up_min?: number
        }
        Update: {
          acender_offset_min?: number
          apagar_offset_min?: number
          blocos?: Json
          created_at?: string
          dia_fim?: number
          dia_inicio?: number
          horas_luz?: number
          id?: string
          intensidade_pct?: number
          modo_horario?: string
          observacoes?: string | null
          programa_id?: string
          ramp_down_min?: number
          ramp_up_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "programa_iluminacao_faixa_programa_id_fkey"
            columns: ["programa_id"]
            isOneToOne: false
            referencedRelation: "programa_iluminacao_lote"
            referencedColumns: ["id"]
          },
        ]
      }
      programa_iluminacao_lote: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          integrado_id: string
          is_default: boolean
          nome: string
          tipo_producao: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id: string
          is_default?: boolean
          nome: string
          tipo_producao?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          integrado_id?: string
          is_default?: boolean
          nome?: string
          tipo_producao?: string
          updated_at?: string
        }
        Relationships: []
      }
      programa_nebulizacao_galpao: {
        Row: {
          ativo: boolean
          ciclo_off_seg: number
          ciclo_on_seg: number
          cooldown_seg: number
          created_at: string
          delta_temp_acionar_c: number
          galpao_id: string
          idade_minima_dias: number
          integrado_id: string
          ultimo_acionamento_em: string | null
          ultimo_estado: string | null
          updated_at: string
          ur_max_pct: number
          ventilacao_min_pct: number
        }
        Insert: {
          ativo?: boolean
          ciclo_off_seg?: number
          ciclo_on_seg?: number
          cooldown_seg?: number
          created_at?: string
          delta_temp_acionar_c?: number
          galpao_id: string
          idade_minima_dias?: number
          integrado_id: string
          ultimo_acionamento_em?: string | null
          ultimo_estado?: string | null
          updated_at?: string
          ur_max_pct?: number
          ventilacao_min_pct?: number
        }
        Update: {
          ativo?: boolean
          ciclo_off_seg?: number
          ciclo_on_seg?: number
          cooldown_seg?: number
          created_at?: string
          delta_temp_acionar_c?: number
          galpao_id?: string
          idade_minima_dias?: number
          integrado_id?: string
          ultimo_acionamento_em?: string | null
          ultimo_estado?: string | null
          updated_at?: string
          ur_max_pct?: number
          ventilacao_min_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "programa_nebulizacao_galpao_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: true
            referencedRelation: "galpoes"
            referencedColumns: ["id"]
          },
        ]
      }
      programa_ventilacao_galpao: {
        Row: {
          area_transversal_m2: number | null
          ativo: boolean
          created_at: string
          estagios: Json
          galpao_id: string
          id: string
          integrado_id: string
          modo: string
          pressao_estatica_alvo_pa: number | null
          troca_ar_brooding_ativa: boolean
          troca_ar_brooding_max_pct: number
          updated_at: string
          velocidade_alvo_ms_max: number | null
          velocidade_alvo_ms_min: number | null
        }
        Insert: {
          area_transversal_m2?: number | null
          ativo?: boolean
          created_at?: string
          estagios?: Json
          galpao_id: string
          id?: string
          integrado_id: string
          modo?: string
          pressao_estatica_alvo_pa?: number | null
          troca_ar_brooding_ativa?: boolean
          troca_ar_brooding_max_pct?: number
          updated_at?: string
          velocidade_alvo_ms_max?: number | null
          velocidade_alvo_ms_min?: number | null
        }
        Update: {
          area_transversal_m2?: number | null
          ativo?: boolean
          created_at?: string
          estagios?: Json
          galpao_id?: string
          id?: string
          integrado_id?: string
          modo?: string
          pressao_estatica_alvo_pa?: number | null
          troca_ar_brooding_ativa?: boolean
          troca_ar_brooding_max_pct?: number
          updated_at?: string
          velocidade_alvo_ms_max?: number | null
          velocidade_alvo_ms_min?: number | null
        }
        Relationships: []
      }
      promocoes_fornecedor: {
        Row: {
          ativo: boolean
          created_at: string
          data_fim: string
          data_inicio: string
          descricao: string | null
          fornecedor_id: string
          id: string
          percentual_desconto: number | null
          preco_promocional: number | null
          produto_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_fim: string
          data_inicio: string
          descricao?: string | null
          fornecedor_id: string
          id?: string
          percentual_desconto?: number | null
          preco_promocional?: number | null
          produto_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_fim?: string
          data_inicio?: string
          descricao?: string | null
          fornecedor_id?: string
          id?: string
          percentual_desconto?: number | null
          preco_promocional?: number | null
          produto_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promocoes_fornecedor_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promocoes_fornecedor_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimento_itens: {
        Row: {
          codigo_produto_nfe: string | null
          created_at: string
          data_validade: string | null
          descricao_produto_nfe: string | null
          fator_conversao: number | null
          gtin_esperado: string | null
          gtin_nfe: string | null
          id: string
          lote_fornecedor: string | null
          ordem_compra_item_id: string | null
          preco_nfe: number | null
          preco_oc: number | null
          produto_id: string | null
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
          gtin_esperado?: string | null
          gtin_nfe?: string | null
          id?: string
          lote_fornecedor?: string | null
          ordem_compra_item_id?: string | null
          preco_nfe?: number | null
          preco_oc?: number | null
          produto_id?: string | null
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
          gtin_esperado?: string | null
          gtin_nfe?: string | null
          id?: string
          lote_fornecedor?: string | null
          ordem_compra_item_id?: string | null
          preco_nfe?: number | null
          preco_oc?: number | null
          produto_id?: string | null
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
      regras_automacao_avancada: {
        Row: {
          acao: string
          ativo: boolean
          canal_alvo_id: string | null
          created_at: string
          descricao: string | null
          dia_fim: number | null
          dia_inicio: number | null
          duracao_minutos: number | null
          galpao_id: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          integrado_id: string
          nome: string
          prioridade: number
          temp_max_c: number | null
          temp_min_c: number | null
          umidade_max_pct: number | null
          umidade_min_pct: number | null
          updated_at: string
        }
        Insert: {
          acao?: string
          ativo?: boolean
          canal_alvo_id?: string | null
          created_at?: string
          descricao?: string | null
          dia_fim?: number | null
          dia_inicio?: number | null
          duracao_minutos?: number | null
          galpao_id?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          integrado_id: string
          nome: string
          prioridade?: number
          temp_max_c?: number | null
          temp_min_c?: number | null
          umidade_max_pct?: number | null
          umidade_min_pct?: number | null
          updated_at?: string
        }
        Update: {
          acao?: string
          ativo?: boolean
          canal_alvo_id?: string | null
          created_at?: string
          descricao?: string | null
          dia_fim?: number | null
          dia_inicio?: number | null
          duracao_minutos?: number | null
          galpao_id?: string | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          integrado_id?: string
          nome?: string
          prioridade?: number
          temp_max_c?: number | null
          temp_min_c?: number | null
          umidade_max_pct?: number | null
          umidade_min_pct?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regras_automacao_avancada_canal_alvo_id_fkey"
            columns: ["canal_alvo_id"]
            isOneToOne: false
            referencedRelation: "canais_dispositivo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regras_automacao_avancada_galpao_id_fkey"
            columns: ["galpao_id"]
            isOneToOne: false
            referencedRelation: "galpoes"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_temperatura_lote: {
        Row: {
          ativo: boolean
          cortina_pos_max_pct: number | null
          cortina_pos_min_pct: number | null
          created_at: string
          dia_fim: number
          dia_inicio: number
          id: string
          integrado_id: string
          nebulizador_cooldown_seg: number | null
          nebulizador_min_duracao_seg: number | null
          nebulizador_temp_off_c: number | null
          nebulizador_umid_off_pct: number | null
          nome: string
          temp_max_c: number
          temp_min_c: number
          umidade_max_pct: number | null
          umidade_min_pct: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cortina_pos_max_pct?: number | null
          cortina_pos_min_pct?: number | null
          created_at?: string
          dia_fim: number
          dia_inicio: number
          id?: string
          integrado_id: string
          nebulizador_cooldown_seg?: number | null
          nebulizador_min_duracao_seg?: number | null
          nebulizador_temp_off_c?: number | null
          nebulizador_umid_off_pct?: number | null
          nome?: string
          temp_max_c: number
          temp_min_c: number
          umidade_max_pct?: number | null
          umidade_min_pct?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cortina_pos_max_pct?: number | null
          cortina_pos_min_pct?: number | null
          created_at?: string
          dia_fim?: number
          dia_inicio?: number
          id?: string
          integrado_id?: string
          nebulizador_cooldown_seg?: number | null
          nebulizador_min_duracao_seg?: number | null
          nebulizador_temp_off_c?: number | null
          nebulizador_umid_off_pct?: number | null
          nome?: string
          temp_max_c?: number
          temp_min_c?: number
          umidade_max_pct?: number | null
          umidade_min_pct?: number | null
          updated_at?: string
        }
        Relationships: []
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
      security_definer_audit_log: {
        Row: {
          called_at: string
          extra: Json | null
          function_name: string
          id: string
          integrado_id: string | null
          key_param: string | null
          user_id: string | null
        }
        Insert: {
          called_at?: string
          extra?: Json | null
          function_name: string
          id?: string
          integrado_id?: string | null
          key_param?: string | null
          user_id?: string | null
        }
        Update: {
          called_at?: string
          extra?: Json | null
          function_name?: string
          id?: string
          integrado_id?: string | null
          key_param?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      solar_diario: {
        Row: {
          created_at: string
          crepusculo_civil_fim: string | null
          crepusculo_civil_inicio: string | null
          data: string
          fotoperiodo_min: number | null
          id: string
          integrado_id: string
          nascer_sol: string | null
          nucleo_id: string
          por_sol: string | null
        }
        Insert: {
          created_at?: string
          crepusculo_civil_fim?: string | null
          crepusculo_civil_inicio?: string | null
          data: string
          fotoperiodo_min?: number | null
          id?: string
          integrado_id: string
          nascer_sol?: string | null
          nucleo_id: string
          por_sol?: string | null
        }
        Update: {
          created_at?: string
          crepusculo_civil_fim?: string | null
          crepusculo_civil_inicio?: string | null
          data?: string
          fotoperiodo_min?: number | null
          id?: string
          integrado_id?: string
          nascer_sol?: string | null
          nucleo_id?: string
          por_sol?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solar_diario_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos"
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
          urgente: boolean | null
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
          urgente?: boolean | null
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
          urgente?: boolean | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          atribuido_a: string | null
          categoria: string | null
          created_at: string
          criado_por: string | null
          descricao: string | null
          id: string
          integrado_id: string
          prioridade: Database["public"]["Enums"]["ticket_prioridade"]
          resolvido_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          atribuido_a?: string | null
          categoria?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          integrado_id: string
          prioridade?: Database["public"]["Enums"]["ticket_prioridade"]
          resolvido_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          atribuido_a?: string | null
          categoria?: string | null
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          integrado_id?: string
          prioridade?: Database["public"]["Enums"]["ticket_prioridade"]
          resolvido_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_erp_api_keys: {
        Row: {
          api_key_hash: string
          ativo: boolean | null
          created_at: string
          fornecedor_global_id: string
          id: string
          nome: string
          ultimo_uso: string | null
        }
        Insert: {
          api_key_hash: string
          ativo?: boolean | null
          created_at?: string
          fornecedor_global_id: string
          id?: string
          nome: string
          ultimo_uso?: string | null
        }
        Update: {
          api_key_hash?: string
          ativo?: boolean | null
          created_at?: string
          fornecedor_global_id?: string
          id?: string
          nome?: string
          ultimo_uso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_erp_api_keys_fornecedor_global_id_fkey"
            columns: ["fornecedor_global_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_globais"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_erp_log: {
        Row: {
          created_at: string
          detalhes: Json | null
          direcao: string
          erros: Json | null
          fornecedor_global_id: string
          id: string
          registros_enviados: number | null
          registros_erro: number | null
          registros_processados: number | null
          tipo_entidade: string
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          direcao: string
          erros?: Json | null
          fornecedor_global_id: string
          id?: string
          registros_enviados?: number | null
          registros_erro?: number | null
          registros_processados?: number | null
          tipo_entidade: string
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          direcao?: string
          erros?: Json | null
          fornecedor_global_id?: string
          id?: string
          registros_enviados?: number | null
          registros_erro?: number | null
          registros_processados?: number | null
          tipo_entidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_erp_log_fornecedor_global_id_fkey"
            columns: ["fornecedor_global_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_globais"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_erp_mapeamento: {
        Row: {
          created_at: string
          fornecedor_global_id: string
          id: string
          id_cloud: string
          id_erp: string
          tipo_entidade: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fornecedor_global_id: string
          id?: string
          id_cloud: string
          id_erp: string
          tipo_entidade: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fornecedor_global_id?: string
          id?: string
          id_cloud?: string
          id_erp?: string
          tipo_entidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_erp_mapeamento_fornecedor_global_id_fkey"
            columns: ["fornecedor_global_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_globais"
            referencedColumns: ["id"]
          },
        ]
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
      termos_aceites: {
        Row: {
          aceito_em: string | null
          conteudo_hash: string | null
          created_at: string | null
          fornecedor_global_id: string | null
          id: string
          ip_address: string | null
          parceiro_id: string | null
          termo_versao_id: string
          tipo_termo: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          aceito_em?: string | null
          conteudo_hash?: string | null
          created_at?: string | null
          fornecedor_global_id?: string | null
          id?: string
          ip_address?: string | null
          parceiro_id?: string | null
          termo_versao_id: string
          tipo_termo: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          aceito_em?: string | null
          conteudo_hash?: string | null
          created_at?: string | null
          fornecedor_global_id?: string | null
          id?: string
          ip_address?: string | null
          parceiro_id?: string | null
          termo_versao_id?: string
          tipo_termo?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "termos_aceites_fornecedor_global_id_fkey"
            columns: ["fornecedor_global_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_globais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termos_aceites_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termos_aceites_termo_versao_id_fkey"
            columns: ["termo_versao_id"]
            isOneToOne: false
            referencedRelation: "termos_versoes"
            referencedColumns: ["id"]
          },
        ]
      }
      termos_versoes: {
        Row: {
          ativo: boolean | null
          checkbox_texto: string
          conteudo_html: string
          created_at: string | null
          data_vigencia: string | null
          id: string
          tipo: string
          titulo: string
          versao: string
        }
        Insert: {
          ativo?: boolean | null
          checkbox_texto: string
          conteudo_html: string
          created_at?: string | null
          data_vigencia?: string | null
          id?: string
          tipo: string
          titulo: string
          versao: string
        }
        Update: {
          ativo?: boolean | null
          checkbox_texto?: string
          conteudo_html?: string
          created_at?: string | null
          data_vigencia?: string | null
          id?: string
          tipo?: string
          titulo?: string
          versao?: string
        }
        Relationships: []
      }
      timers_seguranca_iot: {
        Row: {
          canal_id: string | null
          created_at: string
          dispositivo_id: string
          estado_desejado: string
          hora_fim: string
          hora_inicio: string
          id: string
          idade_lote_dias: number
          integrado_id: string
          intervalo_minutos: number | null
          janela_horaria_fim: string | null
          janela_horaria_inicio: string | null
          lote_id: string | null
          modo: Database["public"]["Enums"]["modo_protecao_offline"]
          origem_setpoint: Database["public"]["Enums"]["origem_setpoint_offline"]
          setpoint_editado_em: string | null
          setpoint_editado_por: string | null
          sincronizado: boolean
          sincronizado_em: string | null
          temp_desliga_c: number | null
          temp_liga_c: number | null
          timer_index_ewelink: number | null
          tipo_timer: Database["public"]["Enums"]["tipo_timer_seguranca"]
          umidade_max_pct: number | null
          updated_at: string
        }
        Insert: {
          canal_id?: string | null
          created_at?: string
          dispositivo_id: string
          estado_desejado?: string
          hora_fim: string
          hora_inicio: string
          id?: string
          idade_lote_dias: number
          integrado_id: string
          intervalo_minutos?: number | null
          janela_horaria_fim?: string | null
          janela_horaria_inicio?: string | null
          lote_id?: string | null
          modo?: Database["public"]["Enums"]["modo_protecao_offline"]
          origem_setpoint?: Database["public"]["Enums"]["origem_setpoint_offline"]
          setpoint_editado_em?: string | null
          setpoint_editado_por?: string | null
          sincronizado?: boolean
          sincronizado_em?: string | null
          temp_desliga_c?: number | null
          temp_liga_c?: number | null
          timer_index_ewelink?: number | null
          tipo_timer: Database["public"]["Enums"]["tipo_timer_seguranca"]
          umidade_max_pct?: number | null
          updated_at?: string
        }
        Update: {
          canal_id?: string | null
          created_at?: string
          dispositivo_id?: string
          estado_desejado?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          idade_lote_dias?: number
          integrado_id?: string
          intervalo_minutos?: number | null
          janela_horaria_fim?: string | null
          janela_horaria_inicio?: string | null
          lote_id?: string | null
          modo?: Database["public"]["Enums"]["modo_protecao_offline"]
          origem_setpoint?: Database["public"]["Enums"]["origem_setpoint_offline"]
          setpoint_editado_em?: string | null
          setpoint_editado_por?: string | null
          sincronizado?: boolean
          sincronizado_em?: string | null
          temp_desliga_c?: number | null
          temp_liga_c?: number | null
          timer_index_ewelink?: number | null
          tipo_timer?: Database["public"]["Enums"]["tipo_timer_seguranca"]
          umidade_max_pct?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timers_seguranca_iot_canal_id_fkey"
            columns: ["canal_id"]
            isOneToOne: false
            referencedRelation: "canais_dispositivo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_seguranca_iot_dispositivo_id_fkey"
            columns: ["dispositivo_id"]
            isOneToOne: false
            referencedRelation: "dispositivos_iot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timers_seguranca_iot_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_evento_notificacao: {
        Row: {
          ativo: boolean
          canais_padrao: string[]
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          roles_padrao: Database["public"]["Enums"]["app_role"][]
          severidade_padrao: string
        }
        Insert: {
          ativo?: boolean
          canais_padrao?: string[]
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          roles_padrao?: Database["public"]["Enums"]["app_role"][]
          severidade_padrao?: string
        }
        Update: {
          ativo?: boolean
          canais_padrao?: string[]
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          roles_padrao?: Database["public"]["Enums"]["app_role"][]
          severidade_padrao?: string
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
      vendedores_fornecedor: {
        Row: {
          ativo: boolean
          codigo_vendedor: string | null
          created_at: string
          email: string | null
          fornecedor_global_id: string
          id: string
          nome: string
          observacoes: string | null
          regiao: string | null
          telefone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          codigo_vendedor?: string | null
          created_at?: string
          email?: string | null
          fornecedor_global_id: string
          id?: string
          nome: string
          observacoes?: string | null
          regiao?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          codigo_vendedor?: string | null
          created_at?: string
          email?: string | null
          fornecedor_global_id?: string
          id?: string
          nome?: string
          observacoes?: string | null
          regiao?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendedores_fornecedor_fornecedor_global_id_fkey"
            columns: ["fornecedor_global_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_globais"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_forecast_horario: {
        Row: {
          condicao_codigo: number | null
          created_at: string
          hora_prevista: string
          id: string
          integrado_id: string
          ith: number | null
          nucleo_id: string
          precipitacao_mm: number | null
          prob_chuva_pct: number | null
          temperatura_c: number | null
          umidade_pct: number | null
          uv_index: number | null
          vento_kmh: number | null
        }
        Insert: {
          condicao_codigo?: number | null
          created_at?: string
          hora_prevista: string
          id?: string
          integrado_id: string
          ith?: number | null
          nucleo_id: string
          precipitacao_mm?: number | null
          prob_chuva_pct?: number | null
          temperatura_c?: number | null
          umidade_pct?: number | null
          uv_index?: number | null
          vento_kmh?: number | null
        }
        Update: {
          condicao_codigo?: number | null
          created_at?: string
          hora_prevista?: string
          id?: string
          integrado_id?: string
          ith?: number | null
          nucleo_id?: string
          precipitacao_mm?: number | null
          prob_chuva_pct?: number | null
          temperatura_c?: number | null
          umidade_pct?: number | null
          uv_index?: number | null
          vento_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_forecast_horario_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_historico_3h: {
        Row: {
          created_at: string
          id: string
          integrado_id: string
          ith_max: number | null
          ith_med: number | null
          nucleo_id: string
          precipitacao_mm: number | null
          temp_max: number | null
          temp_med: number | null
          temp_min: number | null
          ts_3h: string
          ur_med: number | null
          vento_max: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          integrado_id: string
          ith_max?: number | null
          ith_med?: number | null
          nucleo_id: string
          precipitacao_mm?: number | null
          temp_max?: number | null
          temp_med?: number | null
          temp_min?: number | null
          ts_3h: string
          ur_med?: number | null
          vento_max?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          integrado_id?: string
          ith_max?: number | null
          ith_med?: number | null
          nucleo_id?: string
          precipitacao_mm?: number | null
          temp_max?: number | null
          temp_med?: number | null
          temp_min?: number | null
          ts_3h?: string
          ur_med?: number | null
          vento_max?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_historico_3h_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: false
            referencedRelation: "nucleos"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_lote_diario: {
        Row: {
          created_at: string
          data: string
          dentro_conforto_pct: number | null
          horas_calor: number | null
          horas_frio: number | null
          horas_ith_alto: number | null
          id: string
          idade_dias: number | null
          integrado_id: string
          ith_max: number | null
          ith_med: number | null
          lote_id: string
          temp_max: number | null
          temp_med: number | null
          temp_min: number | null
          ur_med: number | null
        }
        Insert: {
          created_at?: string
          data: string
          dentro_conforto_pct?: number | null
          horas_calor?: number | null
          horas_frio?: number | null
          horas_ith_alto?: number | null
          id?: string
          idade_dias?: number | null
          integrado_id: string
          ith_max?: number | null
          ith_med?: number | null
          lote_id: string
          temp_max?: number | null
          temp_med?: number | null
          temp_min?: number | null
          ur_med?: number | null
        }
        Update: {
          created_at?: string
          data?: string
          dentro_conforto_pct?: number | null
          horas_calor?: number | null
          horas_frio?: number | null
          horas_ith_alto?: number | null
          id?: string
          idade_dias?: number | null
          integrado_id?: string
          ith_max?: number | null
          ith_med?: number | null
          lote_id?: string
          temp_max?: number | null
          temp_med?: number | null
          temp_min?: number | null
          ur_med?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_lote_diario_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "lotes"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_observacoes: {
        Row: {
          atualizado_em: string
          condicao_codigo: number | null
          condicao_texto: string | null
          id: string
          integrado_id: string
          nucleo_id: string
          observado_em: string
          precipitacao_mm: number | null
          temperatura_c: number | null
          umidade_pct: number | null
          uv_index: number | null
          vento_direcao_deg: number | null
          vento_kmh: number | null
        }
        Insert: {
          atualizado_em?: string
          condicao_codigo?: number | null
          condicao_texto?: string | null
          id?: string
          integrado_id: string
          nucleo_id: string
          observado_em: string
          precipitacao_mm?: number | null
          temperatura_c?: number | null
          umidade_pct?: number | null
          uv_index?: number | null
          vento_direcao_deg?: number | null
          vento_kmh?: number | null
        }
        Update: {
          atualizado_em?: string
          condicao_codigo?: number | null
          condicao_texto?: string | null
          id?: string
          integrado_id?: string
          nucleo_id?: string
          observado_em?: string
          precipitacao_mm?: number | null
          temperatura_c?: number | null
          umidade_pct?: number | null
          uv_index?: number | null
          vento_direcao_deg?: number | null
          vento_kmh?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "weather_observacoes_nucleo_id_fkey"
            columns: ["nucleo_id"]
            isOneToOne: true
            referencedRelation: "nucleos"
            referencedColumns: ["id"]
          },
        ]
      }
      weather_sync_log: {
        Row: {
          duracao_ms: number | null
          executado_em: string
          id: string
          integrado_id: string | null
          mensagem: string | null
          nucleo_id: string | null
          status: string
          trigger_tipo: string | null
        }
        Insert: {
          duracao_ms?: number | null
          executado_em?: string
          id?: string
          integrado_id?: string | null
          mensagem?: string | null
          nucleo_id?: string | null
          status: string
          trigger_tipo?: string | null
        }
        Update: {
          duracao_ms?: number | null
          executado_em?: string
          id?: string
          integrado_id?: string | null
          mensagem?: string | null
          nucleo_id?: string | null
          status?: string
          trigger_tipo?: string | null
        }
        Relationships: []
      }
      webhooks_fornecedor: {
        Row: {
          ativo: boolean
          created_at: string
          evento: string
          fornecedor_global_id: string
          headers: Json | null
          id: string
          secret: string | null
          tentativas_max: number
          timeout_ms: number
          updated_at: string
          url: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          evento?: string
          fornecedor_global_id: string
          headers?: Json | null
          id?: string
          secret?: string | null
          tentativas_max?: number
          timeout_ms?: number
          updated_at?: string
          url: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          evento?: string
          fornecedor_global_id?: string
          headers?: Json | null
          id?: string
          secret?: string | null
          tentativas_max?: number
          timeout_ms?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_fornecedor_fornecedor_global_id_fkey"
            columns: ["fornecedor_global_id"]
            isOneToOne: false
            referencedRelation: "fornecedores_globais"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks_log: {
        Row: {
          created_at: string
          duracao_ms: number | null
          erro: string | null
          evento: string
          fornecedor_global_id: string
          id: string
          payload: Json
          resposta: string | null
          status_code: number | null
          tentativa: number
          webhook_id: string | null
        }
        Insert: {
          created_at?: string
          duracao_ms?: number | null
          erro?: string | null
          evento: string
          fornecedor_global_id: string
          id?: string
          payload: Json
          resposta?: string | null
          status_code?: number | null
          tentativa?: number
          webhook_id?: string | null
        }
        Update: {
          created_at?: string
          duracao_ms?: number | null
          erro?: string | null
          evento?: string
          fornecedor_global_id?: string
          id?: string
          payload?: Json
          resposta?: string | null
          status_code?: number | null
          tentativa?: number
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_log_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks_fornecedor"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      rastreio_ovos: {
        Row: {
          classificacao_peso:
            | Database["public"]["Enums"]["classificacao_peso_ovo"]
            | null
          data_producao: string | null
          data_validade: string | null
          galpao_nome: string | null
          lote_interno: string | null
          nucleo_nome: string | null
          produtor_cidade: string | null
          produtor_estado: string | null
          produtor_nome: string | null
          tipo_ovo: Database["public"]["Enums"]["tipo_ovo"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      aplicar_estimulo_postura: { Args: { p_lote_id: string }; Returns: string }
      aplicar_estimulo_postura_internal: {
        Args: { p_lote_id: string }
        Returns: string
      }
      auto_aplicar_estimulos_postura: { Args: never; Returns: number }
      calcular_fase_postura: {
        Args: { semanas_vida: number }
        Returns: Database["public"]["Enums"]["fase_postura"]
      }
      can_modify_data: { Args: never; Returns: boolean }
      cleanup_orphan_identities_for_email: {
        Args: { p_email: string }
        Returns: number
      }
      dispatch_notificacao: {
        Args: {
          p_codigo: string
          p_contexto?: Json
          p_integrado_id: string
          p_link?: string
          p_mensagem?: string
          p_severidade?: string
          p_titulo: string
        }
        Returns: number
      }
      galpao_has_active_lote: { Args: { _galpao_id: string }; Returns: boolean }
      gerar_lote_interno_ovos: {
        Args: { p_integrado_id: string }
        Returns: string
      }
      get_benchmark_linhagem: {
        Args: { p_integrado_id?: string; p_linhagem: string; p_sexo?: string }
        Returns: {
          amostra: number
          mortalidade_acum_pct: number
          peso_medio_kg: number
          semana: number
        }[]
      }
      get_criadores: {
        Args: never
        Returns: {
          full_name: string
          id: string
        }[]
      }
      get_my_fornecedor_global_id: { Args: never; Returns: string }
      get_my_integrado_id: { Args: never; Returns: string }
      get_my_parceiro_id: { Args: never; Returns: string }
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
      is_superadmin: { Args: never; Returns: boolean }
      log_secdef_call: {
        Args: { p_extra?: Json; p_function_name: string; p_key_param?: string }
        Returns: undefined
      }
      marcar_dispositivos_offline_iot: { Args: never; Returns: number }
      redact_sensitive_jsonb: { Args: { p: Json }; Returns: Json }
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
      seed_programas_iluminacao_default: {
        Args: { p_integrado_id: string }
        Returns: undefined
      }
      user_can_access_module: {
        Args: {
          _module_code: string
          _required_level?: Database["public"]["Enums"]["nivel_acesso"]
          _user_id: string
        }
        Returns: boolean
      }
      verificar_aceite_termo: {
        Args: {
          p_parceiro_id?: string
          p_tipo_termo: string
          p_user_id: string
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
        | "fornecedor"
        | "vendedor_fornecedor"
        | "superadmin"
      camera_evento_tipo: "motion" | "alarm" | "video_loss" | "tampering"
      camera_funcao: "monitoramento" | "seguranca" | "ambiente" | "contagem"
      camera_snapshot_tipo: "agendado" | "manual" | "evento_motion"
      camera_status: "online" | "offline" | "erro" | "nao_testado"
      classificacao_ovo: "medio" | "grande" | "extra" | "jumbo"
      classificacao_peso_ovo:
        | "medio"
        | "grande"
        | "extra"
        | "jumbo"
        | "quebrado"
      conta_pagar_status: "previsto" | "pendente" | "pago" | "cancelado"
      conta_receber_status:
        | "previsao"
        | "pendente"
        | "recebido"
        | "parcial"
        | "cancelado"
      destino_descarte_ovo:
        | "industria"
        | "compostagem"
        | "doacao"
        | "descarte_sanitario"
        | "reciclagem_animal"
        | "outro"
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
      driver_iot: "ewelink" | "esp32_mqtt" | "esp32_http"
      fase_postura: "cria" | "recria" | "producao"
      forma_pagamento:
        | "boleto"
        | "pix"
        | "transferencia"
        | "dinheiro"
        | "cheque"
        | "cartao"
      funcao_automacao:
        | "aquecimento"
        | "ventilacao"
        | "nenhuma"
        | "nebulizacao"
        | "iluminacao"
        | "cortina"
        | "alarme"
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
      modo_protecao_offline: "temperatura" | "horario" | "hibrido"
      motivo_mortalidade: "natural" | "eliminado"
      natureza_conta: "devedora" | "credora"
      nfe_racao_status: "pendente_revisao" | "confirmada" | "rejeitada" | "erro"
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
      origem_setpoint_offline: "curva" | "manual"
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
      ticket_prioridade: "baixa" | "media" | "alta" | "critica"
      ticket_status: "aberto" | "em_andamento" | "resolvido" | "fechado"
      tipo_bebedouro: "niple" | "tacas"
      tipo_cadastro: "cliente" | "fornecedor" | "ambos"
      tipo_centro_custo: "lote" | "nucleo" | "geral" | "projeto"
      tipo_comedouro: "manual" | "automatico"
      tipo_conta_bancaria: "corrente" | "poupanca" | "investimento"
      tipo_equipamento_canal:
        | "ventilador"
        | "nebulizador"
        | "iluminacao"
        | "aquecimento"
        | "cortina"
        | "alarme"
        | "exaustor"
        | "outro"
      tipo_ovo: "branco" | "castanho" | "vermelho" | "caipira"
      tipo_pessoa: "pf" | "pj" | "produtor_rural"
      tipo_plano_conta: "receita" | "custo" | "despesa" | "investimento"
      tipo_pressao: "positiva" | "negativa" | "darkhouse"
      tipo_producao: "corte" | "postura"
      tipo_taxa_bancaria: "fixo" | "percentual"
      tipo_timer_seguranca:
        | "aquecimento_noturno"
        | "ventilacao_diurno"
        | "ciclo_intermitente"
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
        "fornecedor",
        "vendedor_fornecedor",
        "superadmin",
      ],
      camera_evento_tipo: ["motion", "alarm", "video_loss", "tampering"],
      camera_funcao: ["monitoramento", "seguranca", "ambiente", "contagem"],
      camera_snapshot_tipo: ["agendado", "manual", "evento_motion"],
      camera_status: ["online", "offline", "erro", "nao_testado"],
      classificacao_ovo: ["medio", "grande", "extra", "jumbo"],
      classificacao_peso_ovo: ["medio", "grande", "extra", "jumbo", "quebrado"],
      conta_pagar_status: ["previsto", "pendente", "pago", "cancelado"],
      conta_receber_status: [
        "previsao",
        "pendente",
        "recebido",
        "parcial",
        "cancelado",
      ],
      destino_descarte_ovo: [
        "industria",
        "compostagem",
        "doacao",
        "descarte_sanitario",
        "reciclagem_animal",
        "outro",
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
      driver_iot: ["ewelink", "esp32_mqtt", "esp32_http"],
      fase_postura: ["cria", "recria", "producao"],
      forma_pagamento: [
        "boleto",
        "pix",
        "transferencia",
        "dinheiro",
        "cheque",
        "cartao",
      ],
      funcao_automacao: [
        "aquecimento",
        "ventilacao",
        "nenhuma",
        "nebulizacao",
        "iluminacao",
        "cortina",
        "alarme",
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
      modo_protecao_offline: ["temperatura", "horario", "hibrido"],
      motivo_mortalidade: ["natural", "eliminado"],
      natureza_conta: ["devedora", "credora"],
      nfe_racao_status: ["pendente_revisao", "confirmada", "rejeitada", "erro"],
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
      origem_setpoint_offline: ["curva", "manual"],
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
      ticket_prioridade: ["baixa", "media", "alta", "critica"],
      ticket_status: ["aberto", "em_andamento", "resolvido", "fechado"],
      tipo_bebedouro: ["niple", "tacas"],
      tipo_cadastro: ["cliente", "fornecedor", "ambos"],
      tipo_centro_custo: ["lote", "nucleo", "geral", "projeto"],
      tipo_comedouro: ["manual", "automatico"],
      tipo_conta_bancaria: ["corrente", "poupanca", "investimento"],
      tipo_equipamento_canal: [
        "ventilador",
        "nebulizador",
        "iluminacao",
        "aquecimento",
        "cortina",
        "alarme",
        "exaustor",
        "outro",
      ],
      tipo_ovo: ["branco", "castanho", "vermelho", "caipira"],
      tipo_pessoa: ["pf", "pj", "produtor_rural"],
      tipo_plano_conta: ["receita", "custo", "despesa", "investimento"],
      tipo_pressao: ["positiva", "negativa", "darkhouse"],
      tipo_producao: ["corte", "postura"],
      tipo_taxa_bancaria: ["fixo", "percentual"],
      tipo_timer_seguranca: [
        "aquecimento_noturno",
        "ventilacao_diurno",
        "ciclo_intermitente",
      ],
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
