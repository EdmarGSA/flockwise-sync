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
      galpoes: {
        Row: {
          altura: number
          ativo: boolean
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
          updated_at: string
          ventilador_quantidade: number
        }
        Insert: {
          altura: number
          ativo?: boolean
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
          updated_at?: string
          ventilador_quantidade?: number
        }
        Update: {
          altura?: number
          ativo?: boolean
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
          tipo_producao: Database["public"]["Enums"]["tipo_producao"]
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
          tipo_producao: Database["public"]["Enums"]["tipo_producao"]
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
          tipo_producao?: Database["public"]["Enums"]["tipo_producao"]
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
      app_role: "admin" | "integrado" | "veterinario" | "tecnico"
      linhagem_aves: "cobb_500" | "ross_308" | "hubbard"
      lote_status: "previsao" | "alojado" | "fechado"
      sexo_ave: "macho" | "femea" | "misto"
      tipo_bebedouro: "niple" | "tacas"
      tipo_comedouro: "manual" | "automatico"
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
      app_role: ["admin", "integrado", "veterinario", "tecnico"],
      linhagem_aves: ["cobb_500", "ross_308", "hubbard"],
      lote_status: ["previsao", "alojado", "fechado"],
      sexo_ave: ["macho", "femea", "misto"],
      tipo_bebedouro: ["niple", "tacas"],
      tipo_comedouro: ["manual", "automatico"],
      tipo_pressao: ["positiva", "negativa", "darkhouse"],
      tipo_producao: ["corte", "postura"],
    },
  },
} as const
