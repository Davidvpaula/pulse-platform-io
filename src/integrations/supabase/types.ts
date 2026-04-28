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
      agenda_slots: {
        Row: {
          created_at: string
          fim: string
          id: string
          inicio: string
          medico_id: string
          modalidade: Database["public"]["Enums"]["consulta_modalidade"]
          observacoes: string | null
          status: Database["public"]["Enums"]["slot_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          fim: string
          id?: string
          inicio: string
          medico_id: string
          modalidade?: Database["public"]["Enums"]["consulta_modalidade"]
          observacoes?: string | null
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          fim?: string
          id?: string
          inicio?: string
          medico_id?: string
          modalidade?: Database["public"]["Enums"]["consulta_modalidade"]
          observacoes?: string | null
          status?: Database["public"]["Enums"]["slot_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_slots_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      anexos_consulta: {
        Row: {
          consulta_id: string
          created_at: string
          descricao: string | null
          id: string
          mime_type: string | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes: number | null
          uploader_id: string
        }
        Insert: {
          consulta_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          mime_type?: string | null
          nome_arquivo: string
          storage_path: string
          tamanho_bytes?: number | null
          uploader_id: string
        }
        Update: {
          consulta_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          mime_type?: string | null
          nome_arquivo?: string
          storage_path?: string
          tamanho_bytes?: number | null
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anexos_consulta_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
        ]
      }
      consulta_status_log: {
        Row: {
          actor_id: string | null
          consulta_id: string
          created_at: string
          id: string
          motivo: string | null
          status_anterior: Database["public"]["Enums"]["consulta_status"] | null
          status_novo: Database["public"]["Enums"]["consulta_status"]
        }
        Insert: {
          actor_id?: string | null
          consulta_id: string
          created_at?: string
          id?: string
          motivo?: string | null
          status_anterior?:
            | Database["public"]["Enums"]["consulta_status"]
            | null
          status_novo: Database["public"]["Enums"]["consulta_status"]
        }
        Update: {
          actor_id?: string | null
          consulta_id?: string
          created_at?: string
          id?: string
          motivo?: string | null
          status_anterior?:
            | Database["public"]["Enums"]["consulta_status"]
            | null
          status_novo?: Database["public"]["Enums"]["consulta_status"]
        }
        Relationships: [
          {
            foreignKeyName: "consulta_status_log_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
        ]
      }
      consultas: {
        Row: {
          created_at: string
          empresa_id: string | null
          especialidade_id: string | null
          fim: string
          id: string
          inicio: string
          link_sala: string | null
          medico_id: string
          modalidade: Database["public"]["Enums"]["consulta_modalidade"]
          motivo: string | null
          paciente_id: string
          slot_id: string | null
          status: Database["public"]["Enums"]["consulta_status"]
          updated_at: string
          valor_centavos: number
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          especialidade_id?: string | null
          fim: string
          id?: string
          inicio: string
          link_sala?: string | null
          medico_id: string
          modalidade?: Database["public"]["Enums"]["consulta_modalidade"]
          motivo?: string | null
          paciente_id: string
          slot_id?: string | null
          status?: Database["public"]["Enums"]["consulta_status"]
          updated_at?: string
          valor_centavos?: number
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          especialidade_id?: string | null
          fim?: string
          id?: string
          inicio?: string
          link_sala?: string | null
          medico_id?: string
          modalidade?: Database["public"]["Enums"]["consulta_modalidade"]
          motivo?: string | null
          paciente_id?: string
          slot_id?: string | null
          status?: Database["public"]["Enums"]["consulta_status"]
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "consultas_especialidade_id_fkey"
            columns: ["especialidade_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "agenda_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      especialidades: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      medico_especialidades: {
        Row: {
          ativo: boolean
          created_at: string
          duracao_minutos: number
          especialidade_id: string
          id: string
          medico_id: string
          modalidades: Database["public"]["Enums"]["consulta_modalidade"][]
          preco_centavos: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          duracao_minutos?: number
          especialidade_id: string
          id?: string
          medico_id: string
          modalidades?: Database["public"]["Enums"]["consulta_modalidade"][]
          preco_centavos?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          duracao_minutos?: number
          especialidade_id?: string
          id?: string
          medico_id?: string
          modalidades?: Database["public"]["Enums"]["consulta_modalidade"][]
          preco_centavos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_especialidades_especialidade_id_fkey"
            columns: ["especialidade_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_especialidades_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      medicos: {
        Row: {
          bio: string | null
          created_at: string
          crm: string
          crm_estado: string
          documentos: Json
          email: string
          especialidade: string
          id: string
          motivo_reprovacao: string | null
          nome: string
          rqe: string | null
          status: Database["public"]["Enums"]["medico_status"]
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          crm: string
          crm_estado: string
          documentos?: Json
          email: string
          especialidade: string
          id?: string
          motivo_reprovacao?: string | null
          nome: string
          rqe?: string | null
          status?: Database["public"]["Enums"]["medico_status"]
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          crm?: string
          crm_estado?: string
          documentos?: Json
          email?: string
          especialidade?: string
          id?: string
          motivo_reprovacao?: string | null
          nome?: string
          rqe?: string | null
          status?: Database["public"]["Enums"]["medico_status"]
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medicos_auditoria: {
        Row: {
          acao: string
          actor_id: string | null
          created_at: string
          id: string
          medico_id: string
          motivo: string | null
          status_anterior: Database["public"]["Enums"]["medico_status"] | null
          status_novo: Database["public"]["Enums"]["medico_status"] | null
        }
        Insert: {
          acao: string
          actor_id?: string | null
          created_at?: string
          id?: string
          medico_id: string
          motivo?: string | null
          status_anterior?: Database["public"]["Enums"]["medico_status"] | null
          status_novo?: Database["public"]["Enums"]["medico_status"] | null
        }
        Update: {
          acao?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          medico_id?: string
          motivo?: string | null
          status_anterior?: Database["public"]["Enums"]["medico_status"] | null
          status_novo?: Database["public"]["Enums"]["medico_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "medicos_auditoria_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          alergias: string | null
          condicoes_cronicas: string | null
          contato_emergencia_nome: string | null
          contato_emergencia_telefone: string | null
          created_at: string
          data_nascimento: string | null
          empresa_id: string | null
          id: string
          matricula_empresa: string | null
          medicamentos_uso: string | null
          observacoes_internas: string | null
          sexo: Database["public"]["Enums"]["sexo_biologico"]
          updated_at: string
          user_id: string
        }
        Insert: {
          alergias?: string | null
          condicoes_cronicas?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          created_at?: string
          data_nascimento?: string | null
          empresa_id?: string | null
          id?: string
          matricula_empresa?: string | null
          medicamentos_uso?: string | null
          observacoes_internas?: string | null
          sexo?: Database["public"]["Enums"]["sexo_biologico"]
          updated_at?: string
          user_id: string
        }
        Update: {
          alergias?: string | null
          condicoes_cronicas?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          created_at?: string
          data_nascimento?: string | null
          empresa_id?: string | null
          id?: string
          matricula_empresa?: string | null
          medicamentos_uso?: string | null
          observacoes_internas?: string | null
          sexo?: Database["public"]["Enums"]["sexo_biologico"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prescricoes: {
        Row: {
          assinatura_digital: string | null
          consulta_id: string
          created_at: string
          emitida_em: string
          id: string
          medicamentos: Json
          orientacoes: string | null
          updated_at: string
          validade_dias: number
        }
        Insert: {
          assinatura_digital?: string | null
          consulta_id: string
          created_at?: string
          emitida_em?: string
          id?: string
          medicamentos?: Json
          orientacoes?: string | null
          updated_at?: string
          validade_dias?: number
        }
        Update: {
          assinatura_digital?: string | null
          consulta_id?: string
          created_at?: string
          emitida_em?: string
          id?: string
          medicamentos?: Json
          orientacoes?: string | null
          updated_at?: string
          validade_dias?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescricoes_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prontuarios: {
        Row: {
          cid10: string[] | null
          conduta: string | null
          consulta_id: string
          created_at: string
          exame_fisico: string | null
          hipotese_diagnostica: string | null
          historia_doenca: string | null
          id: string
          queixa_principal: string | null
          updated_at: string
        }
        Insert: {
          cid10?: string[] | null
          conduta?: string | null
          consulta_id: string
          created_at?: string
          exame_fisico?: string | null
          hipotese_diagnostica?: string | null
          historia_doenca?: string | null
          id?: string
          queixa_principal?: string | null
          updated_at?: string
        }
        Update: {
          cid10?: string[] | null
          conduta?: string | null
          consulta_id?: string
          created_at?: string
          exame_fisico?: string | null
          hipotese_diagnostica?: string | null
          historia_doenca?: string | null
          id?: string
          queixa_principal?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prontuarios_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: true
            referencedRelation: "consultas"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_medico_da_consulta: {
        Args: { _consulta_id: string }
        Returns: boolean
      }
      is_paciente_da_consulta: {
        Args: { _consulta_id: string }
        Returns: boolean
      }
      promote_to_admin: { Args: { _email: string }; Returns: Json }
    }
    Enums: {
      app_role: "paciente" | "medico" | "secretaria" | "empresa" | "admin"
      consulta_modalidade: "online" | "presencial"
      consulta_status:
        | "agendada"
        | "aguardando_pagamento"
        | "confirmada"
        | "em_andamento"
        | "concluida"
        | "cancelada"
        | "no_show"
      medico_status: "pendente" | "em_analise" | "aprovado" | "reprovado"
      sexo_biologico: "feminino" | "masculino" | "intersexo" | "nao_informado"
      slot_status: "disponivel" | "reservado" | "bloqueado"
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
      app_role: ["paciente", "medico", "secretaria", "empresa", "admin"],
      consulta_modalidade: ["online", "presencial"],
      consulta_status: [
        "agendada",
        "aguardando_pagamento",
        "confirmada",
        "em_andamento",
        "concluida",
        "cancelada",
        "no_show",
      ],
      medico_status: ["pendente", "em_analise", "aprovado", "reprovado"],
      sexo_biologico: ["feminino", "masculino", "intersexo", "nao_informado"],
      slot_status: ["disponivel", "reservado", "bloqueado"],
    },
  },
} as const
