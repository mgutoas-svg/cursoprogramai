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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      custos: {
        Row: {
          categoria: string
          comprovante_url: string | null
          created_at: string
          data_gasto: string
          demanda_id: string | null
          descricao: string
          id: string
          prestador_oficina: string | null
          valor: number
          veiculo_id: string | null
        }
        Insert: {
          categoria: string
          comprovante_url?: string | null
          created_at?: string
          data_gasto: string
          demanda_id?: string | null
          descricao: string
          id?: string
          prestador_oficina?: string | null
          valor: number
          veiculo_id?: string | null
        }
        Update: {
          categoria?: string
          comprovante_url?: string | null
          created_at?: string
          data_gasto?: string
          demanda_id?: string | null
          descricao?: string
          id?: string
          prestador_oficina?: string | null
          valor?: number
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custos_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      demandas: {
        Row: {
          cliente_nome: string
          created_at: string
          custo_lancado: boolean
          descricao: string
          foto_geral_url: string[] | null
          foto_peca_url: string[] | null
          id: string
          local_obra: string
          notas_pesquisa: string | null
          orcamento_url: string[] | null
          prazo_resolucao: string | null
          prestador_oficina: string | null
          status: string
          urgencia: string
          valor_reparo: number | null
        }
        Insert: {
          cliente_nome: string
          created_at?: string
          custo_lancado?: boolean
          descricao: string
          foto_geral_url?: string[] | null
          foto_peca_url?: string[] | null
          id?: string
          local_obra: string
          notas_pesquisa?: string | null
          orcamento_url?: string[] | null
          prazo_resolucao?: string | null
          prestador_oficina?: string | null
          status?: string
          urgencia?: string
          valor_reparo?: number | null
        }
        Update: {
          cliente_nome?: string
          created_at?: string
          custo_lancado?: boolean
          descricao?: string
          foto_geral_url?: string[] | null
          foto_peca_url?: string[] | null
          id?: string
          local_obra?: string
          notas_pesquisa?: string | null
          orcamento_url?: string[] | null
          prazo_resolucao?: string | null
          prestador_oficina?: string | null
          status?: string
          urgencia?: string
          valor_reparo?: number | null
        }
        Relationships: []
      }
      manutencao_preventiva: {
        Row: {
          created_at: string
          data_proxima_revisao: string | null
          id: string
          item: string
          km_atual: number | null
          km_proxima_troca: number | null
          km_ultima_troca: number | null
          status_item: string | null
          veiculo_id: string
        }
        Insert: {
          created_at?: string
          data_proxima_revisao?: string | null
          id?: string
          item: string
          km_atual?: number | null
          km_proxima_troca?: number | null
          km_ultima_troca?: number | null
          status_item?: string | null
          veiculo_id: string
        }
        Update: {
          created_at?: string
          data_proxima_revisao?: string | null
          id?: string
          item?: string
          km_atual?: number | null
          km_proxima_troca?: number | null
          km_ultima_troca?: number | null
          status_item?: string | null
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencao_preventiva_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          ano: number | null
          created_at: string
          crlv_url: string | null
          historico_multas_url: string[] | null
          id: string
          modelo: string
          obra_alocado: string | null
          placa: string
          vencimento_ipva: string | null
          vencimento_licenciamento: string | null
          vencimento_seguro: string | null
        }
        Insert: {
          ano?: number | null
          created_at?: string
          crlv_url?: string | null
          historico_multas_url?: string[] | null
          id?: string
          modelo: string
          obra_alocado?: string | null
          placa: string
          vencimento_ipva?: string | null
          vencimento_licenciamento?: string | null
          vencimento_seguro?: string | null
        }
        Update: {
          ano?: number | null
          created_at?: string
          crlv_url?: string | null
          historico_multas_url?: string[] | null
          id?: string
          modelo?: string
          obra_alocado?: string | null
          placa?: string
          vencimento_ipva?: string | null
          vencimento_licenciamento?: string | null
          vencimento_seguro?: string | null
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
      [_ in never]: never
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
    Enums: {},
  },
} as const
