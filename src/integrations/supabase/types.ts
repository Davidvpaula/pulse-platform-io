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
          reserva_expira_em: string | null
          reservado_por_consulta_id: string | null
          servico_id: string | null
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
          reserva_expira_em?: string | null
          reservado_por_consulta_id?: string | null
          servico_id?: string | null
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
          reserva_expira_em?: string | null
          reservado_por_consulta_id?: string | null
          servico_id?: string | null
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
          {
            foreignKeyName: "agenda_slots_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_financeiros"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_logs: {
        Row: {
          action_taken: string | null
          conversation_id: string | null
          created_at: string
          error: string | null
          id: string
          latency_ms: number | null
          model: string | null
          prompt: string | null
          provider: Database["public"]["Enums"]["ai_provider"] | null
          response: string | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          action_taken?: string | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          prompt?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"] | null
          response?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          action_taken?: string | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          prompt?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"] | null
          response?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          active: boolean
          base_prompt: string | null
          created_at: string
          created_by: string | null
          handoff_keywords: string[]
          id: string
          knowledge_base: string | null
          max_tokens: number | null
          model: string | null
          provider: Database["public"]["Enums"]["ai_provider"]
          safety_rules: string | null
          temperature: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          base_prompt?: string | null
          created_at?: string
          created_by?: string | null
          handoff_keywords?: string[]
          id?: string
          knowledge_base?: string | null
          max_tokens?: number | null
          model?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"]
          safety_rules?: string | null
          temperature?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          base_prompt?: string | null
          created_at?: string
          created_by?: string | null
          handoff_keywords?: string[]
          id?: string
          knowledge_base?: string | null
          max_tokens?: number | null
          model?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"]
          safety_rules?: string | null
          temperature?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      analytics_conversions: {
        Row: {
          consulta_id: string | null
          created_at: string
          empresa_id: string | null
          id: string
          medico_id: string | null
          origem: string | null
          pagamento_id: string | null
          servico: string | null
          session_token: string | null
          tipo: string
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          valor: number | null
        }
        Insert: {
          consulta_id?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          medico_id?: string | null
          origem?: string | null
          pagamento_id?: string | null
          servico?: string | null
          session_token?: string | null
          tipo: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          valor?: number | null
        }
        Update: {
          consulta_id?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          medico_id?: string | null
          origem?: string | null
          pagamento_id?: string | null
          servico?: string | null
          session_token?: string | null
          tipo?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          detalhes: Json | null
          dispositivo: string | null
          id: string
          origem: string | null
          rota: string | null
          rota_anterior: string | null
          session_token: string | null
          tipo: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          dispositivo?: string | null
          id?: string
          origem?: string | null
          rota?: string | null
          rota_anterior?: string | null
          session_token?: string | null
          tipo: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          dispositivo?: string | null
          id?: string
          origem?: string | null
          rota?: string | null
          rota_anterior?: string | null
          session_token?: string | null
          tipo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_sessions: {
        Row: {
          converteu: boolean
          created_at: string
          dispositivo: string | null
          duracao_segundos: number | null
          fim: string | null
          id: string
          inicio: string
          origem: string | null
          paginas_vistas: number
          pais: string | null
          primeira_rota: string | null
          referrer: string | null
          session_token: string
          ultima_rota: string | null
          updated_at: string
          user_agent: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          converteu?: boolean
          created_at?: string
          dispositivo?: string | null
          duracao_segundos?: number | null
          fim?: string | null
          id?: string
          inicio?: string
          origem?: string | null
          paginas_vistas?: number
          pais?: string | null
          primeira_rota?: string | null
          referrer?: string | null
          session_token: string
          ultima_rota?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          converteu?: boolean
          created_at?: string
          dispositivo?: string | null
          duracao_segundos?: number | null
          fim?: string | null
          id?: string
          inicio?: string
          origem?: string | null
          paginas_vistas?: number
          pais?: string | null
          primeira_rota?: string | null
          referrer?: string | null
          session_token?: string
          ultima_rota?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      assinatura_snapshot: {
        Row: {
          assinatura_id: string
          beneficios_snapshot: Json
          created_at: string
          desconto_aplicado_pct: number
          id: string
          origem: Database["public"]["Enums"]["origem_receita_assinatura"]
          plano_snapshot: Json
          taxa_plataforma_centavos: number
          valor_bruto_centavos: number
          valor_liquido_medico_centavos: number
        }
        Insert: {
          assinatura_id: string
          beneficios_snapshot?: Json
          created_at?: string
          desconto_aplicado_pct?: number
          id?: string
          origem?: Database["public"]["Enums"]["origem_receita_assinatura"]
          plano_snapshot?: Json
          taxa_plataforma_centavos?: number
          valor_bruto_centavos?: number
          valor_liquido_medico_centavos?: number
        }
        Update: {
          assinatura_id?: string
          beneficios_snapshot?: Json
          created_at?: string
          desconto_aplicado_pct?: number
          id?: string
          origem?: Database["public"]["Enums"]["origem_receita_assinatura"]
          plano_snapshot?: Json
          taxa_plataforma_centavos?: number
          valor_bruto_centavos?: number
          valor_liquido_medico_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "assinatura_snapshot_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas"
            referencedColumns: ["id"]
          },
        ]
      }
      assinatura_uso: {
        Row: {
          assinatura_id: string
          beneficio_id: string | null
          consulta_id: string | null
          created_at: string
          custo_centavos: number
          id: string
          observacao: string | null
          quantidade: number
          registrado_por: string | null
        }
        Insert: {
          assinatura_id: string
          beneficio_id?: string | null
          consulta_id?: string | null
          created_at?: string
          custo_centavos?: number
          id?: string
          observacao?: string | null
          quantidade?: number
          registrado_por?: string | null
        }
        Update: {
          assinatura_id?: string
          beneficio_id?: string | null
          consulta_id?: string | null
          created_at?: string
          custo_centavos?: number
          id?: string
          observacao?: string | null
          quantidade?: number
          registrado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assinatura_uso_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinatura_uso_beneficio_id_fkey"
            columns: ["beneficio_id"]
            isOneToOne: false
            referencedRelation: "plano_beneficios"
            referencedColumns: ["id"]
          },
        ]
      }
      assinaturas: {
        Row: {
          ciclo: Database["public"]["Enums"]["assinatura_ciclo"]
          created_at: string
          created_by: string | null
          data_cancelamento: string | null
          data_fim_acesso: string | null
          data_inicio: string
          empresa_id: string | null
          forma_pagamento: string | null
          id: string
          motivo_cancelamento: string | null
          observacoes: string | null
          origem_receita: Database["public"]["Enums"]["origem_receita_assinatura"]
          paciente_id: string | null
          plano_id: string
          proxima_cobranca: string | null
          renovacao_bloqueada: boolean
          status: Database["public"]["Enums"]["assinatura_status"]
          updated_at: string
          valor_cobrado_centavos: number
        }
        Insert: {
          ciclo?: Database["public"]["Enums"]["assinatura_ciclo"]
          created_at?: string
          created_by?: string | null
          data_cancelamento?: string | null
          data_fim_acesso?: string | null
          data_inicio?: string
          empresa_id?: string | null
          forma_pagamento?: string | null
          id?: string
          motivo_cancelamento?: string | null
          observacoes?: string | null
          origem_receita?: Database["public"]["Enums"]["origem_receita_assinatura"]
          paciente_id?: string | null
          plano_id: string
          proxima_cobranca?: string | null
          renovacao_bloqueada?: boolean
          status?: Database["public"]["Enums"]["assinatura_status"]
          updated_at?: string
          valor_cobrado_centavos?: number
        }
        Update: {
          ciclo?: Database["public"]["Enums"]["assinatura_ciclo"]
          created_at?: string
          created_by?: string | null
          data_cancelamento?: string | null
          data_fim_acesso?: string | null
          data_inicio?: string
          empresa_id?: string | null
          forma_pagamento?: string | null
          id?: string
          motivo_cancelamento?: string | null
          observacoes?: string | null
          origem_receita?: Database["public"]["Enums"]["origem_receita_assinatura"]
          paciente_id?: string | null
          plano_id?: string
          proxima_cobranca?: string | null
          renovacao_bloqueada?: boolean
          status?: Database["public"]["Enums"]["assinatura_status"]
          updated_at?: string
          valor_cobrado_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "assinaturas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          after_data: Json | null
          before_data: Json | null
          changed_fields: string[] | null
          id: number
          motivo: string | null
          occurred_at: string
          record_id: string | null
          request_ctx: Json | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          after_data?: Json | null
          before_data?: Json | null
          changed_fields?: string[] | null
          id?: number
          motivo?: string | null
          occurred_at?: string
          record_id?: string | null
          request_ctx?: Json | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          after_data?: Json | null
          before_data?: Json | null
          changed_fields?: string[] | null
          id?: number
          motivo?: string | null
          occurred_at?: string
          record_id?: string | null
          request_ctx?: Json | null
          table_name?: string
        }
        Relationships: []
      }
      audit_revisoes: {
        Row: {
          evento_id: string
          evento_modulo: string
          id: string
          nota: string | null
          reviewed_at: string
          reviewed_by: string
        }
        Insert: {
          evento_id: string
          evento_modulo: string
          id?: string
          nota?: string | null
          reviewed_at?: string
          reviewed_by: string
        }
        Update: {
          evento_id?: string
          evento_modulo?: string
          id?: string
          nota?: string | null
          reviewed_at?: string
          reviewed_by?: string
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          appointment_id: string | null
          automation_id: string | null
          conversation_id: string | null
          error_message: string | null
          executed_at: string
          id: string
          patient_id: string | null
          payload: Json
          status: Database["public"]["Enums"]["automation_log_status"]
        }
        Insert: {
          appointment_id?: string | null
          automation_id?: string | null
          conversation_id?: string | null
          error_message?: string | null
          executed_at?: string
          id?: string
          patient_id?: string | null
          payload?: Json
          status: Database["public"]["Enums"]["automation_log_status"]
        }
        Update: {
          appointment_id?: string | null
          automation_id?: string | null
          conversation_id?: string | null
          error_message?: string | null
          executed_at?: string
          id?: string
          patient_id?: string | null
          payload?: Json
          status?: Database["public"]["Enums"]["automation_log_status"]
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          action_payload: Json
          action_type: Database["public"]["Enums"]["automation_action_type"]
          active: boolean
          channel: Database["public"]["Enums"]["conversation_channel"]
          conditions: Json
          created_at: string
          created_by: string | null
          delay_seconds: number
          description: string | null
          failure_count: number
          id: string
          last_executed_at: string | null
          name: string
          success_count: number
          template_id: string | null
          trigger: Database["public"]["Enums"]["automation_trigger"]
          updated_at: string
        }
        Insert: {
          action_payload?: Json
          action_type: Database["public"]["Enums"]["automation_action_type"]
          active?: boolean
          channel?: Database["public"]["Enums"]["conversation_channel"]
          conditions?: Json
          created_at?: string
          created_by?: string | null
          delay_seconds?: number
          description?: string | null
          failure_count?: number
          id?: string
          last_executed_at?: string | null
          name: string
          success_count?: number
          template_id?: string | null
          trigger: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
        }
        Update: {
          action_payload?: Json
          action_type?: Database["public"]["Enums"]["automation_action_type"]
          active?: boolean
          channel?: Database["public"]["Enums"]["conversation_channel"]
          conditions?: Json
          created_at?: string
          created_by?: string | null
          delay_seconds?: number
          description?: string | null
          failure_count?: number
          id?: string
          last_executed_at?: string | null
          name?: string
          success_count?: number
          template_id?: string | null
          trigger?: Database["public"]["Enums"]["automation_trigger"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_medicas: {
        Row: {
          avaliacao_publica: boolean
          comentario: string | null
          consulta_id: string
          created_at: string
          exibir_no_perfil: boolean
          id: string
          medico_id: string
          nota: number
          paciente_id: string
        }
        Insert: {
          avaliacao_publica?: boolean
          comentario?: string | null
          consulta_id: string
          created_at?: string
          exibir_no_perfil?: boolean
          id?: string
          medico_id: string
          nota: number
          paciente_id: string
        }
        Update: {
          avaliacao_publica?: boolean
          comentario?: string | null
          consulta_id?: string
          created_at?: string
          exibir_no_perfil?: boolean
          id?: string
          medico_id?: string
          nota?: number
          paciente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_medicas_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: true
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_medicas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_medicas_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_flows: {
        Row: {
          active: boolean
          channel: Database["public"]["Enums"]["conversation_channel"]
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          start_step_id: string | null
          trigger_keywords: string[]
          updated_at: string
          version: number
        }
        Insert: {
          active?: boolean
          channel?: Database["public"]["Enums"]["conversation_channel"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          start_step_id?: string | null
          trigger_keywords?: string[]
          updated_at?: string
          version?: number
        }
        Update: {
          active?: boolean
          channel?: Database["public"]["Enums"]["conversation_channel"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          start_step_id?: string | null
          trigger_keywords?: string[]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      bot_steps: {
        Row: {
          conditions: Json
          content: string | null
          created_at: string
          flow_id: string
          id: string
          label: string | null
          next_step_id: string | null
          options: Json
          order_index: number
          type: Database["public"]["Enums"]["bot_step_type"]
          updated_at: string
        }
        Insert: {
          conditions?: Json
          content?: string | null
          created_at?: string
          flow_id: string
          id?: string
          label?: string | null
          next_step_id?: string | null
          options?: Json
          order_index?: number
          type: Database["public"]["Enums"]["bot_step_type"]
          updated_at?: string
        }
        Update: {
          conditions?: Json
          content?: string | null
          created_at?: string
          flow_id?: string
          id?: string
          label?: string | null
          next_step_id?: string | null
          options?: Json
          order_index?: number
          type?: Database["public"]["Enums"]["bot_step_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_steps_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "bot_flows"
            referencedColumns: ["id"]
          },
        ]
      }
      cobrancas_links: {
        Row: {
          consulta_id: string | null
          created_at: string
          created_by: string | null
          descricao: string
          enviado_canal: string | null
          enviado_em: string | null
          id: string
          observacao: string | null
          paciente_id: string | null
          pagamento_id: string | null
          servico_id: string | null
          status: Database["public"]["Enums"]["cobranca_link_status"]
          updated_at: string
          url: string | null
          valor_centavos: number
          vencimento: string | null
        }
        Insert: {
          consulta_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao: string
          enviado_canal?: string | null
          enviado_em?: string | null
          id?: string
          observacao?: string | null
          paciente_id?: string | null
          pagamento_id?: string | null
          servico_id?: string | null
          status?: Database["public"]["Enums"]["cobranca_link_status"]
          updated_at?: string
          url?: string | null
          valor_centavos?: number
          vencimento?: string | null
        }
        Update: {
          consulta_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string
          enviado_canal?: string | null
          enviado_em?: string | null
          id?: string
          observacao?: string | null
          paciente_id?: string | null
          pagamento_id?: string | null
          servico_id?: string | null
          status?: Database["public"]["Enums"]["cobranca_link_status"]
          updated_at?: string
          url?: string | null
          valor_centavos?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_links_pagamento_id_fkey"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "pagamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          cargo_descricao: string | null
          convite_enviado_em: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          data_nascimento: string | null
          email: string
          foto_url: string | null
          funcao_interna: Database["public"]["Enums"]["funcao_interna"]
          gestor_id: string | null
          id: string
          nome_completo: string
          obrigar_troca_senha: boolean
          observacoes_internas: string | null
          removido_em: string | null
          setor: string | null
          status_alterado_em: string | null
          status_alterado_por: string | null
          status_conta: Database["public"]["Enums"]["status_colaborador"]
          status_motivo: string | null
          status_observacao: string | null
          suspenso_ate: string | null
          suspenso_indeterminado: boolean
          telefone: string | null
          ultimo_acesso_em: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cargo_descricao?: string | null
          convite_enviado_em?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email: string
          foto_url?: string | null
          funcao_interna?: Database["public"]["Enums"]["funcao_interna"]
          gestor_id?: string | null
          id?: string
          nome_completo: string
          obrigar_troca_senha?: boolean
          observacoes_internas?: string | null
          removido_em?: string | null
          setor?: string | null
          status_alterado_em?: string | null
          status_alterado_por?: string | null
          status_conta?: Database["public"]["Enums"]["status_colaborador"]
          status_motivo?: string | null
          status_observacao?: string | null
          suspenso_ate?: string | null
          suspenso_indeterminado?: boolean
          telefone?: string | null
          ultimo_acesso_em?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cargo_descricao?: string | null
          convite_enviado_em?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          email?: string
          foto_url?: string | null
          funcao_interna?: Database["public"]["Enums"]["funcao_interna"]
          gestor_id?: string | null
          id?: string
          nome_completo?: string
          obrigar_troca_senha?: boolean
          observacoes_internas?: string | null
          removido_em?: string | null
          setor?: string | null
          status_alterado_em?: string | null
          status_alterado_por?: string | null
          status_conta?: Database["public"]["Enums"]["status_colaborador"]
          status_motivo?: string | null
          status_observacao?: string | null
          suspenso_ate?: string | null
          suspenso_indeterminado?: boolean
          telefone?: string | null
          ultimo_acesso_em?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      colaboradores_auditoria: {
        Row: {
          acao: string
          actor_id: string | null
          campo: string | null
          colaborador_id: string
          created_at: string
          id: string
          motivo: string | null
          observacao: string | null
          payload: Json | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          acao: string
          actor_id?: string | null
          campo?: string | null
          colaborador_id: string
          created_at?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          payload?: Json | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          acao?: string
          actor_id?: string | null
          campo?: string | null
          colaborador_id?: string
          created_at?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          payload?: Json | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: []
      }
      comunicacao_auditoria: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: []
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
          avaliacao_paciente_comentario: string | null
          avaliacao_paciente_em: string | null
          avaliacao_paciente_nota: number | null
          canal_origem: Database["public"]["Enums"]["consulta_canal"]
          comissao_percentual_snapshot: number | null
          comissao_snapshot_centavos: number | null
          confirmada_em: string | null
          confirmada_por: string | null
          created_at: string
          empresa_id: string | null
          especialidade_id: string | null
          fim: string
          id: string
          inicio: string
          link_enviado_em: string | null
          link_enviado_por: string | null
          link_sala: string | null
          medico_id: string
          modalidade: Database["public"]["Enums"]["consulta_modalidade"]
          motivo: string | null
          paciente_id: string
          responsavel_agendamento_id: string | null
          servico_id: string | null
          slot_id: string | null
          snapshot_at: string | null
          status: Database["public"]["Enums"]["consulta_status"]
          updated_at: string
          valor_centavos: number
          valor_snapshot_centavos: number | null
        }
        Insert: {
          avaliacao_paciente_comentario?: string | null
          avaliacao_paciente_em?: string | null
          avaliacao_paciente_nota?: number | null
          canal_origem?: Database["public"]["Enums"]["consulta_canal"]
          comissao_percentual_snapshot?: number | null
          comissao_snapshot_centavos?: number | null
          confirmada_em?: string | null
          confirmada_por?: string | null
          created_at?: string
          empresa_id?: string | null
          especialidade_id?: string | null
          fim: string
          id?: string
          inicio: string
          link_enviado_em?: string | null
          link_enviado_por?: string | null
          link_sala?: string | null
          medico_id: string
          modalidade?: Database["public"]["Enums"]["consulta_modalidade"]
          motivo?: string | null
          paciente_id: string
          responsavel_agendamento_id?: string | null
          servico_id?: string | null
          slot_id?: string | null
          snapshot_at?: string | null
          status?: Database["public"]["Enums"]["consulta_status"]
          updated_at?: string
          valor_centavos?: number
          valor_snapshot_centavos?: number | null
        }
        Update: {
          avaliacao_paciente_comentario?: string | null
          avaliacao_paciente_em?: string | null
          avaliacao_paciente_nota?: number | null
          canal_origem?: Database["public"]["Enums"]["consulta_canal"]
          comissao_percentual_snapshot?: number | null
          comissao_snapshot_centavos?: number | null
          confirmada_em?: string | null
          confirmada_por?: string | null
          created_at?: string
          empresa_id?: string | null
          especialidade_id?: string | null
          fim?: string
          id?: string
          inicio?: string
          link_enviado_em?: string | null
          link_enviado_por?: string | null
          link_sala?: string | null
          medico_id?: string
          modalidade?: Database["public"]["Enums"]["consulta_modalidade"]
          motivo?: string | null
          paciente_id?: string
          responsavel_agendamento_id?: string | null
          servico_id?: string | null
          slot_id?: string | null
          snapshot_at?: string | null
          status?: Database["public"]["Enums"]["consulta_status"]
          updated_at?: string
          valor_centavos?: number
          valor_snapshot_centavos?: number | null
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
      consultas_auditoria: {
        Row: {
          acao: string
          actor_id: string | null
          campo: string | null
          consulta_id: string
          created_at: string
          id: string
          motivo: string | null
          observacao: string | null
          payload: Json | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          acao: string
          actor_id?: string | null
          campo?: string | null
          consulta_id: string
          created_at?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          payload?: Json | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          acao?: string
          actor_id?: string | null
          campo?: string | null
          consulta_id?: string
          created_at?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          payload?: Json | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: []
      }
      consultas_financeiro: {
        Row: {
          comissao_pct_aplicada: number | null
          consulta_id: string
          created_at: string
          data_consulta: string
          empresa_id: string | null
          id: string
          medico_id: string
          modelo_aplicado: Database["public"]["Enums"]["servico_financeiro_modelo"]
          origem_regra: string | null
          paciente_id: string
          servico_id: string | null
          servico_nome_snapshot: string | null
          status: Database["public"]["Enums"]["consulta_financeiro_status"]
          updated_at: string
          valor_bruto_centavos: number
          valor_medico_centavos: number
          valor_plataforma_centavos: number
        }
        Insert: {
          comissao_pct_aplicada?: number | null
          consulta_id: string
          created_at?: string
          data_consulta: string
          empresa_id?: string | null
          id?: string
          medico_id: string
          modelo_aplicado?: Database["public"]["Enums"]["servico_financeiro_modelo"]
          origem_regra?: string | null
          paciente_id: string
          servico_id?: string | null
          servico_nome_snapshot?: string | null
          status?: Database["public"]["Enums"]["consulta_financeiro_status"]
          updated_at?: string
          valor_bruto_centavos?: number
          valor_medico_centavos?: number
          valor_plataforma_centavos?: number
        }
        Update: {
          comissao_pct_aplicada?: number | null
          consulta_id?: string
          created_at?: string
          data_consulta?: string
          empresa_id?: string | null
          id?: string
          medico_id?: string
          modelo_aplicado?: Database["public"]["Enums"]["servico_financeiro_modelo"]
          origem_regra?: string | null
          paciente_id?: string
          servico_id?: string | null
          servico_nome_snapshot?: string | null
          status?: Database["public"]["Enums"]["consulta_financeiro_status"]
          updated_at?: string
          valor_bruto_centavos?: number
          valor_medico_centavos?: number
          valor_plataforma_centavos?: number
        }
        Relationships: []
      }
      conversation_assignments: {
        Row: {
          conversation_id: string
          created_at: string
          from_user_id: string | null
          id: string
          reason: string | null
          to_sector: string | null
          to_user_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          from_user_id?: string | null
          id?: string
          reason?: string | null
          to_sector?: string | null
          to_user_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          from_user_id?: string | null
          id?: string
          reason?: string | null
          to_sector?: string | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_assignments_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_leads: {
        Row: {
          convertido_em: string | null
          cpf: string | null
          created_at: string
          email: string | null
          empresa_potencial: string | null
          id: string
          motivo_contato: string | null
          nome: string | null
          observacoes: string | null
          origem: string | null
          paciente_id: string | null
          telefone: string
          updated_at: string
        }
        Insert: {
          convertido_em?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          empresa_potencial?: string | null
          id?: string
          motivo_contato?: string | null
          nome?: string | null
          observacoes?: string | null
          origem?: string | null
          paciente_id?: string | null
          telefone: string
          updated_at?: string
        }
        Update: {
          convertido_em?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          empresa_potencial?: string | null
          id?: string
          motivo_contato?: string | null
          nome?: string | null
          observacoes?: string | null
          origem?: string | null
          paciente_id?: string | null
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          ai_active: boolean
          assigned_sector: string | null
          assigned_to: string | null
          bot_active: boolean
          channel: Database["public"]["Enums"]["conversation_channel"]
          closed_at: string | null
          closed_by: string | null
          consulta_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          empresa_id: string | null
          id: string
          intent: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          medico_id: string | null
          origin: Database["public"]["Enums"]["conversation_origin"]
          patient_id: string | null
          priority: Database["public"]["Enums"]["conversation_priority"]
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[]
          unread_count: number
          updated_at: string
          whatsapp_instance_id: string | null
        }
        Insert: {
          ai_active?: boolean
          assigned_sector?: string | null
          assigned_to?: string | null
          bot_active?: boolean
          channel?: Database["public"]["Enums"]["conversation_channel"]
          closed_at?: string | null
          closed_by?: string | null
          consulta_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          intent?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_id?: string | null
          medico_id?: string | null
          origin?: Database["public"]["Enums"]["conversation_origin"]
          patient_id?: string | null
          priority?: Database["public"]["Enums"]["conversation_priority"]
          status?: Database["public"]["Enums"]["conversation_status"]
          tags?: string[]
          unread_count?: number
          updated_at?: string
          whatsapp_instance_id?: string | null
        }
        Update: {
          ai_active?: boolean
          assigned_sector?: string | null
          assigned_to?: string | null
          bot_active?: boolean
          channel?: Database["public"]["Enums"]["conversation_channel"]
          closed_at?: string | null
          closed_by?: string | null
          consulta_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          intent?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_id?: string | null
          medico_id?: string | null
          origin?: Database["public"]["Enums"]["conversation_origin"]
          patient_id?: string | null
          priority?: Database["public"]["Enums"]["conversation_priority"]
          status?: Database["public"]["Enums"]["conversation_status"]
          tags?: string[]
          unread_count?: number
          updated_at?: string
          whatsapp_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "conversation_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_whatsapp_instance_id_fkey"
            columns: ["whatsapp_instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      cupons: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string
          created_by: string | null
          descricao: string | null
          escopo: Database["public"]["Enums"]["cupom_escopo"]
          especialidade_id: string | null
          id: string
          medico_id: string | null
          nome: string
          tipo: Database["public"]["Enums"]["cupom_tipo"]
          updated_at: string
          uso_atual: number
          uso_maximo: number | null
          valido_ate: string | null
          valido_de: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          escopo?: Database["public"]["Enums"]["cupom_escopo"]
          especialidade_id?: string | null
          id?: string
          medico_id?: string | null
          nome: string
          tipo: Database["public"]["Enums"]["cupom_tipo"]
          updated_at?: string
          uso_atual?: number
          uso_maximo?: number | null
          valido_ate?: string | null
          valido_de?: string
          valor: number
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          escopo?: Database["public"]["Enums"]["cupom_escopo"]
          especialidade_id?: string | null
          id?: string
          medico_id?: string | null
          nome?: string
          tipo?: Database["public"]["Enums"]["cupom_tipo"]
          updated_at?: string
          uso_atual?: number
          uso_maximo?: number | null
          valido_ate?: string | null
          valido_de?: string
          valor?: number
        }
        Relationships: []
      }
      cupons_uso: {
        Row: {
          aplicado_por: string | null
          codigo_snapshot: string
          consulta_id: string | null
          created_at: string
          cupom_id: string
          id: string
          medico_id: string | null
          observacao: string | null
          paciente_id: string | null
          tipo_snapshot: Database["public"]["Enums"]["cupom_tipo"]
          valor_desconto_centavos: number
          valor_final_centavos: number
          valor_original_centavos: number
        }
        Insert: {
          aplicado_por?: string | null
          codigo_snapshot: string
          consulta_id?: string | null
          created_at?: string
          cupom_id: string
          id?: string
          medico_id?: string | null
          observacao?: string | null
          paciente_id?: string | null
          tipo_snapshot: Database["public"]["Enums"]["cupom_tipo"]
          valor_desconto_centavos?: number
          valor_final_centavos?: number
          valor_original_centavos?: number
        }
        Update: {
          aplicado_por?: string | null
          codigo_snapshot?: string
          consulta_id?: string | null
          created_at?: string
          cupom_id?: string
          id?: string
          medico_id?: string | null
          observacao?: string | null
          paciente_id?: string | null
          tipo_snapshot?: Database["public"]["Enums"]["cupom_tipo"]
          valor_desconto_centavos?: number
          valor_final_centavos?: number
          valor_original_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "cupons_uso_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupons_uso_cupom_id_fkey"
            columns: ["cupom_id"]
            isOneToOne: false
            referencedRelation: "cupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupons_uso_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupons_uso_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      desconto_progressivo_regras: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          desconto_pct: number
          id: string
          qtd_medicos_min: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          desconto_pct?: number
          id?: string
          qtd_medicos_min: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          desconto_pct?: number
          id?: string
          qtd_medicos_min?: number
        }
        Relationships: []
      }
      documentos_paciente: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          mime_type: string | null
          paciente_id: string
          storage_path: string
          tamanho_bytes: number | null
          tipo: Database["public"]["Enums"]["documento_paciente_tipo"]
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          mime_type?: string | null
          paciente_id: string
          storage_path: string
          tamanho_bytes?: number | null
          tipo?: Database["public"]["Enums"]["documento_paciente_tipo"]
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          mime_type?: string | null
          paciente_id?: string
          storage_path?: string
          tamanho_bytes?: number | null
          tipo?: Database["public"]["Enums"]["documento_paciente_tipo"]
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          ativo: boolean
          cnpj: string | null
          contrato_inicio: string | null
          contrato_renovacao: string | null
          contrato_status: Database["public"]["Enums"]["empresa_contrato_status"]
          created_at: string
          dia_fechamento: number
          email: string | null
          id: string
          limite_consultas_mes: number | null
          modelo_financeiro: Database["public"]["Enums"]["empresa_modelo_financeiro"]
          nome_fantasia: string | null
          observacoes: string | null
          plano_mensal_centavos: number
          porte: Database["public"]["Enums"]["empresa_porte"] | null
          razao_social: string
          responsavel_email: string | null
          responsavel_nome: string | null
          responsavel_telefone: string | null
          segmento: string | null
          telefone: string | null
          tipo_empresa: Database["public"]["Enums"]["empresa_tipo"]
          updated_at: string
          valor_colaborador_centavos: number
          valor_consulta_centavos: number
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          contrato_inicio?: string | null
          contrato_renovacao?: string | null
          contrato_status?: Database["public"]["Enums"]["empresa_contrato_status"]
          created_at?: string
          dia_fechamento?: number
          email?: string | null
          id?: string
          limite_consultas_mes?: number | null
          modelo_financeiro?: Database["public"]["Enums"]["empresa_modelo_financeiro"]
          nome_fantasia?: string | null
          observacoes?: string | null
          plano_mensal_centavos?: number
          porte?: Database["public"]["Enums"]["empresa_porte"] | null
          razao_social: string
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          segmento?: string | null
          telefone?: string | null
          tipo_empresa?: Database["public"]["Enums"]["empresa_tipo"]
          updated_at?: string
          valor_colaborador_centavos?: number
          valor_consulta_centavos?: number
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          contrato_inicio?: string | null
          contrato_renovacao?: string | null
          contrato_status?: Database["public"]["Enums"]["empresa_contrato_status"]
          created_at?: string
          dia_fechamento?: number
          email?: string | null
          id?: string
          limite_consultas_mes?: number | null
          modelo_financeiro?: Database["public"]["Enums"]["empresa_modelo_financeiro"]
          nome_fantasia?: string | null
          observacoes?: string | null
          plano_mensal_centavos?: number
          porte?: Database["public"]["Enums"]["empresa_porte"] | null
          razao_social?: string
          responsavel_email?: string | null
          responsavel_nome?: string | null
          responsavel_telefone?: string | null
          segmento?: string | null
          telefone?: string | null
          tipo_empresa?: Database["public"]["Enums"]["empresa_tipo"]
          updated_at?: string
          valor_colaborador_centavos?: number
          valor_consulta_centavos?: number
        }
        Relationships: []
      }
      empresas_auditoria: {
        Row: {
          acao: string
          actor_id: string | null
          campo: string | null
          created_at: string
          empresa_id: string
          id: string
          motivo: string | null
          observacao: string | null
          payload: Json | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          acao: string
          actor_id?: string | null
          campo?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          payload?: Json | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          acao?: string
          actor_id?: string | null
          campo?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          payload?: Json | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_auditoria_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_contratos: {
        Row: {
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          data_renovacao: string | null
          empresa_id: string
          id: string
          limite_consultas_mes: number | null
          modelo_financeiro: Database["public"]["Enums"]["empresa_modelo_financeiro"]
          observacoes: string | null
          plano_mensal_centavos: number
          status: Database["public"]["Enums"]["empresa_contrato_status"]
          updated_at: string
          valor_colaborador_centavos: number
          valor_consulta_centavos: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio: string
          data_renovacao?: string | null
          empresa_id: string
          id?: string
          limite_consultas_mes?: number | null
          modelo_financeiro?: Database["public"]["Enums"]["empresa_modelo_financeiro"]
          observacoes?: string | null
          plano_mensal_centavos?: number
          status?: Database["public"]["Enums"]["empresa_contrato_status"]
          updated_at?: string
          valor_colaborador_centavos?: number
          valor_consulta_centavos?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          data_renovacao?: string | null
          empresa_id?: string
          id?: string
          limite_consultas_mes?: number | null
          modelo_financeiro?: Database["public"]["Enums"]["empresa_modelo_financeiro"]
          observacoes?: string | null
          plano_mensal_centavos?: number
          status?: Database["public"]["Enums"]["empresa_contrato_status"]
          updated_at?: string
          valor_colaborador_centavos?: number
          valor_consulta_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "empresas_contratos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_faturas: {
        Row: {
          competencia_ano: number
          competencia_mes: number
          contrato_id: string | null
          created_at: string
          created_by: string | null
          detalhamento: Json
          empresa_id: string
          id: string
          observacoes: string | null
          pago_em: string | null
          qtd_consultas: number
          qtd_funcionarios: number
          status: Database["public"]["Enums"]["empresa_fatura_status"]
          updated_at: string
          valor_total_centavos: number
          vencimento: string
        }
        Insert: {
          competencia_ano: number
          competencia_mes: number
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          detalhamento?: Json
          empresa_id: string
          id?: string
          observacoes?: string | null
          pago_em?: string | null
          qtd_consultas?: number
          qtd_funcionarios?: number
          status?: Database["public"]["Enums"]["empresa_fatura_status"]
          updated_at?: string
          valor_total_centavos?: number
          vencimento: string
        }
        Update: {
          competencia_ano?: number
          competencia_mes?: number
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          detalhamento?: Json
          empresa_id?: string
          id?: string
          observacoes?: string | null
          pago_em?: string | null
          qtd_consultas?: number
          qtd_funcionarios?: number
          status?: Database["public"]["Enums"]["empresa_fatura_status"]
          updated_at?: string
          valor_total_centavos?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_faturas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "empresas_contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_faturas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_funcionarios: {
        Row: {
          cargo: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          data_admissao: string | null
          data_desligamento: string | null
          email: string | null
          empresa_id: string
          id: string
          importado_em: string | null
          matricula: string | null
          nome: string
          origem: string
          paciente_id: string | null
          setor: string | null
          status: Database["public"]["Enums"]["empresa_funcionario_status"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_admissao?: string | null
          data_desligamento?: string | null
          email?: string | null
          empresa_id: string
          id?: string
          importado_em?: string | null
          matricula?: string | null
          nome: string
          origem?: string
          paciente_id?: string | null
          setor?: string | null
          status?: Database["public"]["Enums"]["empresa_funcionario_status"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_admissao?: string | null
          data_desligamento?: string | null
          email?: string | null
          empresa_id?: string
          id?: string
          importado_em?: string | null
          matricula?: string | null
          nome?: string
          origem?: string
          paciente_id?: string | null
          setor?: string | null
          status?: Database["public"]["Enums"]["empresa_funcionario_status"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresas_funcionarios_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_modulos: {
        Row: {
          ativo: boolean
          configuracao: Json
          created_at: string
          empresa_id: string
          id: string
          modulo_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ativo?: boolean
          configuracao?: Json
          created_at?: string
          empresa_id: string
          id?: string
          modulo_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ativo?: boolean
          configuracao?: Json
          created_at?: string
          empresa_id?: string
          id?: string
          modulo_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_modulos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
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
      event_logs: {
        Row: {
          created_at: string
          event_id: string | null
          event_type: string
          id: string
          message: string | null
          metadata: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json | null
          status: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_queue"
            referencedColumns: ["id"]
          },
        ]
      }
      event_queue: {
        Row: {
          attempts: number
          created_at: string
          created_by: string | null
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          event_type: string
          id: string
          max_attempts: number
          origem: string | null
          payload: Json
          processed_at: string | null
          scheduled_for: string
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          max_attempts?: number
          origem?: string | null
          payload?: Json
          processed_at?: string | null
          scheduled_for?: string
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          created_by?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          max_attempts?: number
          origem?: string | null
          payload?: Json
          processed_at?: string | null
          scheduled_for?: string
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Relationships: []
      }
      fechamentos_mensais: {
        Row: {
          bloqueado_em: string | null
          bloqueado_por: string | null
          bloqueio_motivo: string | null
          competencia_ano: number
          competencia_mes: number
          comprovante_url: string | null
          created_at: string
          id: string
          medico_id: string
          observacao: string | null
          pago_em: string | null
          pago_por: string | null
          qtd_consultas: number
          status: Database["public"]["Enums"]["fechamento_status"]
          updated_at: string
          valor_bruto_centavos: number
          valor_medico_centavos: number
          valor_plataforma_centavos: number
        }
        Insert: {
          bloqueado_em?: string | null
          bloqueado_por?: string | null
          bloqueio_motivo?: string | null
          competencia_ano: number
          competencia_mes: number
          comprovante_url?: string | null
          created_at?: string
          id?: string
          medico_id: string
          observacao?: string | null
          pago_em?: string | null
          pago_por?: string | null
          qtd_consultas?: number
          status?: Database["public"]["Enums"]["fechamento_status"]
          updated_at?: string
          valor_bruto_centavos?: number
          valor_medico_centavos?: number
          valor_plataforma_centavos?: number
        }
        Update: {
          bloqueado_em?: string | null
          bloqueado_por?: string | null
          bloqueio_motivo?: string | null
          competencia_ano?: number
          competencia_mes?: number
          comprovante_url?: string | null
          created_at?: string
          id?: string
          medico_id?: string
          observacao?: string | null
          pago_em?: string | null
          pago_por?: string | null
          qtd_consultas?: number
          status?: Database["public"]["Enums"]["fechamento_status"]
          updated_at?: string
          valor_bruto_centavos?: number
          valor_medico_centavos?: number
          valor_plataforma_centavos?: number
        }
        Relationships: []
      }
      financeiro_auditoria: {
        Row: {
          acao: string
          actor_id: string | null
          created_at: string
          entidade: string
          entidade_id: string | null
          id: string
          motivo: string | null
          observacao: string | null
          payload: Json | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          acao: string
          actor_id?: string | null
          created_at?: string
          entidade: string
          entidade_id?: string | null
          id?: string
          motivo?: string | null
          observacao?: string | null
          payload?: Json | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          acao?: string
          actor_id?: string | null
          created_at?: string
          entidade?: string
          entidade_id?: string | null
          id?: string
          motivo?: string | null
          observacao?: string | null
          payload?: Json | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: []
      }
      function_permissions: {
        Row: {
          ativo: boolean
          created_at: string
          funcao_interna: Database["public"]["Enums"]["funcao_interna"]
          id: string
          permission_key: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          funcao_interna: Database["public"]["Enums"]["funcao_interna"]
          id?: string
          permission_key: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          funcao_interna?: Database["public"]["Enums"]["funcao_interna"]
          id?: string
          permission_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "function_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions_catalog"
            referencedColumns: ["permission_key"]
          },
        ]
      }
      gateways_config: {
        Row: {
          ambiente: string
          ativo: boolean
          configuracao: Json
          created_at: string
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["gateway_tipo"]
          updated_at: string
        }
        Insert: {
          ambiente?: string
          ativo?: boolean
          configuracao?: Json
          created_at?: string
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["gateway_tipo"]
          updated_at?: string
        }
        Update: {
          ambiente?: string
          ativo?: boolean
          configuracao?: Json
          created_at?: string
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["gateway_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      impersonation_log: {
        Row: {
          admin_email: string | null
          admin_id: string
          duracao_seg: number | null
          finalizado_em: string | null
          id: string
          iniciado_em: string
          ip: string | null
          motivo: string
          target_email: string | null
          target_id: string
          target_role: string | null
          user_agent: string | null
        }
        Insert: {
          admin_email?: string | null
          admin_id: string
          duracao_seg?: number | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          ip?: string | null
          motivo: string
          target_email?: string | null
          target_id: string
          target_role?: string | null
          user_agent?: string | null
        }
        Update: {
          admin_email?: string | null
          admin_id?: string
          duracao_seg?: number | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          ip?: string | null
          motivo?: string
          target_email?: string | null
          target_id?: string
          target_role?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      impulsionamento_campanhas: {
        Row: {
          cliques: number
          cpc_centavos: number
          created_at: string
          especialidade_ids: string[] | null
          fim: string | null
          gasto_centavos: number
          id: string
          impressoes: number
          inicio: string
          medico_id: string
          orcamento_centavos: number
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          cliques?: number
          cpc_centavos?: number
          created_at?: string
          especialidade_ids?: string[] | null
          fim?: string | null
          gasto_centavos?: number
          id?: string
          impressoes?: number
          inicio?: string
          medico_id: string
          orcamento_centavos?: number
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          cliques?: number
          cpc_centavos?: number
          created_at?: string
          especialidade_ids?: string[] | null
          fim?: string | null
          gasto_centavos?: number
          id?: string
          impressoes?: number
          inicio?: string
          medico_id?: string
          orcamento_centavos?: number
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "impulsionamento_campanhas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      impulsionamento_cliques: {
        Row: {
          campanha_id: string
          created_at: string
          id: string
          ip_hash: string | null
          origem: string | null
          paciente_id: string | null
        }
        Insert: {
          campanha_id: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          origem?: string | null
          paciente_id?: string | null
        }
        Update: {
          campanha_id?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          origem?: string | null
          paciente_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impulsionamento_cliques_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "impulsionamento_campanhas"
            referencedColumns: ["id"]
          },
        ]
      }
      integracoes_config: {
        Row: {
          ambiente: string
          ativo: boolean
          config: Json
          created_at: string
          descricao: string | null
          id: string
          modo_simulado: boolean
          nome: string
          secrets_keys: string[] | null
          status: Database["public"]["Enums"]["integracao_status"]
          tipo: Database["public"]["Enums"]["integracao_tipo"]
          ultima_sincronizacao_at: string | null
          ultimo_erro: string | null
          ultimo_teste_at: string | null
          ultimo_teste_ok: boolean | null
          updated_at: string
        }
        Insert: {
          ambiente?: string
          ativo?: boolean
          config?: Json
          created_at?: string
          descricao?: string | null
          id?: string
          modo_simulado?: boolean
          nome: string
          secrets_keys?: string[] | null
          status?: Database["public"]["Enums"]["integracao_status"]
          tipo: Database["public"]["Enums"]["integracao_tipo"]
          ultima_sincronizacao_at?: string | null
          ultimo_erro?: string | null
          ultimo_teste_at?: string | null
          ultimo_teste_ok?: boolean | null
          updated_at?: string
        }
        Update: {
          ambiente?: string
          ativo?: boolean
          config?: Json
          created_at?: string
          descricao?: string | null
          id?: string
          modo_simulado?: boolean
          nome?: string
          secrets_keys?: string[] | null
          status?: Database["public"]["Enums"]["integracao_status"]
          tipo?: Database["public"]["Enums"]["integracao_tipo"]
          ultima_sincronizacao_at?: string | null
          ultimo_erro?: string | null
          ultimo_teste_at?: string | null
          ultimo_teste_ok?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      integracoes_logs: {
        Row: {
          acao: string
          created_at: string
          duracao_ms: number | null
          entidade_id_externo: string | null
          entidade_id_interno: string | null
          entidade_tipo: string | null
          erro: string | null
          id: string
          integracao: Database["public"]["Enums"]["integracao_tipo"]
          origem: string
          payload_envio: Json | null
          payload_resposta: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          duracao_ms?: number | null
          entidade_id_externo?: string | null
          entidade_id_interno?: string | null
          entidade_tipo?: string | null
          erro?: string | null
          id?: string
          integracao: Database["public"]["Enums"]["integracao_tipo"]
          origem?: string
          payload_envio?: Json | null
          payload_resposta?: Json | null
          status?: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          duracao_ms?: number | null
          entidade_id_externo?: string | null
          entidade_id_interno?: string | null
          entidade_tipo?: string | null
          erro?: string | null
          id?: string
          integracao?: Database["public"]["Enums"]["integracao_tipo"]
          origem?: string
          payload_envio?: Json | null
          payload_resposta?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      integracoes_pendencias: {
        Row: {
          created_at: string
          descricao: string | null
          entidade_id: string | null
          entidade_tipo: string | null
          id: string
          integracao: Database["public"]["Enums"]["integracao_tipo"]
          metadata: Json | null
          motivo_resolucao: string | null
          prioridade: string
          resolvido_at: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["pendencia_status"]
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          integracao: Database["public"]["Enums"]["integracao_tipo"]
          metadata?: Json | null
          motivo_resolucao?: string | null
          prioridade?: string
          resolvido_at?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["pendencia_status"]
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          integracao?: Database["public"]["Enums"]["integracao_tipo"]
          metadata?: Json | null
          motivo_resolucao?: string | null
          prioridade?: string
          resolvido_at?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["pendencia_status"]
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      integracoes_status_mapping: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          sistema_origem: string
          status_externo: string
          status_interno: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          sistema_origem: string
          status_externo: string
          status_interno: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          sistema_origem?: string
          status_externo?: string
          status_interno?: string
          updated_at?: string
        }
        Relationships: []
      }
      internal_notes: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          note: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          note: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          note?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email_norm: string
          id: number
          ip_address: unknown
          success: boolean
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string
          email_norm: string
          id?: number
          ip_address?: unknown
          success: boolean
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string
          email_norm?: string
          id?: number
          ip_address?: unknown
          success?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          ativo: boolean
          canal: string
          created_at: string
          created_by: string | null
          custo_total: number
          fim: string | null
          id: string
          inicio: string | null
          nome: string
          observacoes: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          ativo?: boolean
          canal: string
          created_at?: string
          created_by?: string | null
          custo_total?: number
          fim?: string | null
          id?: string
          inicio?: string | null
          nome: string
          observacoes?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          ativo?: boolean
          canal?: string
          created_at?: string
          created_by?: string | null
          custo_total?: number
          fim?: string | null
          id?: string
          inicio?: string | null
          nome?: string
          observacoes?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      marketing_campanhas: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          custo_centavos: number
          data_fim: string | null
          data_inicio: string | null
          descricao: string | null
          fonte: string
          id: string
          nome: string
          observacoes: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          custo_centavos?: number
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          fonte?: string
          id?: string
          nome: string
          observacoes?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          custo_centavos?: number
          data_fim?: string | null
          data_inicio?: string | null
          descricao?: string | null
          fonte?: string
          id?: string
          nome?: string
          observacoes?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      marketing_eventos: {
        Row: {
          agendamentos: number
          campanha_id: string | null
          consultas: number
          created_at: string
          created_by: string | null
          data: string
          fonte: string
          id: string
          leads: number
          observacao: string | null
          receita_centavos: number
          retornos: number
          visitantes: number
        }
        Insert: {
          agendamentos?: number
          campanha_id?: string | null
          consultas?: number
          created_at?: string
          created_by?: string | null
          data?: string
          fonte?: string
          id?: string
          leads?: number
          observacao?: string | null
          receita_centavos?: number
          retornos?: number
          visitantes?: number
        }
        Update: {
          agendamentos?: number
          campanha_id?: string | null
          consultas?: number
          created_at?: string
          created_by?: string | null
          data?: string
          fonte?: string
          id?: string
          leads?: number
          observacao?: string | null
          receita_centavos?: number
          retornos?: number
          visitantes?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketing_eventos_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "marketing_campanhas"
            referencedColumns: ["id"]
          },
        ]
      }
      medico_comissao_override: {
        Row: {
          ativo: boolean
          comissao_pct: number
          created_at: string
          created_by: string | null
          id: string
          medico_id: string
          motivo: string | null
          servico_id: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          comissao_pct: number
          created_at?: string
          created_by?: string | null
          id?: string
          medico_id: string
          motivo?: string | null
          servico_id?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          comissao_pct?: number
          created_at?: string
          created_by?: string | null
          id?: string
          medico_id?: string
          motivo?: string | null
          servico_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      medico_dados_bancarios: {
        Row: {
          agencia: string
          ativo: boolean
          banco: string
          conta: string
          created_at: string
          id: string
          medico_id: string
          pix_chave: string | null
          pix_tipo: Database["public"]["Enums"]["pix_tipo"] | null
          tipo_conta: Database["public"]["Enums"]["tipo_conta_bancaria"]
          tipo_pessoa: Database["public"]["Enums"]["tipo_pessoa"]
          titular_documento: string
          titular_nome: string
          updated_at: string
        }
        Insert: {
          agencia?: string
          ativo?: boolean
          banco?: string
          conta?: string
          created_at?: string
          id?: string
          medico_id: string
          pix_chave?: string | null
          pix_tipo?: Database["public"]["Enums"]["pix_tipo"] | null
          tipo_conta?: Database["public"]["Enums"]["tipo_conta_bancaria"]
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa"]
          titular_documento?: string
          titular_nome?: string
          updated_at?: string
        }
        Update: {
          agencia?: string
          ativo?: boolean
          banco?: string
          conta?: string
          created_at?: string
          id?: string
          medico_id?: string
          pix_chave?: string | null
          pix_tipo?: Database["public"]["Enums"]["pix_tipo"] | null
          tipo_conta?: Database["public"]["Enums"]["tipo_conta_bancaria"]
          tipo_pessoa?: Database["public"]["Enums"]["tipo_pessoa"]
          titular_documento?: string
          titular_nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_dados_bancarios_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      medico_enderecos: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string
          estado: string | null
          id: string
          medico_id: string
          numero: string | null
          rua: string | null
          tipo: Database["public"]["Enums"]["endereco_tipo"]
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          medico_id: string
          numero?: string | null
          rua?: string | null
          tipo?: Database["public"]["Enums"]["endereco_tipo"]
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          medico_id?: string
          numero?: string | null
          rua?: string | null
          tipo?: Database["public"]["Enums"]["endereco_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_enderecos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      medico_especialidades: {
        Row: {
          ativo: boolean
          created_at: string
          duracao_minutos: number
          especialidade_id: string
          especialista: boolean
          id: string
          medico_id: string
          modalidades: Database["public"]["Enums"]["consulta_modalidade"][]
          preco_centavos: number
          pronto_atendimento: boolean
          rqe: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          duracao_minutos?: number
          especialidade_id: string
          especialista?: boolean
          id?: string
          medico_id: string
          modalidades?: Database["public"]["Enums"]["consulta_modalidade"][]
          preco_centavos?: number
          pronto_atendimento?: boolean
          rqe?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          duracao_minutos?: number
          especialidade_id?: string
          especialista?: boolean
          id?: string
          medico_id?: string
          modalidades?: Database["public"]["Enums"]["consulta_modalidade"][]
          preco_centavos?: number
          pronto_atendimento?: boolean
          rqe?: string | null
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
      medico_nfes: {
        Row: {
          arquivo_url: string | null
          created_at: string
          data_emissao: string | null
          id: string
          medico_id: string
          numero_nota: string | null
          observacao: string | null
          saque_id: string | null
          status: Database["public"]["Enums"]["nfe_status"]
          valor_centavos: number | null
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          data_emissao?: string | null
          id?: string
          medico_id: string
          numero_nota?: string | null
          observacao?: string | null
          saque_id?: string | null
          status?: Database["public"]["Enums"]["nfe_status"]
          valor_centavos?: number | null
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          data_emissao?: string | null
          id?: string
          medico_id?: string
          numero_nota?: string | null
          observacao?: string | null
          saque_id?: string | null
          status?: Database["public"]["Enums"]["nfe_status"]
          valor_centavos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medico_nfes_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_nfes_saque_id_fkey"
            columns: ["saque_id"]
            isOneToOne: false
            referencedRelation: "saques_medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      medico_premium: {
        Row: {
          ativo: boolean
          auto_renovar: boolean
          created_at: string
          fim: string | null
          id: string
          inicio: string | null
          medico_id: string
          stripe_subscription_id: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          auto_renovar?: boolean
          created_at?: string
          fim?: string | null
          id?: string
          inicio?: string | null
          medico_id: string
          stripe_subscription_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          auto_renovar?: boolean
          created_at?: string
          fim?: string | null
          id?: string
          inicio?: string | null
          medico_id?: string
          stripe_subscription_id?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_premium_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      medico_ranking: {
        Row: {
          avaliacao_media: number
          fator_premium: number
          fator_recencia: number
          last_activity_at: string | null
          medico_id: string
          posicao: number | null
          ranking_score: number
          taxa_conversao: number
          taxa_no_show: number
          total_agendamentos: number
          total_atendimentos: number
          total_avaliacoes: number
          updated_at: string
        }
        Insert: {
          avaliacao_media?: number
          fator_premium?: number
          fator_recencia?: number
          last_activity_at?: string | null
          medico_id: string
          posicao?: number | null
          ranking_score?: number
          taxa_conversao?: number
          taxa_no_show?: number
          total_agendamentos?: number
          total_atendimentos?: number
          total_avaliacoes?: number
          updated_at?: string
        }
        Update: {
          avaliacao_media?: number
          fator_premium?: number
          fator_recencia?: number
          last_activity_at?: string | null
          medico_id?: string
          posicao?: number | null
          ranking_score?: number
          taxa_conversao?: number
          taxa_no_show?: number
          total_agendamentos?: number
          total_atendimentos?: number
          total_avaliacoes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_ranking_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      medico_servicos: {
        Row: {
          aderido_em: string
          ativo: boolean
          created_at: string
          desativado_em: string | null
          id: string
          medico_id: string
          servico_id: string
          status: Database["public"]["Enums"]["medico_servico_status"]
          updated_at: string
        }
        Insert: {
          aderido_em?: string
          ativo?: boolean
          created_at?: string
          desativado_em?: string | null
          id?: string
          medico_id: string
          servico_id: string
          status?: Database["public"]["Enums"]["medico_servico_status"]
          updated_at?: string
        }
        Update: {
          aderido_em?: string
          ativo?: boolean
          created_at?: string
          desativado_em?: string | null
          id?: string
          medico_id?: string
          servico_id?: string
          status?: Database["public"]["Enums"]["medico_servico_status"]
          updated_at?: string
        }
        Relationships: []
      }
      medicos: {
        Row: {
          analise_observacao: string | null
          aprovado_em: string | null
          aprovado_por: string | null
          bio: string | null
          bloqueio_aplicado_em: string | null
          bloqueio_aplicado_por: string | null
          bloqueio_motivo: string | null
          bloqueio_observacao: string | null
          cpf: string | null
          created_at: string
          crm: string
          crm_estado: string
          data_nascimento: string | null
          documentos: Json
          email: string
          especialidade: string
          feegow_erro: string | null
          feegow_liberado_em: string | null
          feegow_payload: Json | null
          feegow_professional_id: string | null
          feegow_status: Database["public"]["Enums"]["feegow_status"]
          id: string
          link_sala_padrao: string | null
          motivo_reprovacao: string | null
          nome: string
          prioridade_atendimento: number
          rqe: string | null
          status: Database["public"]["Enums"]["medico_status"]
          suspensao_aplicada_em: string | null
          suspensao_aplicada_por: string | null
          suspensao_motivo: string | null
          suspensao_observacao: string | null
          suspenso_ate: string | null
          suspenso_indeterminado: boolean
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analise_observacao?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          bio?: string | null
          bloqueio_aplicado_em?: string | null
          bloqueio_aplicado_por?: string | null
          bloqueio_motivo?: string | null
          bloqueio_observacao?: string | null
          cpf?: string | null
          created_at?: string
          crm: string
          crm_estado: string
          data_nascimento?: string | null
          documentos?: Json
          email: string
          especialidade: string
          feegow_erro?: string | null
          feegow_liberado_em?: string | null
          feegow_payload?: Json | null
          feegow_professional_id?: string | null
          feegow_status?: Database["public"]["Enums"]["feegow_status"]
          id?: string
          link_sala_padrao?: string | null
          motivo_reprovacao?: string | null
          nome: string
          prioridade_atendimento?: number
          rqe?: string | null
          status?: Database["public"]["Enums"]["medico_status"]
          suspensao_aplicada_em?: string | null
          suspensao_aplicada_por?: string | null
          suspensao_motivo?: string | null
          suspensao_observacao?: string | null
          suspenso_ate?: string | null
          suspenso_indeterminado?: boolean
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analise_observacao?: string | null
          aprovado_em?: string | null
          aprovado_por?: string | null
          bio?: string | null
          bloqueio_aplicado_em?: string | null
          bloqueio_aplicado_por?: string | null
          bloqueio_motivo?: string | null
          bloqueio_observacao?: string | null
          cpf?: string | null
          created_at?: string
          crm?: string
          crm_estado?: string
          data_nascimento?: string | null
          documentos?: Json
          email?: string
          especialidade?: string
          feegow_erro?: string | null
          feegow_liberado_em?: string | null
          feegow_payload?: Json | null
          feegow_professional_id?: string | null
          feegow_status?: Database["public"]["Enums"]["feegow_status"]
          id?: string
          link_sala_padrao?: string | null
          motivo_reprovacao?: string | null
          nome?: string
          prioridade_atendimento?: number
          rqe?: string | null
          status?: Database["public"]["Enums"]["medico_status"]
          suspensao_aplicada_em?: string | null
          suspensao_aplicada_por?: string | null
          suspensao_motivo?: string | null
          suspensao_observacao?: string | null
          suspenso_ate?: string | null
          suspenso_indeterminado?: boolean
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
          observacao: string | null
          payload: Json | null
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
          observacao?: string | null
          payload?: Json | null
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
          observacao?: string | null
          payload?: Json | null
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
      message_templates: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["template_category"]
          content: string
          created_at: string
          created_by: string | null
          id: string
          language: string
          name: string
          updated_at: string
          variables: string[]
          whatsapp_status: Database["public"]["Enums"]["template_wa_status"]
          whatsapp_template_name: string | null
        }
        Insert: {
          active?: boolean
          category?: Database["public"]["Enums"]["template_category"]
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string
          name: string
          updated_at?: string
          variables?: string[]
          whatsapp_status?: Database["public"]["Enums"]["template_wa_status"]
          whatsapp_template_name?: string | null
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["template_category"]
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          language?: string
          name?: string
          updated_at?: string
          variables?: string[]
          whatsapp_status?: Database["public"]["Enums"]["template_wa_status"]
          whatsapp_template_name?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          body: string | null
          conversation_id: string
          created_at: string
          failure_reason: string | null
          id: string
          media_mime: string | null
          media_url: string | null
          message_type: Database["public"]["Enums"]["message_type"]
          metadata: Json
          read_at: string | null
          sender_id: string | null
          sender_name: string | null
          sender_type: Database["public"]["Enums"]["message_sender_type"]
          status: Database["public"]["Enums"]["message_status"]
          template_id: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          media_mime?: string | null
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"]
          metadata?: Json
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_type: Database["public"]["Enums"]["message_sender_type"]
          status?: Database["public"]["Enums"]["message_status"]
          template_id?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          media_mime?: string | null
          media_url?: string | null
          message_type?: Database["public"]["Enums"]["message_type"]
          metadata?: Json
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: Database["public"]["Enums"]["message_sender_type"]
          status?: Database["public"]["Enums"]["message_status"]
          template_id?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          alergias: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          condicoes_cronicas: string | null
          contato_emergencia_nome: string | null
          contato_emergencia_telefone: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          empresa_cargo: string | null
          empresa_id: string | null
          empresa_setor: string | null
          estado_civil: string | null
          feegow_erro: string | null
          feegow_paciente_id: string | null
          feegow_status: Database["public"]["Enums"]["feegow_status"]
          feegow_ultimo_envio_em: string | null
          id: string
          logradouro: string | null
          matricula_empresa: string | null
          medicamentos_uso: string | null
          nacionalidade: string | null
          nome_completo: string | null
          numero: string | null
          observacoes_internas: string | null
          origem_cadastro: string | null
          responsavel_cadastro_id: string | null
          rg: string | null
          sexo: Database["public"]["Enums"]["sexo_biologico"]
          status_alterado_em: string | null
          status_alterado_por: string | null
          status_conta: Database["public"]["Enums"]["status_conta_paciente"]
          status_motivo: string | null
          status_observacao: string | null
          tags: string[]
          telefone: string | null
          telefone_secundario: string | null
          uf: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alergias?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          condicoes_cronicas?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          empresa_cargo?: string | null
          empresa_id?: string | null
          empresa_setor?: string | null
          estado_civil?: string | null
          feegow_erro?: string | null
          feegow_paciente_id?: string | null
          feegow_status?: Database["public"]["Enums"]["feegow_status"]
          feegow_ultimo_envio_em?: string | null
          id?: string
          logradouro?: string | null
          matricula_empresa?: string | null
          medicamentos_uso?: string | null
          nacionalidade?: string | null
          nome_completo?: string | null
          numero?: string | null
          observacoes_internas?: string | null
          origem_cadastro?: string | null
          responsavel_cadastro_id?: string | null
          rg?: string | null
          sexo?: Database["public"]["Enums"]["sexo_biologico"]
          status_alterado_em?: string | null
          status_alterado_por?: string | null
          status_conta?: Database["public"]["Enums"]["status_conta_paciente"]
          status_motivo?: string | null
          status_observacao?: string | null
          tags?: string[]
          telefone?: string | null
          telefone_secundario?: string | null
          uf?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alergias?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          condicoes_cronicas?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          empresa_cargo?: string | null
          empresa_id?: string | null
          empresa_setor?: string | null
          estado_civil?: string | null
          feegow_erro?: string | null
          feegow_paciente_id?: string | null
          feegow_status?: Database["public"]["Enums"]["feegow_status"]
          feegow_ultimo_envio_em?: string | null
          id?: string
          logradouro?: string | null
          matricula_empresa?: string | null
          medicamentos_uso?: string | null
          nacionalidade?: string | null
          nome_completo?: string | null
          numero?: string | null
          observacoes_internas?: string | null
          origem_cadastro?: string | null
          responsavel_cadastro_id?: string | null
          rg?: string | null
          sexo?: Database["public"]["Enums"]["sexo_biologico"]
          status_alterado_em?: string | null
          status_alterado_por?: string | null
          status_conta?: Database["public"]["Enums"]["status_conta_paciente"]
          status_motivo?: string | null
          status_observacao?: string | null
          tags?: string[]
          telefone?: string | null
          telefone_secundario?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pacientes_auditoria: {
        Row: {
          acao: string
          actor_id: string | null
          created_at: string
          id: string
          motivo: string | null
          observacao: string | null
          paciente_id: string
          payload: Json | null
          status_anterior:
            | Database["public"]["Enums"]["status_conta_paciente"]
            | null
          status_novo:
            | Database["public"]["Enums"]["status_conta_paciente"]
            | null
        }
        Insert: {
          acao: string
          actor_id?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          paciente_id: string
          payload?: Json | null
          status_anterior?:
            | Database["public"]["Enums"]["status_conta_paciente"]
            | null
          status_novo?:
            | Database["public"]["Enums"]["status_conta_paciente"]
            | null
        }
        Update: {
          acao?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          paciente_id?: string
          payload?: Json | null
          status_anterior?:
            | Database["public"]["Enums"]["status_conta_paciente"]
            | null
          status_novo?:
            | Database["public"]["Enums"]["status_conta_paciente"]
            | null
        }
        Relationships: []
      }
      pagamentos: {
        Row: {
          cancelled_at: string | null
          checkout_url: string | null
          comprovante_url: string | null
          consulta_id: string
          created_at: string
          created_by: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          empresa_id: string | null
          gateway: string | null
          gateway_ref: string | null
          id: string
          medico_id: string | null
          metadata: Json
          metodo: Database["public"]["Enums"]["pagamento_metodo"]
          moeda: string
          observacoes_internas: string | null
          paciente_id: string | null
          paid_at: string | null
          provider: Database["public"]["Enums"]["pagamento_provider"]
          provider_payment_id: string | null
          provider_session_id: string | null
          responsavel_cobranca: string | null
          servico_id: string | null
          snapshot_at: string | null
          status: Database["public"]["Enums"]["pagamento_status"]
          taxa_gateway_centavos: number
          taxa_gateway_snapshot: number | null
          taxa_imposto_centavos: number
          taxa_imposto_snapshot: number | null
          updated_at: string
          valor_bruto_centavos: number
          valor_bruto_snapshot: number | null
          valor_centavos: number
          valor_liquido_centavos: number
          valor_liquido_snapshot: number | null
          valor_reembolsado_centavos: number
        }
        Insert: {
          cancelled_at?: string | null
          checkout_url?: string | null
          comprovante_url?: string | null
          consulta_id: string
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          empresa_id?: string | null
          gateway?: string | null
          gateway_ref?: string | null
          id?: string
          medico_id?: string | null
          metadata?: Json
          metodo?: Database["public"]["Enums"]["pagamento_metodo"]
          moeda?: string
          observacoes_internas?: string | null
          paciente_id?: string | null
          paid_at?: string | null
          provider?: Database["public"]["Enums"]["pagamento_provider"]
          provider_payment_id?: string | null
          provider_session_id?: string | null
          responsavel_cobranca?: string | null
          servico_id?: string | null
          snapshot_at?: string | null
          status?: Database["public"]["Enums"]["pagamento_status"]
          taxa_gateway_centavos?: number
          taxa_gateway_snapshot?: number | null
          taxa_imposto_centavos?: number
          taxa_imposto_snapshot?: number | null
          updated_at?: string
          valor_bruto_centavos?: number
          valor_bruto_snapshot?: number | null
          valor_centavos: number
          valor_liquido_centavos?: number
          valor_liquido_snapshot?: number | null
          valor_reembolsado_centavos?: number
        }
        Update: {
          cancelled_at?: string | null
          checkout_url?: string | null
          comprovante_url?: string | null
          consulta_id?: string
          created_at?: string
          created_by?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          empresa_id?: string | null
          gateway?: string | null
          gateway_ref?: string | null
          id?: string
          medico_id?: string | null
          metadata?: Json
          metodo?: Database["public"]["Enums"]["pagamento_metodo"]
          moeda?: string
          observacoes_internas?: string | null
          paciente_id?: string | null
          paid_at?: string | null
          provider?: Database["public"]["Enums"]["pagamento_provider"]
          provider_payment_id?: string | null
          provider_session_id?: string | null
          responsavel_cobranca?: string | null
          servico_id?: string | null
          snapshot_at?: string | null
          status?: Database["public"]["Enums"]["pagamento_status"]
          taxa_gateway_centavos?: number
          taxa_gateway_snapshot?: number | null
          taxa_imposto_centavos?: number
          taxa_imposto_snapshot?: number | null
          updated_at?: string
          valor_bruto_centavos?: number
          valor_bruto_snapshot?: number | null
          valor_centavos?: number
          valor_liquido_centavos?: number
          valor_liquido_snapshot?: number | null
          valor_reembolsado_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
        ]
      }
      password_policy: {
        Row: {
          expiration_days: number
          hibp_enabled: boolean
          id: number
          min_length: number
          require_complexity: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          expiration_days?: number
          hibp_enabled?: boolean
          id?: number
          min_length?: number
          require_complexity?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          expiration_days?: number
          hibp_enabled?: boolean
          id?: number
          min_length?: number
          require_complexity?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      permission_audit_logs: {
        Row: {
          acao: string
          changed_by: string | null
          created_at: string
          id: string
          motivo: string | null
          permission_key: string | null
          scope: string
          target_funcao: Database["public"]["Enums"]["funcao_interna"] | null
          target_role: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string | null
          valor_antes: Json | null
          valor_depois: Json | null
        }
        Insert: {
          acao: string
          changed_by?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          permission_key?: string | null
          scope: string
          target_funcao?: Database["public"]["Enums"]["funcao_interna"] | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string | null
          valor_antes?: Json | null
          valor_depois?: Json | null
        }
        Update: {
          acao?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          permission_key?: string | null
          scope?: string
          target_funcao?: Database["public"]["Enums"]["funcao_interna"] | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string | null
          valor_antes?: Json | null
          valor_depois?: Json | null
        }
        Relationships: []
      }
      permissions_catalog: {
        Row: {
          created_at: string
          descricao: string
          modulo: string
          ordem: number
          permission_key: string
          risco: string
        }
        Insert: {
          created_at?: string
          descricao: string
          modulo: string
          ordem?: number
          permission_key: string
          risco?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          modulo?: string
          ordem?: number
          permission_key?: string
          risco?: string
        }
        Relationships: []
      }
      permissoes_colaborador: {
        Row: {
          concedido_por: string | null
          created_at: string
          efeito: Database["public"]["Enums"]["permissao_efeito"]
          id: string
          motivo: string | null
          permission_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          concedido_por?: string | null
          created_at?: string
          efeito?: Database["public"]["Enums"]["permissao_efeito"]
          id?: string
          motivo?: string | null
          permission_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          concedido_por?: string | null
          created_at?: string
          efeito?: Database["public"]["Enums"]["permissao_efeito"]
          id?: string
          motivo?: string | null
          permission_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      permissoes_perfil: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      plano_beneficios: {
        Row: {
          acumulativo: boolean
          created_at: string
          custo_estimado_centavos: number
          desconto_pct: number
          descricao: string | null
          especialidade_id: string | null
          id: string
          ilimitado: boolean
          medico_id: string | null
          nome: string
          ordem: number
          periodo: Database["public"]["Enums"]["beneficio_periodo"]
          plano_id: string
          preco_fixo_centavos: number | null
          quantidade: number
          regra_uso: string | null
          servico_id: string | null
          tipo: Database["public"]["Enums"]["beneficio_tipo"]
          updated_at: string
          valor_adicional_centavos: number
        }
        Insert: {
          acumulativo?: boolean
          created_at?: string
          custo_estimado_centavos?: number
          desconto_pct?: number
          descricao?: string | null
          especialidade_id?: string | null
          id?: string
          ilimitado?: boolean
          medico_id?: string | null
          nome: string
          ordem?: number
          periodo?: Database["public"]["Enums"]["beneficio_periodo"]
          plano_id: string
          preco_fixo_centavos?: number | null
          quantidade?: number
          regra_uso?: string | null
          servico_id?: string | null
          tipo: Database["public"]["Enums"]["beneficio_tipo"]
          updated_at?: string
          valor_adicional_centavos?: number
        }
        Update: {
          acumulativo?: boolean
          created_at?: string
          custo_estimado_centavos?: number
          desconto_pct?: number
          descricao?: string | null
          especialidade_id?: string | null
          id?: string
          ilimitado?: boolean
          medico_id?: string | null
          nome?: string
          ordem?: number
          periodo?: Database["public"]["Enums"]["beneficio_periodo"]
          plano_id?: string
          preco_fixo_centavos?: number | null
          quantidade?: number
          regra_uso?: string | null
          servico_id?: string | null
          tipo?: Database["public"]["Enums"]["beneficio_tipo"]
          updated_at?: string
          valor_adicional_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "plano_beneficios_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_cancelamento_evento: {
        Row: {
          admin_acao: string | null
          admin_acao_em: string | null
          admin_id: string | null
          created_at: string
          id: string
          medico_id: string
          motivo: string | null
          plano_id: string
          status: string
          termos_aceitos: boolean
          tipo_encerramento: Database["public"]["Enums"]["modo_cancelamento_plano"]
          total_pacientes: number
          updated_at: string
          valor_total_comprometido_centavos: number
        }
        Insert: {
          admin_acao?: string | null
          admin_acao_em?: string | null
          admin_id?: string | null
          created_at?: string
          id?: string
          medico_id: string
          motivo?: string | null
          plano_id: string
          status?: string
          termos_aceitos?: boolean
          tipo_encerramento?: Database["public"]["Enums"]["modo_cancelamento_plano"]
          total_pacientes?: number
          updated_at?: string
          valor_total_comprometido_centavos?: number
        }
        Update: {
          admin_acao?: string | null
          admin_acao_em?: string | null
          admin_id?: string | null
          created_at?: string
          id?: string
          medico_id?: string
          motivo?: string | null
          plano_id?: string
          status?: string
          termos_aceitos?: boolean
          tipo_encerramento?: Database["public"]["Enums"]["modo_cancelamento_plano"]
          total_pacientes?: number
          updated_at?: string
          valor_total_comprometido_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "plano_cancelamento_evento_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_medico_status_log: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          medico_id: string | null
          motivo: string | null
          plano_id: string
          status_anterior: string | null
          status_novo: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          medico_id?: string | null
          motivo?: string | null
          plano_id: string
          status_anterior?: string | null
          status_novo: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          medico_id?: string | null
          motivo?: string | null
          plano_id?: string
          status_anterior?: string | null
          status_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_medico_status_log_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_medicos: {
        Row: {
          aceite_em: string | null
          aceite_medico: boolean
          created_at: string
          id: string
          medico_id: string
          plano_id: string
        }
        Insert: {
          aceite_em?: string | null
          aceite_medico?: boolean
          created_at?: string
          id?: string
          medico_id: string
          plano_id: string
        }
        Update: {
          aceite_em?: string | null
          aceite_medico?: boolean
          created_at?: string
          id?: string
          medico_id?: string
          plano_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_medicos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_medicos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_taxa_plataforma: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          id: string
          tipo: string
          valor_fixo_centavos: number
          valor_pct: number
          vigencia_inicio: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          tipo?: string
          valor_fixo_centavos?: number
          valor_pct?: number
          vigencia_inicio?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          tipo?: string
          valor_fixo_centavos?: number
          valor_pct?: number
          vigencia_inicio?: string
        }
        Relationships: []
      }
      planos: {
        Row: {
          aprovado_admin: boolean
          categoria: Database["public"]["Enums"]["plano_categoria"]
          created_at: string
          created_by: string | null
          cta_texto: string | null
          cta_url: string | null
          custo_operacional_centavos: number
          desconto_geral_pct: number
          descricao: string | null
          descricao_comercial: string | null
          destacado: boolean
          empresa_id: string | null
          especialidade_id: string | null
          icone: string | null
          id: string
          imagem_url: string | null
          imposto_estimado_pct: number
          medico_id: string | null
          modelo_cobranca: Database["public"]["Enums"]["plano_cobranca"]
          nivel: Database["public"]["Enums"]["plano_nivel"]
          nome: string
          ordem_exibicao: number
          plano_base_id: string | null
          publicado_site: boolean
          publico: Database["public"]["Enums"]["plano_publico"]
          regra_acesso: Database["public"]["Enums"]["plano_regra_acesso"]
          status: Database["public"]["Enums"]["plano_status"]
          taxa_adesao_centavos: number
          taxa_pagamento_pct: number
          termos_aceitos: boolean
          updated_at: string
          valor_anual_centavos: number
          valor_mensal_centavos: number
          valor_promocional_centavos: number | null
          versao: number
        }
        Insert: {
          aprovado_admin?: boolean
          categoria?: Database["public"]["Enums"]["plano_categoria"]
          created_at?: string
          created_by?: string | null
          cta_texto?: string | null
          cta_url?: string | null
          custo_operacional_centavos?: number
          desconto_geral_pct?: number
          descricao?: string | null
          descricao_comercial?: string | null
          destacado?: boolean
          empresa_id?: string | null
          especialidade_id?: string | null
          icone?: string | null
          id?: string
          imagem_url?: string | null
          imposto_estimado_pct?: number
          medico_id?: string | null
          modelo_cobranca?: Database["public"]["Enums"]["plano_cobranca"]
          nivel?: Database["public"]["Enums"]["plano_nivel"]
          nome: string
          ordem_exibicao?: number
          plano_base_id?: string | null
          publicado_site?: boolean
          publico?: Database["public"]["Enums"]["plano_publico"]
          regra_acesso?: Database["public"]["Enums"]["plano_regra_acesso"]
          status?: Database["public"]["Enums"]["plano_status"]
          taxa_adesao_centavos?: number
          taxa_pagamento_pct?: number
          termos_aceitos?: boolean
          updated_at?: string
          valor_anual_centavos?: number
          valor_mensal_centavos?: number
          valor_promocional_centavos?: number | null
          versao?: number
        }
        Update: {
          aprovado_admin?: boolean
          categoria?: Database["public"]["Enums"]["plano_categoria"]
          created_at?: string
          created_by?: string | null
          cta_texto?: string | null
          cta_url?: string | null
          custo_operacional_centavos?: number
          desconto_geral_pct?: number
          descricao?: string | null
          descricao_comercial?: string | null
          destacado?: boolean
          empresa_id?: string | null
          especialidade_id?: string | null
          icone?: string | null
          id?: string
          imagem_url?: string | null
          imposto_estimado_pct?: number
          medico_id?: string | null
          modelo_cobranca?: Database["public"]["Enums"]["plano_cobranca"]
          nivel?: Database["public"]["Enums"]["plano_nivel"]
          nome?: string
          ordem_exibicao?: number
          plano_base_id?: string | null
          publicado_site?: boolean
          publico?: Database["public"]["Enums"]["plano_publico"]
          regra_acesso?: Database["public"]["Enums"]["plano_regra_acesso"]
          status?: Database["public"]["Enums"]["plano_status"]
          taxa_adesao_centavos?: number
          taxa_pagamento_pct?: number
          termos_aceitos?: boolean
          updated_at?: string
          valor_anual_centavos?: number
          valor_mensal_centavos?: number
          valor_promocional_centavos?: number | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "planos_plano_base_id_fkey"
            columns: ["plano_base_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_auditoria: {
        Row: {
          acao: string
          actor_id: string | null
          assinatura_id: string | null
          campo: string | null
          created_at: string
          id: string
          motivo: string | null
          observacao: string | null
          payload: Json | null
          plano_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          acao: string
          actor_id?: string | null
          assinatura_id?: string | null
          campo?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          payload?: Json | null
          plano_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          acao?: string
          actor_id?: string | null
          assinatura_id?: string | null
          campo?: string | null
          created_at?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          payload?: Json | null
          plano_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
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
      ranking_config: {
        Row: {
          id: string
          min_avaliacoes_exibir: number
          peso_atendimentos: number
          peso_avaliacao: number
          peso_conversao: number
          peso_no_show: number
          peso_premium: number
          peso_recencia: number
          recencia_dias_ativo: number
          recencia_dias_penalidade: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          min_avaliacoes_exibir?: number
          peso_atendimentos?: number
          peso_avaliacao?: number
          peso_conversao?: number
          peso_no_show?: number
          peso_premium?: number
          peso_recencia?: number
          recencia_dias_ativo?: number
          recencia_dias_penalidade?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          min_avaliacoes_exibir?: number
          peso_atendimentos?: number
          peso_avaliacao?: number
          peso_conversao?: number
          peso_no_show?: number
          peso_premium?: number
          peso_recencia?: number
          recencia_dias_ativo?: number
          recencia_dias_penalidade?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      reembolso_planos: {
        Row: {
          assinatura_id: string | null
          cancelamento_evento_id: string | null
          created_at: string
          dias_restantes: number
          dias_total_ciclo: number
          id: string
          motivo: string | null
          paciente_id: string
          plano_id: string
          processado_em: string | null
          processado_por: string | null
          status: Database["public"]["Enums"]["reembolso_status"]
          updated_at: string
          valor_centavos: number
          valor_proporcional_centavos: number
        }
        Insert: {
          assinatura_id?: string | null
          cancelamento_evento_id?: string | null
          created_at?: string
          dias_restantes?: number
          dias_total_ciclo?: number
          id?: string
          motivo?: string | null
          paciente_id: string
          plano_id: string
          processado_em?: string | null
          processado_por?: string | null
          status?: Database["public"]["Enums"]["reembolso_status"]
          updated_at?: string
          valor_centavos?: number
          valor_proporcional_centavos?: number
        }
        Update: {
          assinatura_id?: string | null
          cancelamento_evento_id?: string | null
          created_at?: string
          dias_restantes?: number
          dias_total_ciclo?: number
          id?: string
          motivo?: string | null
          paciente_id?: string
          plano_id?: string
          processado_em?: string | null
          processado_por?: string | null
          status?: Database["public"]["Enums"]["reembolso_status"]
          updated_at?: string
          valor_centavos?: number
          valor_proporcional_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "reembolso_planos_assinatura_id_fkey"
            columns: ["assinatura_id"]
            isOneToOne: false
            referencedRelation: "assinaturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reembolso_planos_cancelamento_evento_id_fkey"
            columns: ["cancelamento_evento_id"]
            isOneToOne: false
            referencedRelation: "plano_cancelamento_evento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reembolso_planos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      reembolsos: {
        Row: {
          actor_id: string | null
          analisado_por: string | null
          consulta_id: string
          created_at: string
          decidido_em: string | null
          id: string
          motivo: string
          observacao: string | null
          pagamento_id: string | null
          snapshot_estornado: boolean
          status: Database["public"]["Enums"]["reembolso_status"]
          tipo: Database["public"]["Enums"]["reembolso_tipo"]
          updated_at: string
          valor_centavos: number
        }
        Insert: {
          actor_id?: string | null
          analisado_por?: string | null
          consulta_id: string
          created_at?: string
          decidido_em?: string | null
          id?: string
          motivo: string
          observacao?: string | null
          pagamento_id?: string | null
          snapshot_estornado?: boolean
          status?: Database["public"]["Enums"]["reembolso_status"]
          tipo?: Database["public"]["Enums"]["reembolso_tipo"]
          updated_at?: string
          valor_centavos?: number
        }
        Update: {
          actor_id?: string | null
          analisado_por?: string | null
          consulta_id?: string
          created_at?: string
          decidido_em?: string | null
          id?: string
          motivo?: string
          observacao?: string | null
          pagamento_id?: string | null
          snapshot_estornado?: boolean
          status?: Database["public"]["Enums"]["reembolso_status"]
          tipo?: Database["public"]["Enums"]["reembolso_tipo"]
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: []
      }
      retornos_gratuitos: {
        Row: {
          consulta_origem_id: string
          consulta_uso_id: string | null
          created_at: string
          created_by: string | null
          especialidade_id: string | null
          id: string
          medico_id: string
          observacao: string | null
          paciente_id: string
          status: Database["public"]["Enums"]["retorno_status"]
          updated_at: string
          valido_ate: string
        }
        Insert: {
          consulta_origem_id: string
          consulta_uso_id?: string | null
          created_at?: string
          created_by?: string | null
          especialidade_id?: string | null
          id?: string
          medico_id: string
          observacao?: string | null
          paciente_id: string
          status?: Database["public"]["Enums"]["retorno_status"]
          updated_at?: string
          valido_ate: string
        }
        Update: {
          consulta_origem_id?: string
          consulta_uso_id?: string | null
          created_at?: string
          created_by?: string | null
          especialidade_id?: string | null
          id?: string
          medico_id?: string
          observacao?: string | null
          paciente_id?: string
          status?: Database["public"]["Enums"]["retorno_status"]
          updated_at?: string
          valido_ate?: string
        }
        Relationships: []
      }
      saque_medico_itens: {
        Row: {
          consulta_financeiro_id: string
          id: string
          saque_id: string
          valor_medico_centavos: number
        }
        Insert: {
          consulta_financeiro_id: string
          id?: string
          saque_id: string
          valor_medico_centavos: number
        }
        Update: {
          consulta_financeiro_id?: string
          id?: string
          saque_id?: string
          valor_medico_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "saque_medico_itens_consulta_financeiro_id_fkey"
            columns: ["consulta_financeiro_id"]
            isOneToOne: true
            referencedRelation: "consultas_financeiro"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saque_medico_itens_saque_id_fkey"
            columns: ["saque_id"]
            isOneToOne: false
            referencedRelation: "saques_medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      saques_medicos: {
        Row: {
          aprovado_em: string | null
          created_at: string
          created_by: string | null
          dados_bancarios_id: string | null
          id: string
          medico_id: string
          metodo: Database["public"]["Enums"]["saque_metodo"]
          motivo_recusa: string | null
          observacao: string | null
          pago_em: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          recusado_em: string | null
          solicitado_em: string
          status: Database["public"]["Enums"]["saque_status"]
          updated_at: string
          valor_centavos: number
        }
        Insert: {
          aprovado_em?: string | null
          created_at?: string
          created_by?: string | null
          dados_bancarios_id?: string | null
          id?: string
          medico_id: string
          metodo?: Database["public"]["Enums"]["saque_metodo"]
          motivo_recusa?: string | null
          observacao?: string | null
          pago_em?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          recusado_em?: string | null
          solicitado_em?: string
          status?: Database["public"]["Enums"]["saque_status"]
          updated_at?: string
          valor_centavos: number
        }
        Update: {
          aprovado_em?: string | null
          created_at?: string
          created_by?: string | null
          dados_bancarios_id?: string | null
          id?: string
          medico_id?: string
          metodo?: Database["public"]["Enums"]["saque_metodo"]
          motivo_recusa?: string | null
          observacao?: string | null
          pago_em?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          recusado_em?: string | null
          solicitado_em?: string
          status?: Database["public"]["Enums"]["saque_status"]
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "saques_medicos_dados_bancarios_id_fkey"
            columns: ["dados_bancarios_id"]
            isOneToOne: false
            referencedRelation: "medico_dados_bancarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saques_medicos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
        ]
      }
      servicos_financeiros: {
        Row: {
          ativo: boolean
          comissao_pct: number | null
          created_at: string
          created_by: string | null
          descricao: string | null
          descricao_publica: string | null
          duracao_min: number
          especialidade_id: string | null
          icone: string | null
          id: string
          modelo: Database["public"]["Enums"]["servico_financeiro_modelo"]
          nome: string
          ordem: number
          prioridade: number
          requer_aprovacao_medico: boolean
          slug: string | null
          tipo: Database["public"]["Enums"]["servico_financeiro_tipo"]
          updated_at: string
          valor_fixo_centavos: number | null
          valor_paciente_centavos: number
        }
        Insert: {
          ativo?: boolean
          comissao_pct?: number | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          descricao_publica?: string | null
          duracao_min?: number
          especialidade_id?: string | null
          icone?: string | null
          id?: string
          modelo?: Database["public"]["Enums"]["servico_financeiro_modelo"]
          nome: string
          ordem?: number
          prioridade?: number
          requer_aprovacao_medico?: boolean
          slug?: string | null
          tipo?: Database["public"]["Enums"]["servico_financeiro_tipo"]
          updated_at?: string
          valor_fixo_centavos?: number | null
          valor_paciente_centavos?: number
        }
        Update: {
          ativo?: boolean
          comissao_pct?: number | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          descricao_publica?: string | null
          duracao_min?: number
          especialidade_id?: string | null
          icone?: string | null
          id?: string
          modelo?: Database["public"]["Enums"]["servico_financeiro_modelo"]
          nome?: string
          ordem?: number
          prioridade?: number
          requer_aprovacao_medico?: boolean
          slug?: string | null
          tipo?: Database["public"]["Enums"]["servico_financeiro_tipo"]
          updated_at?: string
          valor_fixo_centavos?: number | null
          valor_paciente_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "servicos_financeiros_especialidade_id_fkey"
            columns: ["especialidade_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamentos_aulas: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          duracao_min: number | null
          id: string
          modulo_id: string
          ordem: number
          titulo: string
          updated_at: string
          video_url: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          duracao_min?: number | null
          id?: string
          modulo_id: string
          ordem?: number
          titulo: string
          updated_at?: string
          video_url: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          duracao_min?: number | null
          id?: string
          modulo_id?: string
          ordem?: number
          titulo?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamentos_aulas_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "treinamentos_modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamentos_conclusoes: {
        Row: {
          aula_id: string
          concluido_em: string
          id: string
          user_id: string
        }
        Insert: {
          aula_id: string
          concluido_em?: string
          id?: string
          user_id: string
        }
        Update: {
          aula_id?: string
          concluido_em?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamentos_conclusoes_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "treinamentos_aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamentos_modulos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          ordem: number
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_password_meta: {
        Row: {
          must_change: boolean
          password_changed_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          must_change?: boolean
          password_changed_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          must_change?: boolean
          password_changed_at?: string
          updated_at?: string
          user_id?: string
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
      user_sessions: {
        Row: {
          created_at: string
          device_label: string | null
          id: string
          ip_address: unknown
          last_seen_at: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_label?: string | null
          id?: string
          ip_address?: unknown
          last_seen_at?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_label?: string | null
          id?: string
          ip_address?: unknown
          last_seen_at?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          ativo: boolean
          business_account_id: string | null
          created_at: string
          created_by: string | null
          id: string
          nome: string
          numero: string | null
          observacoes: string | null
          phone_number_id: string | null
          status: Database["public"]["Enums"]["whatsapp_instance_status"]
          tipo: Database["public"]["Enums"]["whatsapp_instance_tipo"]
          ultima_sincronizacao: string | null
          updated_at: string
          webhook_status: string | null
        }
        Insert: {
          ativo?: boolean
          business_account_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          numero?: string | null
          observacoes?: string | null
          phone_number_id?: string | null
          status?: Database["public"]["Enums"]["whatsapp_instance_status"]
          tipo?: Database["public"]["Enums"]["whatsapp_instance_tipo"]
          ultima_sincronizacao?: string | null
          updated_at?: string
          webhook_status?: string | null
        }
        Update: {
          ativo?: boolean
          business_account_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          numero?: string | null
          observacoes?: string | null
          phone_number_id?: string | null
          status?: Database["public"]["Enums"]["whatsapp_instance_status"]
          tipo?: Database["public"]["Enums"]["whatsapp_instance_tipo"]
          ultima_sincronizacao?: string | null
          updated_at?: string
          webhook_status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      audit_eventos_unificado: {
        Row: {
          acao: string | null
          actor_id: string | null
          actor_nome: string | null
          campo: string | null
          created_at: string | null
          entidade_id: string | null
          entidade_tipo: string | null
          id: string | null
          modulo: string | null
          motivo: string | null
          observacao: string | null
          origem: string | null
          payload: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          revisado: boolean | null
          revisao_nota: string | null
          risco: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _financeiro_calc_comissao: {
        Args: { _medico_id: string; _servico_id: string }
        Returns: {
          modelo: Database["public"]["Enums"]["servico_financeiro_modelo"]
          origem: string
          pct: number
          valor_fixo: number
        }[]
      }
      _financeiro_gerar_snapshot: {
        Args: { _consulta_id: string }
        Returns: undefined
      }
      _get_audit_motivo: { Args: never; Returns: string }
      _log_consulta_audit: {
        Args: {
          _acao: string
          _campo: string
          _consulta_id: string
          _motivo: string
          _payload: Json
          _val_ant: string
          _val_novo: string
        }
        Returns: undefined
      }
      _log_financeiro: {
        Args: {
          _acao: string
          _entidade: string
          _entidade_id: string
          _motivo?: string
          _observacao?: string
          _payload?: Json
          _valor_ant?: string
          _valor_novo?: string
        }
        Returns: undefined
      }
      admin_agendamentos_overview: {
        Args: { _data?: string; _periodo?: string }
        Returns: Json
      }
      admin_consulta_cancelar: {
        Args: { _consulta_id: string; _motivo: string }
        Returns: Json
      }
      admin_consulta_forcar_confirmacao: {
        Args: { _consulta_id: string; _motivo: string }
        Returns: Json
      }
      admin_consulta_marcar_realizada: {
        Args: { _consulta_id: string; _observacao: string }
        Returns: Json
      }
      admin_consulta_reenviar_link: {
        Args: { _consulta_id: string }
        Returns: Json
      }
      admin_consulta_trocar_medico: {
        Args: {
          _consulta_id: string
          _motivo: string
          _novo_medico_id: string
          _novo_slot_id: string
        }
        Returns: Json
      }
      admin_empresas_overview: { Args: never; Returns: Json }
      admin_visao_geral: { Args: { _periodo?: string }; Returns: Json }
      agendar_retorno_gratuito: {
        Args: { _motivo?: string; _slot_id: string; _voucher_id: string }
        Returns: Json
      }
      alterar_status_conta_paciente: {
        Args: {
          _motivo: string
          _novo_status: Database["public"]["Enums"]["status_conta_paciente"]
          _observacao?: string
          _paciente_id: string
        }
        Returns: Json
      }
      analytics_conversao: { Args: { _dias?: number }; Returns: Json }
      analytics_financeiro: { Args: { _dias?: number }; Returns: Json }
      analytics_overview: { Args: { _dias?: number }; Returns: Json }
      analytics_tempo_real: { Args: never; Returns: Json }
      analytics_trafego: { Args: { _dias?: number }; Returns: Json }
      auditoria_dashboard: {
        Args: { p_fim?: string; p_inicio?: string }
        Returns: Json
      }
      auditoria_listar: {
        Args: {
          p_acao?: string
          p_actor?: string
          p_busca?: string
          p_entidade_id?: string
          p_fim?: string
          p_inicio?: string
          p_limit?: number
          p_modulo?: string
          p_offset?: number
          p_origem?: string
          p_revisado?: string
          p_risco?: string
        }
        Returns: {
          acao: string
          actor_id: string
          actor_nome: string
          campo: string
          created_at: string
          entidade_id: string
          entidade_tipo: string
          id: string
          modulo: string
          motivo: string
          observacao: string
          origem: string
          payload: Json
          reviewed_at: string
          reviewed_by: string
          revisado: boolean
          revisao_nota: string
          risco: string
          total_count: number
          valor_anterior: string
          valor_novo: string
        }[]
      }
      calcular_reembolso_proporcional: {
        Args: {
          _data_cancelamento?: string
          _data_fim: string
          _data_inicio: string
          _valor_cobrado: number
        }
        Returns: {
          dias_restantes: number
          dias_total: number
          valor_proporcional: number
        }[]
      }
      colaborador_alterar_status: {
        Args: {
          _id: string
          _indeterminado?: boolean
          _motivo: string
          _novo: Database["public"]["Enums"]["status_colaborador"]
          _observacao?: string
          _suspenso_ate?: string
        }
        Returns: Json
      }
      colaborador_atualizar: {
        Args: { _id: string; _patch: Json }
        Returns: Json
      }
      colaborador_remover_permissao: {
        Args: { _key: string; _motivo?: string; _user_id: string }
        Returns: Json
      }
      colaborador_set_permissao: {
        Args: {
          _efeito: Database["public"]["Enums"]["permissao_efeito"]
          _key: string
          _motivo?: string
          _user_id: string
        }
        Returns: Json
      }
      colaborador_set_role: {
        Args: {
          _motivo?: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: Json
      }
      consultas_pendentes_avaliacao: {
        Args: never
        Returns: {
          concluida_em: string
          consulta_id: string
          especialidade_nome: string
          medico_id: string
          medico_nome: string
        }[]
      }
      cpf_valido: { Args: { _cpf: string }; Returns: boolean }
      criar_consulta_com_reserva: {
        Args: {
          _cep: string
          _cpf: string
          _data_nascimento: string
          _especialidade_id: string
          _motivo: string
          _nome_completo: string
          _sexo: Database["public"]["Enums"]["sexo_biologico"]
          _slot_id: string
          _telefone: string
        }
        Returns: Json
      }
      empresa_toggle_modulo: {
        Args: { _ativo: boolean; _empresa_id: string; _modulo_key: string }
        Returns: Json
      }
      empresa_visao_geral: { Args: { _empresa_id: string }; Returns: Json }
      event_reprocessar: { Args: { p_event_id: string }; Returns: undefined }
      feegow_marcar_liberacao: {
        Args: {
          _erro: string
          _medico_id: string
          _payload: Json
          _professional_id: string
          _status: Database["public"]["Enums"]["feegow_status"]
        }
        Returns: undefined
      }
      financeiro_central_dashboard: {
        Args: { _empresa_id?: string; _fim: string; _inicio: string }
        Returns: Json
      }
      financeiro_dashboard: {
        Args: { _empresa_id?: string; _fim: string; _inicio: string }
        Returns: Json
      }
      financeiro_fechamento_mensal: {
        Args: { _ano: number; _mes: number }
        Returns: Json
      }
      financeiro_invalidar_consulta: {
        Args: { _consulta_id: string; _motivo: string }
        Returns: Json
      }
      financeiro_link_cancelar: {
        Args: { _link_id: string; _motivo: string }
        Returns: string
      }
      financeiro_link_criar: {
        Args: {
          _consulta_id?: string
          _descricao: string
          _observacao?: string
          _paciente_id: string
          _servico_id?: string
          _valor_centavos: number
          _vencimento?: string
        }
        Returns: string
      }
      financeiro_marcar_pago: {
        Args: {
          _ano: number
          _medico_id: string
          _mes: number
          _observacao?: string
        }
        Returns: Json
      }
      financeiro_pagamento_cancelar: {
        Args: { _motivo: string; _pagamento_id: string }
        Returns: string
      }
      financeiro_pagamento_confirmar: {
        Args: { _observacao?: string; _pagamento_id: string }
        Returns: string
      }
      financeiro_reembolsar_consulta: {
        Args: { _consulta_id: string; _motivo: string; _observacao?: string }
        Returns: Json
      }
      financeiro_reembolso_aprovar: {
        Args: { _observacao?: string; _reembolso_id: string }
        Returns: string
      }
      financeiro_reembolso_recusar: {
        Args: { _motivo: string; _reembolso_id: string }
        Returns: string
      }
      financeiro_reembolso_solicitar: {
        Args: {
          _consulta_id: string
          _motivo: string
          _observacao?: string
          _pagamento_id: string
          _tipo: Database["public"]["Enums"]["reembolso_tipo"]
          _valor_centavos: number
        }
        Returns: string
      }
      financeiro_relatorio_periodo: {
        Args: { _agrupar?: string; _fim: string; _inicio: string }
        Returns: Json
      }
      financeiro_repasse_bloquear: {
        Args: { _fechamento_id: string; _motivo: string }
        Returns: string
      }
      financeiro_repasse_contestar: {
        Args: { _fechamento_id: string; _motivo: string }
        Returns: string
      }
      financeiro_repasse_marcar_pago: {
        Args: {
          _comprovante_url?: string
          _fechamento_id: string
          _observacao?: string
        }
        Returns: string
      }
      fn_ranking_medico_servico: {
        Args: {
          _limit?: number
          _modalidade?: Database["public"]["Enums"]["consulta_modalidade"]
          _servico_id: string
        }
        Returns: {
          avaliacao: number
          espera_min: number
          medico_id: string
          medico_nome: string
          prioridade: number
          proximo_slot_id: string
          proximo_slot_inicio: string
          score: number
        }[]
      }
      fn_resolver_comissao: {
        Args: {
          _medico_id: string
          _servico_id: string
          _valor_bruto_centavos: number
        }
        Returns: {
          comissao_pct: number
          modelo: Database["public"]["Enums"]["servico_financeiro_modelo"]
          origem_regra: string
          valor_medico_centavos: number
          valor_plataforma_centavos: number
        }[]
      }
      forcar_status_consulta: {
        Args: {
          _consulta_id: string
          _motivo: string
          _novo_status: Database["public"]["Enums"]["consulta_status"]
        }
        Returns: Json
      }
      has_permission: {
        Args: { _key: string; _user_id: string }
        Returns: boolean
      }
      has_permissions_batch: {
        Args: { _keys: string[]; _user_id: string }
        Returns: {
          allowed: boolean
          permission_key: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      impersonation_finalizar: { Args: { _log_id: string }; Returns: undefined }
      impersonation_iniciar: {
        Args: { _motivo: string; _target_id: string; _user_agent?: string }
        Returns: string
      }
      impersonation_listar_alvos: {
        Args: { _busca?: string }
        Returns: {
          email: string
          nome: string
          role: string
          user_id: string
        }[]
      }
      integracoes_dashboard: { Args: never; Returns: Json }
      is_empresa_owner: { Args: { _empresa_id: string }; Returns: boolean }
      is_medico_da_consulta: {
        Args: { _consulta_id: string }
        Returns: boolean
      }
      is_medico_da_conversa: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      is_paciente_da_consulta: {
        Args: { _consulta_id: string }
        Returns: boolean
      }
      is_paciente_da_conversa: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      liberar_reservas_expiradas: { Args: never; Returns: number }
      login_attempt_check: {
        Args: { _email: string; _ip?: string }
        Returns: {
          blocked: boolean
          fails: number
          retry_after_seconds: number
        }[]
      }
      login_attempt_record: {
        Args: {
          _email: string
          _ip?: string
          _success: boolean
          _user_agent?: string
        }
        Returns: undefined
      }
      marcar_pagamento_falho: {
        Args: { _motivo: string; _provider_session_id: string }
        Returns: undefined
      }
      marcar_pagamento_processando: {
        Args: {
          _checkout_url: string
          _pagamento_id: string
          _provider_session_id: string
        }
        Returns: undefined
      }
      marcar_reenvio_link_consulta: {
        Args: { _canal?: string; _consulta_id: string }
        Returns: Json
      }
      mark_messages_read: {
        Args: { p_conversation_id: string }
        Returns: undefined
      }
      medico_acesso_efetivo: { Args: { _medico_id: string }; Returns: string }
      medico_aprovar: {
        Args: { _id: string; _observacao?: string }
        Returns: Json
      }
      medico_bloquear: {
        Args: { _id: string; _motivo: string; _observacao?: string }
        Returns: Json
      }
      medico_colocar_em_analise: {
        Args: { _id: string; _observacao?: string }
        Returns: Json
      }
      medico_reativar: {
        Args: { _id: string; _justificativa: string }
        Returns: Json
      }
      medico_reprovar: {
        Args: { _id: string; _motivo: string; _observacao?: string }
        Returns: Json
      }
      medico_servico_toggle: {
        Args: { _ativo: boolean; _servico_id: string }
        Returns: Json
      }
      medico_suspender: {
        Args: {
          _ate?: string
          _id: string
          _indeterminado?: boolean
          _motivo: string
          _observacao?: string
        }
        Returns: Json
      }
      password_mark_changed: { Args: never; Returns: undefined }
      password_status: {
        Args: never
        Returns: {
          days_remaining: number
          expiration_days: number
          expired: boolean
          must_change: boolean
          password_changed_at: string
        }[]
      }
      permissoes_dashboard: { Args: never; Returns: Json }
      permissoes_efetivas: {
        Args: { _user_id: string }
        Returns: {
          descricao: string
          modulo: string
          origem: string
          permission_key: string
          permitido: boolean
          risco: string
        }[]
      }
      plano_saude_financeira: { Args: { _plano_id: string }; Returns: Json }
      processar_pagamento_confirmado: {
        Args: {
          _metodo: Database["public"]["Enums"]["pagamento_metodo"]
          _payload: Json
          _provider_payment_id: string
          _provider_session_id: string
        }
        Returns: Json
      }
      promote_to_admin: { Args: { _email: string }; Returns: Json }
      recalcular_ranking_medico: {
        Args: { p_medico_id: string }
        Returns: undefined
      }
      recalcular_ranking_todos: { Args: never; Returns: undefined }
      registrar_auditoria_colaborador: {
        Args: {
          _acao: string
          _campo?: string
          _colab_id: string
          _motivo?: string
          _observacao?: string
          _payload?: Json
          _valor_anterior?: string
          _valor_novo?: string
        }
        Returns: string
      }
      registrar_auditoria_consulta: {
        Args: {
          _acao: string
          _campo?: string
          _consulta_id: string
          _motivo?: string
          _observacao?: string
          _payload?: Json
          _valor_anterior?: string
          _valor_novo?: string
        }
        Returns: string
      }
      registrar_auditoria_empresa: {
        Args: {
          _acao: string
          _campo?: string
          _empresa_id: string
          _motivo?: string
          _observacao?: string
          _payload?: Json
          _valor_anterior?: string
          _valor_novo?: string
        }
        Returns: string
      }
      registrar_clique_impulsionamento: {
        Args: {
          p_campanha_id: string
          p_ip_hash?: string
          p_origem?: string
          p_paciente_id?: string
        }
        Returns: undefined
      }
      relatorios_clinica: {
        Args: {
          p_canal?: string
          p_empresa_id?: string
          p_especialidade?: string
          p_fim: string
          p_inicio: string
          p_medico_id?: string
        }
        Returns: Json
      }
      relatorios_consultas_diarias: {
        Args: {
          p_canal?: string
          p_empresa_id?: string
          p_especialidade?: string
          p_fim: string
          p_inicio: string
          p_medico_id?: string
          p_status?: string
        }
        Returns: {
          canceladas: number
          concluidas: number
          dia: string
          no_show: number
          receita_centavos: number
          total_consultas: number
        }[]
      }
      relatorios_executivo: {
        Args: {
          p_canal?: string
          p_empresa_id?: string
          p_especialidade?: string
          p_fim: string
          p_inicio: string
          p_medico_id?: string
          p_status?: string
        }
        Returns: Json
      }
      relatorios_financeiro: {
        Args: {
          p_empresa_id?: string
          p_fim: string
          p_inicio: string
          p_medico_id?: string
        }
        Returns: Json
      }
      relatorios_financeiro_snapshot: {
        Args: { p_compare_mode?: string; p_fim: string; p_inicio: string }
        Returns: Json
      }
      relatorios_marketing_funil: {
        Args: {
          p_campanha_id?: string
          p_fim: string
          p_fonte?: string
          p_inicio: string
        }
        Returns: Json
      }
      relatorios_medicos_performance: {
        Args: {
          p_empresa_id?: string
          p_especialidade?: string
          p_fim: string
          p_inicio: string
        }
        Returns: {
          canceladas: number
          concluidas: number
          especialidade: string
          medico_id: string
          medico_nome: string
          no_show: number
          pacientes_unicos: number
          receita_bruta_centavos: number
          receita_medico_centavos: number
          taxa_no_show: number
          ticket_medio_centavos: number
          total_consultas: number
        }[]
      }
      remover_cupom_pagamento: {
        Args: { _pagamento_id: string }
        Returns: Json
      }
      session_heartbeat: {
        Args: {
          _device_label?: string
          _ip?: string
          _session_token: string
          _user_agent?: string
        }
        Returns: {
          revoked: boolean
          session_id: string
        }[]
      }
      session_revoke: {
        Args: { _reason?: string; _session_id: string }
        Returns: boolean
      }
      set_audit_motivo: { Args: { p_motivo: string }; Returns: undefined }
      set_force_status_transition: {
        Args: { _motivo: string }
        Returns: undefined
      }
      trocar_medico_consulta: {
        Args: { _consulta_id: string; _motivo?: string; _novo_slot_id: string }
        Returns: Json
      }
      user_can_view_conversation: {
        Args: { _conv_id: string }
        Returns: boolean
      }
      validar_e_aplicar_cupom: {
        Args: { _codigo: string; _pagamento_id: string }
        Returns: Json
      }
    }
    Enums: {
      ai_provider: "lovable" | "openai" | "anthropic" | "gemini" | "outro"
      app_role:
        | "paciente"
        | "medico"
        | "secretaria"
        | "empresa"
        | "admin"
        | "supervisor"
      assinatura_ciclo: "mensal" | "anual" | "unico"
      assinatura_status:
        | "trial"
        | "ativa"
        | "pausada"
        | "cancelada"
        | "inadimplente"
      automation_action_type:
        | "send_template"
        | "send_message"
        | "assign_conversation"
        | "transfer_sector"
        | "create_task"
        | "notify_user"
        | "webhook"
      automation_log_status: "sucesso" | "falha" | "pulado" | "agendado"
      automation_trigger:
        | "appointment.created"
        | "appointment.confirmed"
        | "appointment.payment_pending"
        | "appointment.payment_approved"
        | "appointment.starts_soon_24h"
        | "appointment.starts_soon_1h"
        | "appointment.starts_soon_30min"
        | "appointment.starts_soon_5min"
        | "appointment.finished"
        | "appointment.no_show"
        | "document.available"
        | "payment.refunded"
        | "conversation.received"
        | "conversation.assigned"
        | "conversation.closed"
      beneficio_periodo: "semanal" | "mensal" | "anual" | "total"
      beneficio_tipo:
        | "especialidade"
        | "medico"
        | "servico"
        | "categoria"
        | "desconto_geral"
      bot_step_type:
        | "mensagem"
        | "escolha"
        | "condicao"
        | "delay"
        | "coletar_dado"
        | "validar_cpf"
        | "consultar_agendamento"
        | "enviar_link"
        | "encaminhar_humano"
        | "finalizar"
      cobranca_link_status: "ativo" | "pago" | "cancelado" | "expirado"
      consulta_canal:
        | "app"
        | "empresa"
        | "manual_admin"
        | "manual_secretaria"
        | "retorno"
        | "api"
      consulta_financeiro_status:
        | "valido"
        | "invalidado"
        | "reembolsado"
        | "estornado"
      consulta_modalidade: "online" | "presencial"
      consulta_status:
        | "agendada"
        | "aguardando_pagamento"
        | "confirmada"
        | "em_andamento"
        | "concluida"
        | "cancelada"
        | "no_show"
      conversation_channel: "whatsapp" | "site" | "interno" | "email"
      conversation_origin:
        | "comercial"
        | "operacional"
        | "site"
        | "empresa"
        | "medico"
        | "sistema"
      conversation_priority: "baixa" | "normal" | "alta" | "urgente"
      conversation_status:
        | "aberta"
        | "em_atendimento"
        | "pendente"
        | "fechada"
        | "arquivada"
      cupom_escopo: "global" | "medico" | "especialidade"
      cupom_tipo: "percentual" | "fixo"
      documento_paciente_tipo:
        | "exame"
        | "laudo"
        | "receita"
        | "identidade"
        | "plano"
        | "vacina"
        | "outro"
      empresa_contrato_status: "ativo" | "suspenso" | "encerrado" | "rascunho"
      empresa_fatura_status: "em_aberto" | "paga" | "atrasada" | "cancelada"
      empresa_funcionario_status: "ativo" | "desligado" | "licenca" | "suspenso"
      empresa_modelo_financeiro:
        | "por_colaborador"
        | "por_consulta"
        | "plano_fixo"
        | "hibrido"
      empresa_porte: "mei" | "pequena" | "media" | "grande"
      empresa_tipo:
        | "contratante"
        | "clinica_parceira"
        | "saude_ocupacional"
        | "indicadora"
        | "hibrida"
      endereco_tipo: "residencial" | "comercial"
      event_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      fechamento_status:
        | "em_aberto"
        | "pago"
        | "em_processamento"
        | "bloqueado"
        | "contestado"
      feegow_status: "nao_enviado" | "pendente" | "liberado" | "erro"
      funcao_interna:
        | "secretaria"
        | "supervisor"
        | "financeiro"
        | "comercial"
        | "atendimento"
        | "suporte"
        | "gestor_operacional"
        | "outro"
      gateway_tipo:
        | "stripe"
        | "pix"
        | "asaas"
        | "mercadopago"
        | "manual"
        | "outro"
      integracao_status:
        | "nao_configurado"
        | "aguardando_configuracao"
        | "conectado"
        | "erro"
        | "simulado"
        | "manutencao"
      integracao_tipo:
        | "feegow"
        | "whatsapp"
        | "google"
        | "pagamentos"
        | "ia_provider"
        | "assinatura_digital"
        | "eventos_sistema"
      medico_servico_status: "ativo" | "pendente" | "recusado" | "desativado"
      medico_status:
        | "pendente"
        | "em_analise"
        | "aprovado"
        | "reprovado"
        | "suspenso"
        | "bloqueado"
      message_sender_type:
        | "paciente"
        | "lead"
        | "bot"
        | "ia"
        | "colaborador"
        | "medico"
        | "sistema"
      message_status:
        | "queued"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
        | "received"
      message_type:
        | "text"
        | "template"
        | "system"
        | "media"
        | "audio"
        | "image"
        | "document"
        | "interactive"
      modo_cancelamento_plano:
        | "cumprir_ciclo"
        | "reembolso_imediato"
        | "hibrido"
      nfe_status: "pendente" | "validada" | "recusada"
      origem_receita_assinatura:
        | "consulta"
        | "servico_plataforma"
        | "plano_admin"
        | "plano_medico"
        | "plano_paciente_custom"
      pagamento_forma:
        | "pix"
        | "cartao"
        | "boleto"
        | "manual"
        | "transferencia"
        | "outro"
      pagamento_metodo:
        | "pix"
        | "cartao"
        | "boleto"
        | "simulado"
        | "manual"
        | "transferencia"
        | "outro"
      pagamento_provider: "mock" | "stripe"
      pagamento_status:
        | "pendente"
        | "processando"
        | "pago"
        | "cancelado"
        | "falhou"
        | "reembolsado"
        | "aprovado"
        | "recusado"
        | "reembolsado_parcial"
        | "expirado"
      pendencia_status: "aberta" | "em_analise" | "resolvida" | "ignorada"
      permissao_efeito: "grant" | "revoke"
      pix_tipo: "cpf" | "cnpj" | "email" | "telefone" | "aleatoria"
      plano_categoria:
        | "saude_mental"
        | "fitness"
        | "clinico_geral"
        | "infantil"
        | "empresarial"
        | "personalizado"
      plano_cobranca:
        | "gratuito"
        | "valor_fixo"
        | "mensal"
        | "anual"
        | "por_uso"
        | "por_colaborador"
        | "hibrido"
      plano_nivel: "admin" | "medico" | "paciente_custom"
      plano_publico: "paciente" | "empresa" | "ambos"
      plano_regra_acesso: "direto" | "pos_consulta"
      plano_status:
        | "rascunho"
        | "ativo"
        | "inativo"
        | "arquivado"
        | "encerramento_pendente"
        | "encerrado"
      reembolso_status:
        | "solicitado"
        | "em_analise"
        | "aprovado"
        | "recusado"
        | "concluido"
      reembolso_tipo: "total" | "parcial"
      retorno_status: "disponivel" | "usado" | "expirado" | "cancelado"
      saque_metodo: "pix" | "ted"
      saque_status:
        | "solicitado"
        | "em_analise"
        | "correcao_solicitada"
        | "aprovado"
        | "pago"
        | "recusado"
        | "cancelado"
      servico_financeiro_modelo: "percentual" | "valor_fixo"
      servico_financeiro_tipo: "consulta" | "pronto_atendimento" | "pacote"
      sexo_biologico: "feminino" | "masculino" | "intersexo" | "nao_informado"
      slot_status: "disponivel" | "reservado" | "bloqueado"
      status_colaborador:
        | "ativo"
        | "pendente_convite"
        | "suspenso"
        | "bloqueado"
        | "removido"
      status_conta_paciente: "ativo" | "suspenso" | "bloqueado"
      template_category:
        | "confirmacao"
        | "lembrete_24h"
        | "lembrete_1h"
        | "link_meet"
        | "cobranca"
        | "pos_consulta"
        | "documento"
        | "retorno"
        | "empresa"
        | "suporte"
        | "outro"
      template_wa_status: "rascunho" | "pendente" | "aprovado" | "rejeitado"
      tipo_conta_bancaria: "corrente" | "poupanca"
      tipo_pessoa: "pf" | "pj"
      whatsapp_instance_status:
        | "conectado"
        | "desconectado"
        | "pendente"
        | "erro"
      whatsapp_instance_tipo: "comercial" | "operacional" | "suporte"
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
      ai_provider: ["lovable", "openai", "anthropic", "gemini", "outro"],
      app_role: [
        "paciente",
        "medico",
        "secretaria",
        "empresa",
        "admin",
        "supervisor",
      ],
      assinatura_ciclo: ["mensal", "anual", "unico"],
      assinatura_status: [
        "trial",
        "ativa",
        "pausada",
        "cancelada",
        "inadimplente",
      ],
      automation_action_type: [
        "send_template",
        "send_message",
        "assign_conversation",
        "transfer_sector",
        "create_task",
        "notify_user",
        "webhook",
      ],
      automation_log_status: ["sucesso", "falha", "pulado", "agendado"],
      automation_trigger: [
        "appointment.created",
        "appointment.confirmed",
        "appointment.payment_pending",
        "appointment.payment_approved",
        "appointment.starts_soon_24h",
        "appointment.starts_soon_1h",
        "appointment.starts_soon_30min",
        "appointment.starts_soon_5min",
        "appointment.finished",
        "appointment.no_show",
        "document.available",
        "payment.refunded",
        "conversation.received",
        "conversation.assigned",
        "conversation.closed",
      ],
      beneficio_periodo: ["semanal", "mensal", "anual", "total"],
      beneficio_tipo: [
        "especialidade",
        "medico",
        "servico",
        "categoria",
        "desconto_geral",
      ],
      bot_step_type: [
        "mensagem",
        "escolha",
        "condicao",
        "delay",
        "coletar_dado",
        "validar_cpf",
        "consultar_agendamento",
        "enviar_link",
        "encaminhar_humano",
        "finalizar",
      ],
      cobranca_link_status: ["ativo", "pago", "cancelado", "expirado"],
      consulta_canal: [
        "app",
        "empresa",
        "manual_admin",
        "manual_secretaria",
        "retorno",
        "api",
      ],
      consulta_financeiro_status: [
        "valido",
        "invalidado",
        "reembolsado",
        "estornado",
      ],
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
      conversation_channel: ["whatsapp", "site", "interno", "email"],
      conversation_origin: [
        "comercial",
        "operacional",
        "site",
        "empresa",
        "medico",
        "sistema",
      ],
      conversation_priority: ["baixa", "normal", "alta", "urgente"],
      conversation_status: [
        "aberta",
        "em_atendimento",
        "pendente",
        "fechada",
        "arquivada",
      ],
      cupom_escopo: ["global", "medico", "especialidade"],
      cupom_tipo: ["percentual", "fixo"],
      documento_paciente_tipo: [
        "exame",
        "laudo",
        "receita",
        "identidade",
        "plano",
        "vacina",
        "outro",
      ],
      empresa_contrato_status: ["ativo", "suspenso", "encerrado", "rascunho"],
      empresa_fatura_status: ["em_aberto", "paga", "atrasada", "cancelada"],
      empresa_funcionario_status: ["ativo", "desligado", "licenca", "suspenso"],
      empresa_modelo_financeiro: [
        "por_colaborador",
        "por_consulta",
        "plano_fixo",
        "hibrido",
      ],
      empresa_porte: ["mei", "pequena", "media", "grande"],
      empresa_tipo: [
        "contratante",
        "clinica_parceira",
        "saude_ocupacional",
        "indicadora",
        "hibrida",
      ],
      endereco_tipo: ["residencial", "comercial"],
      event_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      fechamento_status: [
        "em_aberto",
        "pago",
        "em_processamento",
        "bloqueado",
        "contestado",
      ],
      feegow_status: ["nao_enviado", "pendente", "liberado", "erro"],
      funcao_interna: [
        "secretaria",
        "supervisor",
        "financeiro",
        "comercial",
        "atendimento",
        "suporte",
        "gestor_operacional",
        "outro",
      ],
      gateway_tipo: [
        "stripe",
        "pix",
        "asaas",
        "mercadopago",
        "manual",
        "outro",
      ],
      integracao_status: [
        "nao_configurado",
        "aguardando_configuracao",
        "conectado",
        "erro",
        "simulado",
        "manutencao",
      ],
      integracao_tipo: [
        "feegow",
        "whatsapp",
        "google",
        "pagamentos",
        "ia_provider",
        "assinatura_digital",
        "eventos_sistema",
      ],
      medico_servico_status: ["ativo", "pendente", "recusado", "desativado"],
      medico_status: [
        "pendente",
        "em_analise",
        "aprovado",
        "reprovado",
        "suspenso",
        "bloqueado",
      ],
      message_sender_type: [
        "paciente",
        "lead",
        "bot",
        "ia",
        "colaborador",
        "medico",
        "sistema",
      ],
      message_status: [
        "queued",
        "sent",
        "delivered",
        "read",
        "failed",
        "received",
      ],
      message_type: [
        "text",
        "template",
        "system",
        "media",
        "audio",
        "image",
        "document",
        "interactive",
      ],
      modo_cancelamento_plano: [
        "cumprir_ciclo",
        "reembolso_imediato",
        "hibrido",
      ],
      nfe_status: ["pendente", "validada", "recusada"],
      origem_receita_assinatura: [
        "consulta",
        "servico_plataforma",
        "plano_admin",
        "plano_medico",
        "plano_paciente_custom",
      ],
      pagamento_forma: [
        "pix",
        "cartao",
        "boleto",
        "manual",
        "transferencia",
        "outro",
      ],
      pagamento_metodo: [
        "pix",
        "cartao",
        "boleto",
        "simulado",
        "manual",
        "transferencia",
        "outro",
      ],
      pagamento_provider: ["mock", "stripe"],
      pagamento_status: [
        "pendente",
        "processando",
        "pago",
        "cancelado",
        "falhou",
        "reembolsado",
        "aprovado",
        "recusado",
        "reembolsado_parcial",
        "expirado",
      ],
      pendencia_status: ["aberta", "em_analise", "resolvida", "ignorada"],
      permissao_efeito: ["grant", "revoke"],
      pix_tipo: ["cpf", "cnpj", "email", "telefone", "aleatoria"],
      plano_categoria: [
        "saude_mental",
        "fitness",
        "clinico_geral",
        "infantil",
        "empresarial",
        "personalizado",
      ],
      plano_cobranca: [
        "gratuito",
        "valor_fixo",
        "mensal",
        "anual",
        "por_uso",
        "por_colaborador",
        "hibrido",
      ],
      plano_nivel: ["admin", "medico", "paciente_custom"],
      plano_publico: ["paciente", "empresa", "ambos"],
      plano_regra_acesso: ["direto", "pos_consulta"],
      plano_status: [
        "rascunho",
        "ativo",
        "inativo",
        "arquivado",
        "encerramento_pendente",
        "encerrado",
      ],
      reembolso_status: [
        "solicitado",
        "em_analise",
        "aprovado",
        "recusado",
        "concluido",
      ],
      reembolso_tipo: ["total", "parcial"],
      retorno_status: ["disponivel", "usado", "expirado", "cancelado"],
      saque_metodo: ["pix", "ted"],
      saque_status: [
        "solicitado",
        "em_analise",
        "correcao_solicitada",
        "aprovado",
        "pago",
        "recusado",
        "cancelado",
      ],
      servico_financeiro_modelo: ["percentual", "valor_fixo"],
      servico_financeiro_tipo: ["consulta", "pronto_atendimento", "pacote"],
      sexo_biologico: ["feminino", "masculino", "intersexo", "nao_informado"],
      slot_status: ["disponivel", "reservado", "bloqueado"],
      status_colaborador: [
        "ativo",
        "pendente_convite",
        "suspenso",
        "bloqueado",
        "removido",
      ],
      status_conta_paciente: ["ativo", "suspenso", "bloqueado"],
      template_category: [
        "confirmacao",
        "lembrete_24h",
        "lembrete_1h",
        "link_meet",
        "cobranca",
        "pos_consulta",
        "documento",
        "retorno",
        "empresa",
        "suporte",
        "outro",
      ],
      template_wa_status: ["rascunho", "pendente", "aprovado", "rejeitado"],
      tipo_conta_bancaria: ["corrente", "poupanca"],
      tipo_pessoa: ["pf", "pj"],
      whatsapp_instance_status: [
        "conectado",
        "desconectado",
        "pendente",
        "erro",
      ],
      whatsapp_instance_tipo: ["comercial", "operacional", "suporte"],
    },
  },
} as const
