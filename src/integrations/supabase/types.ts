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
      nucleos: {
        Row: {
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
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
      tipo_bebedouro: ["niple", "tacas"],
      tipo_comedouro: ["manual", "automatico"],
      tipo_pressao: ["positiva", "negativa", "darkhouse"],
      tipo_producao: ["corte", "postura"],
    },
  },
} as const
