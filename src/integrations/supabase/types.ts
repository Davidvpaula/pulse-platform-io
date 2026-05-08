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
      admin_acoes_medico: {
        Row: {
          admin_id: string
          alerta_vinculado_id: string | null
          anomalia_vinculada_id: string | null
          created_at: string
          dados_antes: Json | null
          dados_depois: Json | null
          id: string
          medico_id: string
          motivo: string
          tipo_acao: string
        }
        Insert: {
          admin_id: string
          alerta_vinculado_id?: string | null
          anomalia_vinculada_id?: string | null
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          medico_id: string
          motivo: string
          tipo_acao: string
        }
        Update: {
          admin_id?: string
          alerta_vinculado_id?: string | null
          anomalia_vinculada_id?: string | null
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: string
          medico_id?: string
          motivo?: string
          tipo_acao?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_acoes_medico_alerta_vinculado_id_fkey"
            columns: ["alerta_vinculado_id"]
            isOneToOne: false
            referencedRelation: "medico_alertas_ia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_acoes_medico_anomalia_vinculada_id_fkey"
            columns: ["anomalia_vinculada_id"]
            isOneToOne: false
            referencedRelation: "medico_anomalias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_acoes_medico_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_acoes_medico_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_acoes_medico_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
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
          reservado_por: string | null
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
          reservado_por?: string | null
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
          reservado_por?: string | null
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
            foreignKeyName: "agenda_slots_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_slots_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
          {
            foreignKeyName: "agenda_slots_reservado_por_fkey"
            columns: ["reservado_por"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_slots_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_slots_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_publicos"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_assistant_settings: {
        Row: {
          auto_intent_detection: boolean
          auto_reply_suggestion: boolean
          auto_summary: boolean
          auto_urgency_detection: boolean
          created_at: string
          created_by: string | null
          daily_token_budget: number
          enabled: boolean
          id: string
          max_tokens: number
          model: string
          provider: Database["public"]["Enums"]["ai_provider"]
          temperature: number
          updated_at: string
        }
        Insert: {
          auto_intent_detection?: boolean
          auto_reply_suggestion?: boolean
          auto_summary?: boolean
          auto_urgency_detection?: boolean
          created_at?: string
          created_by?: string | null
          daily_token_budget?: number
          enabled?: boolean
          id?: string
          max_tokens?: number
          model?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          temperature?: number
          updated_at?: string
        }
        Update: {
          auto_intent_detection?: boolean
          auto_reply_suggestion?: boolean
          auto_summary?: boolean
          auto_urgency_detection?: boolean
          created_at?: string
          created_by?: string | null
          daily_token_budget?: number
          enabled?: boolean
          id?: string
          max_tokens?: number
          model?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          temperature?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_audit_logs: {
        Row: {
          accepted_by_user: boolean | null
          action: string
          actor_id: string | null
          conversation_id: string | null
          created_at: string
          error: string | null
          estimated_cost_cents: number | null
          id: string
          input_tokens: number | null
          latency_ms: number | null
          model: string | null
          output_tokens: number | null
          prompt_hash: string | null
          provider: Database["public"]["Enums"]["ai_provider"]
          response_excerpt: string | null
        }
        Insert: {
          accepted_by_user?: boolean | null
          action: string
          actor_id?: string | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          estimated_cost_cents?: number | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          prompt_hash?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"]
          response_excerpt?: string | null
        }
        Update: {
          accepted_by_user?: boolean | null
          action?: string
          actor_id?: string | null
          conversation_id?: string | null
          created_at?: string
          error?: string | null
          estimated_cost_cents?: number | null
          id?: string
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          output_tokens?: number | null
          prompt_hash?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"]
          response_excerpt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_audit_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_avatar_memory: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          memory_type: Database["public"]["Enums"]["ai_avatar_memory_type"]
          patient_id: string | null
          relevance_score: number
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          memory_type?: Database["public"]["Enums"]["ai_avatar_memory_type"]
          patient_id?: string | null
          relevance_score?: number
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          memory_type?: Database["public"]["Enums"]["ai_avatar_memory_type"]
          patient_id?: string | null
          relevance_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_avatar_memory_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_avatar_profiles: {
        Row: {
          assinatura: string | null
          ativo: boolean
          comportamento: string | null
          created_at: string
          created_by: string | null
          id: string
          limites: string | null
          nome: string
          saudacao_padrao: string | null
          system_prompt: string
          tom: string
          updated_at: string
        }
        Insert: {
          assinatura?: string | null
          ativo?: boolean
          comportamento?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          limites?: string | null
          nome: string
          saudacao_padrao?: string | null
          system_prompt: string
          tom?: string
          updated_at?: string
        }
        Update: {
          assinatura?: string | null
          ativo?: boolean
          comportamento?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          limites?: string | null
          nome?: string
          saudacao_padrao?: string | null
          system_prompt?: string
          tom?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_blocked_topics: {
        Row: {
          acao: string
          ativo: boolean
          categoria: Database["public"]["Enums"]["ai_blocked_categoria"]
          created_at: string
          descricao: string | null
          id: string
          severidade: Database["public"]["Enums"]["ai_avatar_risco"]
          termo: string
          updated_at: string
        }
        Insert: {
          acao?: string
          ativo?: boolean
          categoria: Database["public"]["Enums"]["ai_blocked_categoria"]
          created_at?: string
          descricao?: string | null
          id?: string
          severidade?: Database["public"]["Enums"]["ai_avatar_risco"]
          termo: string
          updated_at?: string
        }
        Update: {
          acao?: string
          ativo?: boolean
          categoria?: Database["public"]["Enums"]["ai_blocked_categoria"]
          created_at?: string
          descricao?: string | null
          id?: string
          severidade?: Database["public"]["Enums"]["ai_avatar_risco"]
          termo?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_handoff_logs: {
        Row: {
          confianca: Database["public"]["Enums"]["ai_avatar_confianca"] | null
          conversation_id: string | null
          created_at: string
          gatilho: string | null
          id: string
          metadata: Json
          motivo: Database["public"]["Enums"]["ai_handoff_motivo"]
          risco: Database["public"]["Enums"]["ai_avatar_risco"] | null
          setor_alvo: string | null
          status: string
          supervisor_alvo: string | null
        }
        Insert: {
          confianca?: Database["public"]["Enums"]["ai_avatar_confianca"] | null
          conversation_id?: string | null
          created_at?: string
          gatilho?: string | null
          id?: string
          metadata?: Json
          motivo: Database["public"]["Enums"]["ai_handoff_motivo"]
          risco?: Database["public"]["Enums"]["ai_avatar_risco"] | null
          setor_alvo?: string | null
          status?: string
          supervisor_alvo?: string | null
        }
        Update: {
          confianca?: Database["public"]["Enums"]["ai_avatar_confianca"] | null
          conversation_id?: string | null
          created_at?: string
          gatilho?: string | null
          id?: string
          metadata?: Json
          motivo?: Database["public"]["Enums"]["ai_handoff_motivo"]
          risco?: Database["public"]["Enums"]["ai_avatar_risco"] | null
          setor_alvo?: string | null
          status?: string
          supervisor_alvo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_handoff_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_handoff_rules: {
        Row: {
          action: string
          active: boolean
          ai_settings_id: string | null
          created_at: string
          id: string
          intent: string | null
          keyword: string
          level: Database["public"]["Enums"]["ai_handoff_level"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          action?: string
          active?: boolean
          ai_settings_id?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          keyword: string
          level?: Database["public"]["Enums"]["ai_handoff_level"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          action?: string
          active?: boolean
          ai_settings_id?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          keyword?: string
          level?: Database["public"]["Enums"]["ai_handoff_level"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_handoff_rules_ai_settings_id_fkey"
            columns: ["ai_settings_id"]
            isOneToOne: false
            referencedRelation: "ai_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_logs: {
        Row: {
          action_taken: string | null
          auto_reply: boolean
          confianca: Database["public"]["Enums"]["ai_avatar_confianca"] | null
          confianca_score: number | null
          conversation_id: string | null
          created_at: string
          custo_estimado: number | null
          error: string | null
          handoff_motivo:
            | Database["public"]["Enums"]["ai_handoff_motivo"]
            | null
          id: string
          latency_ms: number | null
          model: string | null
          modo: Database["public"]["Enums"]["ai_avatar_modo"] | null
          motivo: string | null
          profile_id: string | null
          prompt: string | null
          provider: Database["public"]["Enums"]["ai_provider"] | null
          response: string | null
          risco: Database["public"]["Enums"]["ai_avatar_risco"] | null
          tokens_in: number | null
          tokens_out: number | null
        }
        Insert: {
          action_taken?: string | null
          auto_reply?: boolean
          confianca?: Database["public"]["Enums"]["ai_avatar_confianca"] | null
          confianca_score?: number | null
          conversation_id?: string | null
          created_at?: string
          custo_estimado?: number | null
          error?: string | null
          handoff_motivo?:
            | Database["public"]["Enums"]["ai_handoff_motivo"]
            | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          modo?: Database["public"]["Enums"]["ai_avatar_modo"] | null
          motivo?: string | null
          profile_id?: string | null
          prompt?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"] | null
          response?: string | null
          risco?: Database["public"]["Enums"]["ai_avatar_risco"] | null
          tokens_in?: number | null
          tokens_out?: number | null
        }
        Update: {
          action_taken?: string | null
          auto_reply?: boolean
          confianca?: Database["public"]["Enums"]["ai_avatar_confianca"] | null
          confianca_score?: number | null
          conversation_id?: string | null
          created_at?: string
          custo_estimado?: number | null
          error?: string | null
          handoff_motivo?:
            | Database["public"]["Enums"]["ai_handoff_motivo"]
            | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          modo?: Database["public"]["Enums"]["ai_avatar_modo"] | null
          motivo?: string | null
          profile_id?: string | null
          prompt?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"] | null
          response?: string | null
          risco?: Database["public"]["Enums"]["ai_avatar_risco"] | null
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
      ai_prompts: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          id: string
          nome: string
          system_prompt: string
          tipo: string
          updated_at: string
          versao: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          system_prompt: string
          tipo: string
          updated_at?: string
          versao?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          system_prompt?: string
          tipo?: string
          updated_at?: string
          versao?: number
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          active: boolean
          avatar_confianca_minima: Database["public"]["Enums"]["ai_avatar_confianca"]
          avatar_cooldown_segundos: number
          avatar_horario_fim: string | null
          avatar_horario_inicio: string | null
          avatar_kill_switch: boolean
          avatar_kill_switch_at: string | null
          avatar_kill_switch_by: string | null
          avatar_kill_switch_motivo: string | null
          avatar_max_msgs_paciente_dia: number
          avatar_max_respostas_consecutivas: number
          avatar_modo: Database["public"]["Enums"]["ai_avatar_modo"]
          avatar_profile_id: string | null
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
          sugestao_medicos_ativa: boolean
          sugestao_prioridade: Json
          temperature: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          avatar_confianca_minima?: Database["public"]["Enums"]["ai_avatar_confianca"]
          avatar_cooldown_segundos?: number
          avatar_horario_fim?: string | null
          avatar_horario_inicio?: string | null
          avatar_kill_switch?: boolean
          avatar_kill_switch_at?: string | null
          avatar_kill_switch_by?: string | null
          avatar_kill_switch_motivo?: string | null
          avatar_max_msgs_paciente_dia?: number
          avatar_max_respostas_consecutivas?: number
          avatar_modo?: Database["public"]["Enums"]["ai_avatar_modo"]
          avatar_profile_id?: string | null
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
          sugestao_medicos_ativa?: boolean
          sugestao_prioridade?: Json
          temperature?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          avatar_confianca_minima?: Database["public"]["Enums"]["ai_avatar_confianca"]
          avatar_cooldown_segundos?: number
          avatar_horario_fim?: string | null
          avatar_horario_inicio?: string | null
          avatar_kill_switch?: boolean
          avatar_kill_switch_at?: string | null
          avatar_kill_switch_by?: string | null
          avatar_kill_switch_motivo?: string | null
          avatar_max_msgs_paciente_dia?: number
          avatar_max_respostas_consecutivas?: number
          avatar_modo?: Database["public"]["Enums"]["ai_avatar_modo"]
          avatar_profile_id?: string | null
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
          sugestao_medicos_ativa?: boolean
          sugestao_prioridade?: Json
          temperature?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_avatar_profile_fk"
            columns: ["avatar_profile_id"]
            isOneToOne: false
            referencedRelation: "ai_avatar_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          visibilidade_empresa: boolean
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
          visibilidade_empresa?: boolean
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
          visibilidade_empresa?: boolean
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
      attendant_presence: {
        Row: {
          current_conversation_id: string | null
          last_seen_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          current_conversation_id?: string | null
          last_seen_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          current_conversation_id?: string | null
          last_seen_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendant_presence_current_conversation_id_fkey"
            columns: ["current_conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
            foreignKeyName: "avaliacoes_medicas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_medicas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
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
      campanha_metricas_diarias: {
        Row: {
          campanha_id: string
          cliques: number
          conversoes: number
          cpc_medio_centavos: number | null
          data: string
          gasto_centavos: number
          id: string
          impressoes: number
          taxa_conversao: number | null
        }
        Insert: {
          campanha_id: string
          cliques?: number
          conversoes?: number
          cpc_medio_centavos?: number | null
          data: string
          gasto_centavos?: number
          id?: string
          impressoes?: number
          taxa_conversao?: number | null
        }
        Update: {
          campanha_id?: string
          cliques?: number
          conversoes?: number
          cpc_medio_centavos?: number | null
          data?: string
          gasto_centavos?: number
          id?: string
          impressoes?: number
          taxa_conversao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campanha_metricas_diarias_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "impulsionamento_campanhas"
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
      communication_departments: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          slug: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
        }
        Relationships: []
      }
      communication_queues: {
        Row: {
          ativo: boolean
          created_at: string
          department_id: string | null
          descricao: string | null
          id: string
          nome: string
          prioridade_padrao: Database["public"]["Enums"]["conversation_priority"]
          sla_minutos: number
          slug: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          department_id?: string | null
          descricao?: string | null
          id?: string
          nome: string
          prioridade_padrao?: Database["public"]["Enums"]["conversation_priority"]
          sla_minutos?: number
          slug: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          department_id?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          prioridade_padrao?: Database["public"]["Enums"]["conversation_priority"]
          sla_minutos?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_queues_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "communication_departments"
            referencedColumns: ["id"]
          },
        ]
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
          avaliacao_dispensada_em: string | null
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
          feegow_agendamento_id: string | null
          feegow_sync_at: string | null
          feegow_sync_error: string | null
          feegow_sync_status: string | null
          fim: string
          id: string
          inicio: string
          link_enviado_em: string | null
          link_enviado_por: string | null
          link_sala: string | null
          medico_id: string
          modalidade: Database["public"]["Enums"]["consulta_modalidade"]
          motivo: string | null
          nfe_id: string | null
          nfe_snapshot: Json | null
          nfe_status: string | null
          paciente_atendido_id: string | null
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
          avaliacao_dispensada_em?: string | null
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
          feegow_agendamento_id?: string | null
          feegow_sync_at?: string | null
          feegow_sync_error?: string | null
          feegow_sync_status?: string | null
          fim: string
          id?: string
          inicio: string
          link_enviado_em?: string | null
          link_enviado_por?: string | null
          link_sala?: string | null
          medico_id: string
          modalidade?: Database["public"]["Enums"]["consulta_modalidade"]
          motivo?: string | null
          nfe_id?: string | null
          nfe_snapshot?: Json | null
          nfe_status?: string | null
          paciente_atendido_id?: string | null
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
          avaliacao_dispensada_em?: string | null
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
          feegow_agendamento_id?: string | null
          feegow_sync_at?: string | null
          feegow_sync_error?: string | null
          feegow_sync_status?: string | null
          fim?: string
          id?: string
          inicio?: string
          link_enviado_em?: string | null
          link_enviado_por?: string | null
          link_sala?: string | null
          medico_id?: string
          modalidade?: Database["public"]["Enums"]["consulta_modalidade"]
          motivo?: string | null
          nfe_id?: string | null
          nfe_snapshot?: Json | null
          nfe_status?: string | null
          paciente_atendido_id?: string | null
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
            foreignKeyName: "consultas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consultas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
          {
            foreignKeyName: "consultas_paciente_atendido_id_fkey"
            columns: ["paciente_atendido_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
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
      conversation_ai_intents: {
        Row: {
          confidence: number | null
          conversation_id: string
          created_at: string
          detected_intent: string
          id: string
          provider: Database["public"]["Enums"]["ai_provider"]
          suggested_department: string | null
          suggested_priority: string | null
        }
        Insert: {
          confidence?: number | null
          conversation_id: string
          created_at?: string
          detected_intent: string
          id?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          suggested_department?: string | null
          suggested_priority?: string | null
        }
        Update: {
          confidence?: number | null
          conversation_id?: string
          created_at?: string
          detected_intent?: string
          id?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          suggested_department?: string | null
          suggested_priority?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_ai_intents_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_ai_risk_analysis: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          notes: string | null
          provider: Database["public"]["Enums"]["ai_provider"]
          requires_supervisor: boolean
          risk_level: string
          score: number | null
          signals: Json
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          notes?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"]
          requires_supervisor?: boolean
          risk_level: string
          score?: number | null
          signals?: Json
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"]
          requires_supervisor?: boolean
          risk_level?: string
          score?: number | null
          signals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "conversation_ai_risk_analysis_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_ai_summaries: {
        Row: {
          conversation_id: string
          created_at: string
          generated_by: string | null
          id: string
          last_message_id: string | null
          model: string | null
          provider: Database["public"]["Enums"]["ai_provider"]
          summary: string
          summary_type: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          generated_by?: string | null
          id?: string
          last_message_id?: string | null
          model?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"]
          summary: string
          summary_type?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          generated_by?: string | null
          id?: string
          last_message_id?: string | null
          model?: string | null
          provider?: Database["public"]["Enums"]["ai_provider"]
          summary?: string
          summary_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_ai_summaries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
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
      conversation_audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          conversation_id: string
          created_at: string
          id: string
          ip_address: string | null
          payload: Json
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          payload?: Json
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          payload?: Json
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_audit_log_conversation_id_fkey"
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
      conversation_meta_window: {
        Row: {
          conversation_id: string
          last_inbound_at: string
          updated_at: string
          window_expires_at: string
        }
        Insert: {
          conversation_id: string
          last_inbound_at: string
          updated_at?: string
          window_expires_at: string
        }
        Update: {
          conversation_id?: string
          last_inbound_at?: string
          updated_at?: string
          window_expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_meta_window_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_pacientes: {
        Row: {
          confirmado_em: string | null
          confirmado_por: string | null
          conversation_id: string
          created_at: string
          id: string
          observacao: string | null
          origem: string
          paciente_id: string
          parentesco: string | null
          removido_em: string | null
          updated_at: string
          vinculado_em: string
          vinculado_por: string | null
        }
        Insert: {
          confirmado_em?: string | null
          confirmado_por?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          observacao?: string | null
          origem?: string
          paciente_id: string
          parentesco?: string | null
          removido_em?: string | null
          updated_at?: string
          vinculado_em?: string
          vinculado_por?: string | null
        }
        Update: {
          confirmado_em?: string | null
          confirmado_por?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          observacao?: string | null
          origem?: string
          paciente_id?: string
          parentesco?: string | null
          removido_em?: string | null
          updated_at?: string
          vinculado_em?: string
          vinculado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_pacientes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_pacientes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_typing: {
        Row: {
          conversation_id: string
          is_typing: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          is_typing?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          is_typing?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_typing_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          ai_active: boolean
          ai_avatar_blocked: boolean
          ai_avatar_blocked_at: string | null
          ai_avatar_blocked_by: string | null
          ai_avatar_blocked_motivo: string | null
          ai_avatar_consecutive_replies: number
          ai_avatar_last_reply_at: string | null
          ai_avatar_paused_until: string | null
          assigned_sector: string | null
          assigned_to: string | null
          bot_active: boolean
          bot_handoff_at: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          closed_at: string | null
          closed_by: string | null
          consulta_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          department_id: string | null
          empresa_id: string | null
          first_response_at: string | null
          id: string
          intent: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          locked_at: string | null
          locked_by: string | null
          medico_id: string | null
          origin: Database["public"]["Enums"]["conversation_origin"]
          paciente_ativo_id: string | null
          patient_id: string | null
          priority: Database["public"]["Enums"]["conversation_priority"]
          queue_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[]
          unread_count: number
          updated_at: string
          whatsapp_instance_id: string | null
        }
        Insert: {
          ai_active?: boolean
          ai_avatar_blocked?: boolean
          ai_avatar_blocked_at?: string | null
          ai_avatar_blocked_by?: string | null
          ai_avatar_blocked_motivo?: string | null
          ai_avatar_consecutive_replies?: number
          ai_avatar_last_reply_at?: string | null
          ai_avatar_paused_until?: string | null
          assigned_sector?: string | null
          assigned_to?: string | null
          bot_active?: boolean
          bot_handoff_at?: string | null
          channel?: Database["public"]["Enums"]["conversation_channel"]
          closed_at?: string | null
          closed_by?: string | null
          consulta_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          department_id?: string | null
          empresa_id?: string | null
          first_response_at?: string | null
          id?: string
          intent?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          medico_id?: string | null
          origin?: Database["public"]["Enums"]["conversation_origin"]
          paciente_ativo_id?: string | null
          patient_id?: string | null
          priority?: Database["public"]["Enums"]["conversation_priority"]
          queue_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          tags?: string[]
          unread_count?: number
          updated_at?: string
          whatsapp_instance_id?: string | null
        }
        Update: {
          ai_active?: boolean
          ai_avatar_blocked?: boolean
          ai_avatar_blocked_at?: string | null
          ai_avatar_blocked_by?: string | null
          ai_avatar_blocked_motivo?: string | null
          ai_avatar_consecutive_replies?: number
          ai_avatar_last_reply_at?: string | null
          ai_avatar_paused_until?: string | null
          assigned_sector?: string | null
          assigned_to?: string | null
          bot_active?: boolean
          bot_handoff_at?: string | null
          channel?: Database["public"]["Enums"]["conversation_channel"]
          closed_at?: string | null
          closed_by?: string | null
          consulta_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          department_id?: string | null
          empresa_id?: string | null
          first_response_at?: string | null
          id?: string
          intent?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          lead_id?: string | null
          locked_at?: string | null
          locked_by?: string | null
          medico_id?: string | null
          origin?: Database["public"]["Enums"]["conversation_origin"]
          paciente_ativo_id?: string | null
          patient_id?: string | null
          priority?: Database["public"]["Enums"]["conversation_priority"]
          queue_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          sla_due_at?: string | null
          status?: Database["public"]["Enums"]["conversation_status"]
          tags?: string[]
          unread_count?: number
          updated_at?: string
          whatsapp_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "communication_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "conversation_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "communication_queues"
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
            foreignKeyName: "cupons_uso_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cupons_uso_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
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
      dependente_consentimentos: {
        Row: {
          accepted_at: string | null
          aceite: boolean
          created_at: string
          dependente_id: string
          id: string
          ip: string | null
          responsavel_id: string
          texto_termo_snapshot: string | null
          tipo_consentimento: string
          user_agent: string | null
        }
        Insert: {
          accepted_at?: string | null
          aceite?: boolean
          created_at?: string
          dependente_id: string
          id?: string
          ip?: string | null
          responsavel_id: string
          texto_termo_snapshot?: string | null
          tipo_consentimento?: string
          user_agent?: string | null
        }
        Update: {
          accepted_at?: string | null
          aceite?: boolean
          created_at?: string
          dependente_id?: string
          id?: string
          ip?: string | null
          responsavel_id?: string
          texto_termo_snapshot?: string | null
          tipo_consentimento?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dependente_consentimentos_dependente_id_fkey"
            columns: ["dependente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dependente_consentimentos_responsavel_id_fkey"
            columns: ["responsavel_id"]
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
          consulta_id: string | null
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
          uploaded_by: string | null
          user_id: string
          visibilidade_empresa: boolean
        }
        Insert: {
          consulta_id?: string | null
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
          uploaded_by?: string | null
          user_id: string
          visibilidade_empresa?: boolean
        }
        Update: {
          consulta_id?: string | null
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
          uploaded_by?: string | null
          user_id?: string
          visibilidade_empresa?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "documentos_paciente_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa_medicos: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string
          id: string
          medico_id: string
          preco_consulta_centavos: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          medico_id: string
          preco_consulta_centavos?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          medico_id?: string
          preco_consulta_centavos?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresa_medicos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_medicos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_medicos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "empresa_medicos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
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
          plano_id: string | null
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
          plano_id?: string | null
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
          plano_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "empresas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
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
          plano_id: string | null
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
          plano_id?: string | null
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
          plano_id?: string | null
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
          {
            foreignKeyName: "empresas_contratos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
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
          icone: string | null
          id: string
          nome: string
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          icone?: string | null
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
      faqs: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          id: string
          ordem: number
          pergunta: string
          resposta: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          id?: string
          ordem?: number
          pergunta: string
          resposta: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          id?: string
          ordem?: number
          pergunta?: string
          resposta?: string
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
      financeiro_alertas: {
        Row: {
          created_at: string
          id: string
          medico_id: string | null
          payload: Json
          resolvido_em: string | null
          resolvido_por: string | null
          severidade: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          medico_id?: string | null
          payload?: Json
          resolvido_em?: string | null
          resolvido_por?: string | null
          severidade?: string
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          medico_id?: string | null
          payload?: Json
          resolvido_em?: string | null
          resolvido_por?: string | null
          severidade?: string
          tipo?: string
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
      financeiro_backfill_log: {
        Row: {
          dry_run: boolean
          erro: string | null
          executado_em: string
          executado_por: string | null
          id: string
          ok: boolean
          relatorio: Json
        }
        Insert: {
          dry_run: boolean
          erro?: string | null
          executado_em?: string
          executado_por?: string | null
          id?: string
          ok: boolean
          relatorio?: Json
        }
        Update: {
          dry_run?: boolean
          erro?: string | null
          executado_em?: string
          executado_por?: string | null
          id?: string
          ok?: boolean
          relatorio?: Json
        }
        Relationships: []
      }
      financeiro_idempotency: {
        Row: {
          created_at: string
          id: string
          key: string
          result: Json
          result_hash: string | null
          scope: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          result?: Json
          result_hash?: string | null
          scope: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          result?: Json
          result_hash?: string | null
          scope?: string
        }
        Relationships: []
      }
      financeiro_movimentos: {
        Row: {
          actor_user_id: string | null
          bucket: string
          conta: string
          conta_ref_id: string | null
          created_at: string
          direcao: string
          hash_anterior: string | null
          hash_atual: string
          id: string
          idempotency_key: string
          metadata: Json
          moeda: string
          ocorrido_em: string
          origem: string
          ref_id: string | null
          ref_type: string
          seq: number
          valor_cents: number
        }
        Insert: {
          actor_user_id?: string | null
          bucket?: string
          conta: string
          conta_ref_id?: string | null
          created_at?: string
          direcao: string
          hash_anterior?: string | null
          hash_atual: string
          id?: string
          idempotency_key: string
          metadata?: Json
          moeda?: string
          ocorrido_em?: string
          origem: string
          ref_id?: string | null
          ref_type: string
          seq?: number
          valor_cents: number
        }
        Update: {
          actor_user_id?: string | null
          bucket?: string
          conta?: string
          conta_ref_id?: string | null
          created_at?: string
          direcao?: string
          hash_anterior?: string | null
          hash_atual?: string
          id?: string
          idempotency_key?: string
          metadata?: Json
          moeda?: string
          ocorrido_em?: string
          origem?: string
          ref_id?: string | null
          ref_type?: string
          seq?: number
          valor_cents?: number
        }
        Relationships: []
      }
      financeiro_outbox: {
        Row: {
          created_at: string
          evento: string
          id: string
          last_error: string | null
          payload: Json
          processed_at: string | null
          proxima_tentativa_em: string | null
          status: string
          tentativas: number
        }
        Insert: {
          created_at?: string
          evento: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          proxima_tentativa_em?: string | null
          status?: string
          tentativas?: number
        }
        Update: {
          created_at?: string
          evento?: string
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          proxima_tentativa_em?: string | null
          status?: string
          tentativas?: number
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
          {
            foreignKeyName: "impulsionamento_campanhas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impulsionamento_campanhas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
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
      impulsionamento_conversoes: {
        Row: {
          campanha_id: string
          clique_id: string | null
          consulta_id: string | null
          created_at: string
          id: string
          medico_id: string
          paciente_id: string | null
        }
        Insert: {
          campanha_id: string
          clique_id?: string | null
          consulta_id?: string | null
          created_at?: string
          id?: string
          medico_id: string
          paciente_id?: string | null
        }
        Update: {
          campanha_id?: string
          clique_id?: string | null
          consulta_id?: string | null
          created_at?: string
          id?: string
          medico_id?: string
          paciente_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impulsionamento_conversoes_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "impulsionamento_campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impulsionamento_conversoes_clique_id_fkey"
            columns: ["clique_id"]
            isOneToOne: false
            referencedRelation: "impulsionamento_cliques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impulsionamento_conversoes_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impulsionamento_conversoes_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impulsionamento_conversoes_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "impulsionamento_conversoes_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
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
      internal_messages: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          thread_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          thread_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "internal_threads"
            referencedColumns: ["id"]
          },
        ]
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
      internal_threads: {
        Row: {
          agendamento_id: string | null
          assunto: string
          created_at: string
          created_by: string
          id: string
          origem: Database["public"]["Enums"]["internal_thread_origem"]
          paciente_id: string | null
          participantes: string[]
          prioridade: Database["public"]["Enums"]["internal_thread_prioridade"]
          status: Database["public"]["Enums"]["internal_thread_status"]
          updated_at: string
        }
        Insert: {
          agendamento_id?: string | null
          assunto: string
          created_at?: string
          created_by: string
          id?: string
          origem: Database["public"]["Enums"]["internal_thread_origem"]
          paciente_id?: string | null
          participantes?: string[]
          prioridade?: Database["public"]["Enums"]["internal_thread_prioridade"]
          status?: Database["public"]["Enums"]["internal_thread_status"]
          updated_at?: string
        }
        Update: {
          agendamento_id?: string | null
          assunto?: string
          created_at?: string
          created_by?: string
          id?: string
          origem?: Database["public"]["Enums"]["internal_thread_origem"]
          paciente_id?: string | null
          participantes?: string[]
          prioridade?: Database["public"]["Enums"]["internal_thread_prioridade"]
          status?: Database["public"]["Enums"]["internal_thread_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_threads_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "internal_threads_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
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
      medico_alertas_ia: {
        Row: {
          created_at: string
          dados_utilizados: Json
          descricao: string
          id: string
          justificativa: string | null
          medico_id: string
          recomendacao_ia: string | null
          resolvido_em: string | null
          resolvido_por: string | null
          severidade: Database["public"]["Enums"]["alerta_ia_severidade"]
          status: Database["public"]["Enums"]["alerta_ia_status"]
          tipo: Database["public"]["Enums"]["alerta_ia_tipo"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dados_utilizados?: Json
          descricao: string
          id?: string
          justificativa?: string | null
          medico_id: string
          recomendacao_ia?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          severidade?: Database["public"]["Enums"]["alerta_ia_severidade"]
          status?: Database["public"]["Enums"]["alerta_ia_status"]
          tipo: Database["public"]["Enums"]["alerta_ia_tipo"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dados_utilizados?: Json
          descricao?: string
          id?: string
          justificativa?: string | null
          medico_id?: string
          recomendacao_ia?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          severidade?: Database["public"]["Enums"]["alerta_ia_severidade"]
          status?: Database["public"]["Enums"]["alerta_ia_status"]
          tipo?: Database["public"]["Enums"]["alerta_ia_tipo"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_alertas_ia_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_alertas_ia_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_alertas_ia_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      medico_anomalias: {
        Row: {
          created_at: string
          dados_evidencia: Json
          descricao: string
          id: string
          investigado_em: string | null
          investigado_por: string | null
          medico_id: string
          score_confianca: number
          severidade: Database["public"]["Enums"]["alerta_ia_severidade"]
          status: Database["public"]["Enums"]["anomalia_status"]
          tipo_anomalia: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dados_evidencia?: Json
          descricao: string
          id?: string
          investigado_em?: string | null
          investigado_por?: string | null
          medico_id: string
          score_confianca?: number
          severidade?: Database["public"]["Enums"]["alerta_ia_severidade"]
          status?: Database["public"]["Enums"]["anomalia_status"]
          tipo_anomalia: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dados_evidencia?: Json
          descricao?: string
          id?: string
          investigado_em?: string | null
          investigado_por?: string | null
          medico_id?: string
          score_confianca?: number
          severidade?: Database["public"]["Enums"]["alerta_ia_severidade"]
          status?: Database["public"]["Enums"]["anomalia_status"]
          tipo_anomalia?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_anomalias_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_anomalias_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_anomalias_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      medico_auditoria_ia: {
        Row: {
          created_at: string
          dados_entrada: Json
          dados_saida: Json
          id: string
          medico_id: string
          modelo_ia: string
          resultado: string
          tipo_analise: string
          versao_prompt: string
        }
        Insert: {
          created_at?: string
          dados_entrada?: Json
          dados_saida?: Json
          id?: string
          medico_id: string
          modelo_ia?: string
          resultado: string
          tipo_analise: string
          versao_prompt?: string
        }
        Update: {
          created_at?: string
          dados_entrada?: Json
          dados_saida?: Json
          id?: string
          medico_id?: string
          modelo_ia?: string
          resultado?: string
          tipo_analise?: string
          versao_prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_auditoria_ia_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_auditoria_ia_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_auditoria_ia_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      medico_badges: {
        Row: {
          ativo: boolean
          badge_descricao: string | null
          badge_icone: string | null
          badge_key: string
          badge_nome: string
          conquistado_em: string
          expira_em: string | null
          id: string
          medico_id: string
        }
        Insert: {
          ativo?: boolean
          badge_descricao?: string | null
          badge_icone?: string | null
          badge_key: string
          badge_nome: string
          conquistado_em?: string
          expira_em?: string | null
          id?: string
          medico_id: string
        }
        Update: {
          ativo?: boolean
          badge_descricao?: string | null
          badge_icone?: string | null
          badge_key?: string
          badge_nome?: string
          conquistado_em?: string
          expira_em?: string | null
          id?: string
          medico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_badges_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_badges_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_badges_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
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
        Relationships: [
          {
            foreignKeyName: "fk_medico_comissao_override_medico"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_medico_comissao_override_medico"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_medico_comissao_override_medico"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
          {
            foreignKeyName: "fk_medico_comissao_override_servico"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_financeiros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_medico_comissao_override_servico"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos_publicos"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "medico_dados_bancarios_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_dados_bancarios_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
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
          {
            foreignKeyName: "medico_enderecos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_enderecos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
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
          {
            foreignKeyName: "medico_especialidades_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_especialidades_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      medico_formacoes: {
        Row: {
          created_at: string
          id: string
          instituicao: string
          medico_id: string
          ordem: number
          status: string
          titulo: string
        }
        Insert: {
          created_at?: string
          id?: string
          instituicao: string
          medico_id: string
          ordem?: number
          status?: string
          titulo: string
        }
        Update: {
          created_at?: string
          id?: string
          instituicao?: string
          medico_id?: string
          ordem?: number
          status?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_formacoes_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_formacoes_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_formacoes_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      medico_google_tokens: {
        Row: {
          access_token: string
          created_at: string
          google_email: string | null
          id: string
          medico_id: string
          refresh_token: string
          scopes: string
          token_expiry: string
          updated_at: string
        }
        Insert: {
          access_token: string
          created_at?: string
          google_email?: string | null
          id?: string
          medico_id: string
          refresh_token: string
          scopes?: string
          token_expiry: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          google_email?: string | null
          id?: string
          medico_id?: string
          refresh_token?: string
          scopes?: string
          token_expiry?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_google_tokens_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_google_tokens_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_google_tokens_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      medico_logs_confianca: {
        Row: {
          actor_id: string | null
          created_at: string
          detalhes: Json
          evento: string
          id: string
          medico_id: string
          motivo: string | null
          score_antes: number | null
          score_depois: number | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detalhes?: Json
          evento: string
          id?: string
          medico_id: string
          motivo?: string | null
          score_antes?: number | null
          score_depois?: number | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detalhes?: Json
          evento?: string
          id?: string
          medico_id?: string
          motivo?: string | null
          score_antes?: number | null
          score_depois?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medico_logs_confianca_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_logs_confianca_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_logs_confianca_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      medico_metas: {
        Row: {
          ativo: boolean
          badge_recompensa: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          periodo: string
          pontos_recompensa: number
          threshold: number
          tipo: string
          titulo: string
        }
        Insert: {
          ativo?: boolean
          badge_recompensa?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          periodo?: string
          pontos_recompensa?: number
          threshold: number
          tipo: string
          titulo: string
        }
        Update: {
          ativo?: boolean
          badge_recompensa?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          periodo?: string
          pontos_recompensa?: number
          threshold?: number
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      medico_metas_progresso: {
        Row: {
          concluida: boolean
          concluida_em: string | null
          id: string
          medico_id: string
          meta_id: string
          periodo_referencia: string
          pontos_creditados: boolean
          updated_at: string
          valor_atual: number
        }
        Insert: {
          concluida?: boolean
          concluida_em?: string | null
          id?: string
          medico_id: string
          meta_id: string
          periodo_referencia: string
          pontos_creditados?: boolean
          updated_at?: string
          valor_atual?: number
        }
        Update: {
          concluida?: boolean
          concluida_em?: string | null
          id?: string
          medico_id?: string
          meta_id?: string
          periodo_referencia?: string
          pontos_creditados?: boolean
          updated_at?: string
          valor_atual?: number
        }
        Relationships: [
          {
            foreignKeyName: "medico_metas_progresso_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_metas_progresso_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_metas_progresso_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
          {
            foreignKeyName: "medico_metas_progresso_meta_id_fkey"
            columns: ["meta_id"]
            isOneToOne: false
            referencedRelation: "medico_metas"
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
            foreignKeyName: "medico_nfes_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_nfes_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
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
      medico_notificacao_prefs: {
        Row: {
          alertas_operacionais: boolean
          id: string
          lembretes_consulta: boolean
          medico_id: string
          resumo_diario_email: boolean
          updated_at: string
        }
        Insert: {
          alertas_operacionais?: boolean
          id?: string
          lembretes_consulta?: boolean
          medico_id: string
          resumo_diario_email?: boolean
          updated_at?: string
        }
        Update: {
          alertas_operacionais?: boolean
          id?: string
          lembretes_consulta?: boolean
          medico_id?: string
          resumo_diario_email?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_notificacao_prefs_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_notificacao_prefs_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_notificacao_prefs_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
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
          {
            foreignKeyName: "medico_premium_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_premium_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      medico_ranking: {
        Row: {
          avaliacao_bayesiana: number
          avaliacao_media: number
          bonus_novato: number
          fator_premium: number
          fator_recencia: number
          last_activity_at: string | null
          medico_id: string
          penalidade_anomalia: number
          penalidade_compliance: number
          posicao: number | null
          protecao_detalhes: Json
          ranking_score: number
          taxa_conversao: number
          taxa_no_show: number
          total_agendamentos: number
          total_atendimentos: number
          total_avaliacoes: number
          updated_at: string
        }
        Insert: {
          avaliacao_bayesiana?: number
          avaliacao_media?: number
          bonus_novato?: number
          fator_premium?: number
          fator_recencia?: number
          last_activity_at?: string | null
          medico_id: string
          penalidade_anomalia?: number
          penalidade_compliance?: number
          posicao?: number | null
          protecao_detalhes?: Json
          ranking_score?: number
          taxa_conversao?: number
          taxa_no_show?: number
          total_agendamentos?: number
          total_atendimentos?: number
          total_avaliacoes?: number
          updated_at?: string
        }
        Update: {
          avaliacao_bayesiana?: number
          avaliacao_media?: number
          bonus_novato?: number
          fator_premium?: number
          fator_recencia?: number
          last_activity_at?: string | null
          medico_id?: string
          penalidade_anomalia?: number
          penalidade_compliance?: number
          posicao?: number | null
          protecao_detalhes?: Json
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
          {
            foreignKeyName: "medico_ranking_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_ranking_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      medico_restricoes: {
        Row: {
          aplicado_em: string | null
          aplicado_por: string | null
          beneficios_bloqueados: boolean
          em_acompanhamento: boolean
          expira_em: string | null
          impulsionamento_pausado: boolean
          medico_id: string
          motivo: string | null
          ranking_congelado: boolean
          selo_removido: boolean
          updated_at: string
        }
        Insert: {
          aplicado_em?: string | null
          aplicado_por?: string | null
          beneficios_bloqueados?: boolean
          em_acompanhamento?: boolean
          expira_em?: string | null
          impulsionamento_pausado?: boolean
          medico_id: string
          motivo?: string | null
          ranking_congelado?: boolean
          selo_removido?: boolean
          updated_at?: string
        }
        Update: {
          aplicado_em?: string | null
          aplicado_por?: string | null
          beneficios_bloqueados?: boolean
          em_acompanhamento?: boolean
          expira_em?: string | null
          impulsionamento_pausado?: boolean
          medico_id?: string
          motivo?: string | null
          ranking_congelado?: boolean
          selo_removido?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_restricoes_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_restricoes_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_restricoes_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      medico_saldo_crescimento: {
        Row: {
          created_at: string
          id: string
          medico_id: string
          motivo: string
          referencia_id: string | null
          saldo_apos: number
          tipo: string
          valor: number
        }
        Insert: {
          created_at?: string
          id?: string
          medico_id: string
          motivo?: string
          referencia_id?: string | null
          saldo_apos?: number
          tipo?: string
          valor?: number
        }
        Update: {
          created_at?: string
          id?: string
          medico_id?: string
          motivo?: string
          referencia_id?: string | null
          saldo_apos?: number
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "medico_saldo_crescimento_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_saldo_crescimento_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_saldo_crescimento_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      medico_score_compliance: {
        Row: {
          detalhes: Json
          medico_id: string
          nivel_risco: Database["public"]["Enums"]["nivel_risco"]
          score_avaliacoes_integridade: number
          score_campanhas_integridade: number
          score_confianca: number
          score_padrao_comportamento: number
          score_total: number
          updated_at: string
        }
        Insert: {
          detalhes?: Json
          medico_id: string
          nivel_risco?: Database["public"]["Enums"]["nivel_risco"]
          score_avaliacoes_integridade?: number
          score_campanhas_integridade?: number
          score_confianca?: number
          score_padrao_comportamento?: number
          score_total?: number
          updated_at?: string
        }
        Update: {
          detalhes?: Json
          medico_id?: string
          nivel_risco?: Database["public"]["Enums"]["nivel_risco"]
          score_avaliacoes_integridade?: number
          score_campanhas_integridade?: number
          score_confianca?: number
          score_padrao_comportamento?: number
          score_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_score_compliance_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_score_compliance_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_score_compliance_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      medico_score_detalhado: {
        Row: {
          detalhes_clinico: Json | null
          detalhes_comercial: Json | null
          detalhes_operacional: Json | null
          detalhes_reputacional: Json | null
          medico_id: string
          nivel: number
          nivel_nome: string
          score_clinico: number
          score_comercial: number
          score_final: number
          score_operacional: number
          score_reputacional: number
          total_pontos_acumulados: number
          updated_at: string
        }
        Insert: {
          detalhes_clinico?: Json | null
          detalhes_comercial?: Json | null
          detalhes_operacional?: Json | null
          detalhes_reputacional?: Json | null
          medico_id: string
          nivel?: number
          nivel_nome?: string
          score_clinico?: number
          score_comercial?: number
          score_final?: number
          score_operacional?: number
          score_reputacional?: number
          total_pontos_acumulados?: number
          updated_at?: string
        }
        Update: {
          detalhes_clinico?: Json | null
          detalhes_comercial?: Json | null
          detalhes_operacional?: Json | null
          detalhes_reputacional?: Json | null
          medico_id?: string
          nivel?: number
          nivel_nome?: string
          score_clinico?: number
          score_comercial?: number
          score_final?: number
          score_operacional?: number
          score_reputacional?: number
          total_pontos_acumulados?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_score_detalhado_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_score_detalhado_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_score_detalhado_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      medico_score_operacional: {
        Row: {
          detalhes: Json
          medico_id: string
          score_cancelamento: number
          score_documentacao: number
          score_no_show: number
          score_pontualidade: number
          score_resposta: number
          score_total: number
          score_uso_sistema: number
          updated_at: string
        }
        Insert: {
          detalhes?: Json
          medico_id: string
          score_cancelamento?: number
          score_documentacao?: number
          score_no_show?: number
          score_pontualidade?: number
          score_resposta?: number
          score_total?: number
          score_uso_sistema?: number
          updated_at?: string
        }
        Update: {
          detalhes?: Json
          medico_id?: string
          score_cancelamento?: number
          score_documentacao?: number
          score_no_show?: number
          score_pontualidade?: number
          score_resposta?: number
          score_total?: number
          score_uso_sistema?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_score_operacional_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_score_operacional_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_score_operacional_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: true
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
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
      medico_streaks: {
        Row: {
          dias_consecutivos: number
          id: string
          medico_id: string
          melhor_streak: number
          tipo: string
          ultima_atividade: string | null
          updated_at: string
        }
        Insert: {
          dias_consecutivos?: number
          id?: string
          medico_id: string
          melhor_streak?: number
          tipo: string
          ultima_atividade?: string | null
          updated_at?: string
        }
        Update: {
          dias_consecutivos?: number
          id?: string
          medico_id?: string
          melhor_streak?: number
          tipo?: string
          ultima_atividade?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medico_streaks_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_streaks_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medico_streaks_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
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
          cep: string | null
          cpf: string | null
          created_at: string
          crm: string
          crm_estado: string
          data_nascimento: string | null
          documentos: Json
          email: string
          especialidade: string
          feegow_erro: string | null
          feegow_especialidade_id: number | null
          feegow_liberado_em: string | null
          feegow_metadata: Json | null
          feegow_payload: Json | null
          feegow_professional_id: string | null
          feegow_status: Database["public"]["Enums"]["feegow_status"]
          feegow_vinculado_em: string | null
          feegow_vinculado_por: string | null
          foto_url: string | null
          id: string
          link_sala_padrao: string | null
          motivo_reprovacao: string | null
          nome: string
          prioridade_atendimento: number
          rqe: string | null
          sexo: string | null
          sexo_biologico: string | null
          status: Database["public"]["Enums"]["medico_status"]
          suspensao_aplicada_em: string | null
          suspensao_aplicada_por: string | null
          suspensao_motivo: string | null
          suspensao_observacao: string | null
          suspenso_ate: string | null
          suspenso_indeterminado: boolean
          telefone: string | null
          tipo_sala: string
          tratamento: string | null
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
          cep?: string | null
          cpf?: string | null
          created_at?: string
          crm: string
          crm_estado: string
          data_nascimento?: string | null
          documentos?: Json
          email: string
          especialidade: string
          feegow_erro?: string | null
          feegow_especialidade_id?: number | null
          feegow_liberado_em?: string | null
          feegow_metadata?: Json | null
          feegow_payload?: Json | null
          feegow_professional_id?: string | null
          feegow_status?: Database["public"]["Enums"]["feegow_status"]
          feegow_vinculado_em?: string | null
          feegow_vinculado_por?: string | null
          foto_url?: string | null
          id?: string
          link_sala_padrao?: string | null
          motivo_reprovacao?: string | null
          nome: string
          prioridade_atendimento?: number
          rqe?: string | null
          sexo?: string | null
          sexo_biologico?: string | null
          status?: Database["public"]["Enums"]["medico_status"]
          suspensao_aplicada_em?: string | null
          suspensao_aplicada_por?: string | null
          suspensao_motivo?: string | null
          suspensao_observacao?: string | null
          suspenso_ate?: string | null
          suspenso_indeterminado?: boolean
          telefone?: string | null
          tipo_sala?: string
          tratamento?: string | null
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
          cep?: string | null
          cpf?: string | null
          created_at?: string
          crm?: string
          crm_estado?: string
          data_nascimento?: string | null
          documentos?: Json
          email?: string
          especialidade?: string
          feegow_erro?: string | null
          feegow_especialidade_id?: number | null
          feegow_liberado_em?: string | null
          feegow_metadata?: Json | null
          feegow_payload?: Json | null
          feegow_professional_id?: string | null
          feegow_status?: Database["public"]["Enums"]["feegow_status"]
          feegow_vinculado_em?: string | null
          feegow_vinculado_por?: string | null
          foto_url?: string | null
          id?: string
          link_sala_padrao?: string | null
          motivo_reprovacao?: string | null
          nome?: string
          prioridade_atendimento?: number
          rqe?: string | null
          sexo?: string | null
          sexo_biologico?: string | null
          status?: Database["public"]["Enums"]["medico_status"]
          suspensao_aplicada_em?: string | null
          suspensao_aplicada_por?: string | null
          suspensao_motivo?: string | null
          suspensao_observacao?: string | null
          suspenso_ate?: string | null
          suspenso_indeterminado?: boolean
          telefone?: string | null
          tipo_sala?: string
          tratamento?: string | null
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
          {
            foreignKeyName: "medicos_auditoria_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicos_auditoria_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      message_templates: {
        Row: {
          active: boolean
          aprovado_em: string | null
          buttons: Json | null
          category: Database["public"]["Enums"]["template_category"]
          content: string
          created_at: string
          created_by: string | null
          footer: string | null
          header_type: string | null
          id: string
          language: string
          meta_template_id: string | null
          name: string
          updated_at: string
          variables: string[]
          whatsapp_status: Database["public"]["Enums"]["template_wa_status"]
          whatsapp_template_name: string | null
        }
        Insert: {
          active?: boolean
          aprovado_em?: string | null
          buttons?: Json | null
          category?: Database["public"]["Enums"]["template_category"]
          content: string
          created_at?: string
          created_by?: string | null
          footer?: string | null
          header_type?: string | null
          id?: string
          language?: string
          meta_template_id?: string | null
          name: string
          updated_at?: string
          variables?: string[]
          whatsapp_status?: Database["public"]["Enums"]["template_wa_status"]
          whatsapp_template_name?: string | null
        }
        Update: {
          active?: boolean
          aprovado_em?: string | null
          buttons?: Json | null
          category?: Database["public"]["Enums"]["template_category"]
          content?: string
          created_at?: string
          created_by?: string | null
          footer?: string | null
          header_type?: string | null
          id?: string
          language?: string
          meta_template_id?: string | null
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
      meta_template_sync_log: {
        Row: {
          action: string
          created_at: string
          dry_run: boolean
          id: string
          payload: Json | null
          performed_by: string | null
          status_meta: string | null
          template_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          dry_run?: boolean
          id?: string
          payload?: Json | null
          performed_by?: string | null
          status_meta?: string | null
          template_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          dry_run?: boolean
          id?: string
          payload?: Json | null
          performed_by?: string | null
          status_meta?: string | null
          template_name?: string | null
        }
        Relationships: []
      }
      meta_waba_health: {
        Row: {
          business_account_id: string | null
          created_at: string
          display_phone_number: string | null
          error_code: string | null
          error_message: string | null
          id: string
          last_check_at: string
          phone_number_id: string | null
          quality_rating: string | null
          raw: Json | null
          status: Database["public"]["Enums"]["waba_health_status"]
          throughput_tier: string | null
        }
        Insert: {
          business_account_id?: string | null
          created_at?: string
          display_phone_number?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          last_check_at?: string
          phone_number_id?: string | null
          quality_rating?: string | null
          raw?: Json | null
          status?: Database["public"]["Enums"]["waba_health_status"]
          throughput_tier?: string | null
        }
        Update: {
          business_account_id?: string | null
          created_at?: string
          display_phone_number?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          last_check_at?: string
          phone_number_id?: string | null
          quality_rating?: string | null
          raw?: Json | null
          status?: Database["public"]["Enums"]["waba_health_status"]
          throughput_tier?: string | null
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          lida: boolean
          perfil: string
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: string
          titulo: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          lida?: boolean
          perfil?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
          titulo: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          lida?: boolean
          perfil?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      observabilidade_eventos: {
        Row: {
          conversation_id: string | null
          created_at: string
          evento: string
          id: string
          metadata: Json
          modulo: string
          severity: Database["public"]["Enums"]["severity_evento"]
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          evento: string
          id?: string
          metadata?: Json
          modulo: string
          severity?: Database["public"]["Enums"]["severity_evento"]
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          evento?: string
          id?: string
          metadata?: Json
          modulo?: string
          severity?: Database["public"]["Enums"]["severity_evento"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "observabilidade_eventos_conversation_id_fkey"
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
          bloqueado_ate: string | null
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
          parentesco: string | null
          responsavel_cadastro_id: string | null
          responsavel_id: string | null
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
          tipo_paciente: Database["public"]["Enums"]["tipo_paciente"]
          uf: string | null
          updated_at: string
          user_id: string | null
          whatsapp_opt_in: boolean | null
        }
        Insert: {
          alergias?: string | null
          bairro?: string | null
          bloqueado_ate?: string | null
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
          parentesco?: string | null
          responsavel_cadastro_id?: string | null
          responsavel_id?: string | null
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
          tipo_paciente?: Database["public"]["Enums"]["tipo_paciente"]
          uf?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_opt_in?: boolean | null
        }
        Update: {
          alergias?: string | null
          bairro?: string | null
          bloqueado_ate?: string | null
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
          parentesco?: string | null
          responsavel_cadastro_id?: string | null
          responsavel_id?: string | null
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
          tipo_paciente?: Database["public"]["Enums"]["tipo_paciente"]
          uf?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_opt_in?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
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
          consulta_id: string | null
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
          consulta_id?: string | null
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
          consulta_id?: string | null
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
            foreignKeyName: "plano_medicos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_medicos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
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
          coparticipacao_pct: number
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
          especialidades_liberadas: string[]
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
          regras_uso_json: Json
          sla_prioridade: string
          status: Database["public"]["Enums"]["plano_status"]
          taxa_adesao_centavos: number
          taxa_pagamento_pct: number
          termos_aceitos: boolean
          updated_at: string
          valor_anual_centavos: number
          valor_mensal_centavos: number
          valor_por_vida_centavos: number
          valor_promocional_centavos: number | null
          versao: number
        }
        Insert: {
          aprovado_admin?: boolean
          categoria?: Database["public"]["Enums"]["plano_categoria"]
          coparticipacao_pct?: number
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
          especialidades_liberadas?: string[]
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
          regras_uso_json?: Json
          sla_prioridade?: string
          status?: Database["public"]["Enums"]["plano_status"]
          taxa_adesao_centavos?: number
          taxa_pagamento_pct?: number
          termos_aceitos?: boolean
          updated_at?: string
          valor_anual_centavos?: number
          valor_mensal_centavos?: number
          valor_por_vida_centavos?: number
          valor_promocional_centavos?: number | null
          versao?: number
        }
        Update: {
          aprovado_admin?: boolean
          categoria?: Database["public"]["Enums"]["plano_categoria"]
          coparticipacao_pct?: number
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
          especialidades_liberadas?: string[]
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
          regras_uso_json?: Json
          sla_prioridade?: string
          status?: Database["public"]["Enums"]["plano_status"]
          taxa_adesao_centavos?: number
          taxa_pagamento_pct?: number
          termos_aceitos?: boolean
          updated_at?: string
          valor_anual_centavos?: number
          valor_mensal_centavos?: number
          valor_por_vida_centavos?: number
          valor_promocional_centavos?: number | null
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "planos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
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
      politica_reembolso: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          escopo: Database["public"]["Enums"]["politica_reembolso_escopo"]
          horas_antecedencia_min: number | null
          id: string
          medico_id: string | null
          percentual: number
          situacao: Database["public"]["Enums"]["politica_reembolso_situacao"]
          tipo_reembolso: Database["public"]["Enums"]["politica_reembolso_acao"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          escopo?: Database["public"]["Enums"]["politica_reembolso_escopo"]
          horas_antecedencia_min?: number | null
          id?: string
          medico_id?: string | null
          percentual?: number
          situacao: Database["public"]["Enums"]["politica_reembolso_situacao"]
          tipo_reembolso?: Database["public"]["Enums"]["politica_reembolso_acao"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          escopo?: Database["public"]["Enums"]["politica_reembolso_escopo"]
          horas_antecedencia_min?: number | null
          id?: string
          medico_id?: string | null
          percentual?: number
          situacao?: Database["public"]["Enums"]["politica_reembolso_situacao"]
          tipo_reembolso?: Database["public"]["Enums"]["politica_reembolso_acao"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "politica_reembolso_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "politica_reembolso_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "politica_reembolso_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      premium_assinaturas: {
        Row: {
          auto_renovar: boolean
          cancelado_em: string | null
          created_at: string
          environment: string
          fim_ciclo_atual: string | null
          id: string
          inicio: string
          medico_id: string
          moeda: string
          motivo_cancelamento: string | null
          plano: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          valor_centavos: number
        }
        Insert: {
          auto_renovar?: boolean
          cancelado_em?: string | null
          created_at?: string
          environment?: string
          fim_ciclo_atual?: string | null
          id?: string
          inicio?: string
          medico_id: string
          moeda?: string
          motivo_cancelamento?: string | null
          plano: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          valor_centavos: number
        }
        Update: {
          auto_renovar?: boolean
          cancelado_em?: string | null
          created_at?: string
          environment?: string
          fim_ciclo_atual?: string | null
          id?: string
          inicio?: string
          medico_id?: string
          moeda?: string
          motivo_cancelamento?: string | null
          plano?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          valor_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "premium_assinaturas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_assinaturas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_assinaturas_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      premium_creditos: {
        Row: {
          campanha_id: string | null
          created_at: string
          creditos_centavos: number
          creditos_restantes_centavos: number
          id: string
          medico_id: string
          pontos_convertidos: number | null
          taxa_conversao: number
          tipo: string
          utilizado: boolean
          utilizado_em: string | null
          valido_ate: string
        }
        Insert: {
          campanha_id?: string | null
          created_at?: string
          creditos_centavos: number
          creditos_restantes_centavos: number
          id?: string
          medico_id: string
          pontos_convertidos?: number | null
          taxa_conversao?: number
          tipo: string
          utilizado?: boolean
          utilizado_em?: string | null
          valido_ate: string
        }
        Update: {
          campanha_id?: string | null
          created_at?: string
          creditos_centavos?: number
          creditos_restantes_centavos?: number
          id?: string
          medico_id?: string
          pontos_convertidos?: number | null
          taxa_conversao?: number
          tipo?: string
          utilizado?: boolean
          utilizado_em?: string | null
          valido_ate?: string
        }
        Relationships: [
          {
            foreignKeyName: "premium_creditos_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "impulsionamento_campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_creditos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_creditos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "premium_creditos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
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
      producao_checklist: {
        Row: {
          ativo: boolean
          descricao: string | null
          key: string
          label: string
          obrigatorio: boolean
          ordem: number
        }
        Insert: {
          ativo?: boolean
          descricao?: string | null
          key: string
          label: string
          obrigatorio?: boolean
          ordem?: number
        }
        Update: {
          ativo?: boolean
          descricao?: string | null
          key?: string
          label?: string
          obrigatorio?: boolean
          ordem?: number
        }
        Relationships: []
      }
      producao_checklist_status: {
        Row: {
          conferido_em: string | null
          conferido_por: string | null
          evidencia: string | null
          item_key: string
          ok: boolean
          updated_at: string
        }
        Insert: {
          conferido_em?: string | null
          conferido_por?: string | null
          evidencia?: string | null
          item_key: string
          ok?: boolean
          updated_at?: string
        }
        Update: {
          conferido_em?: string | null
          conferido_por?: string | null
          evidencia?: string | null
          item_key?: string
          ok?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "producao_checklist_status_item_key_fkey"
            columns: ["item_key"]
            isOneToOne: true
            referencedRelation: "producao_checklist"
            referencedColumns: ["key"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cep: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          sexo_biologico: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          cep?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          sexo_biologico?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          cep?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          sexo_biologico?: string | null
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
      propostas_empresa_medico: {
        Row: {
          admin_id: string | null
          aprovado_em: string | null
          created_at: string
          empresa_id: string
          especialidade_id: string | null
          id: string
          medico_id: string
          mensagem_empresa: string | null
          mensagem_medico: string | null
          observacao_admin: string | null
          plano_gerado_id: string | null
          qtd_atendimentos: number | null
          respondido_em: string | null
          status: Database["public"]["Enums"]["proposta_empresa_status"]
          taxa_plataforma_pct: number | null
          termo_empresa_aceito: boolean
          termo_empresa_versao: number | null
          termo_medico_aceito: boolean
          termo_medico_versao: number | null
          tipo_contrato: Database["public"]["Enums"]["proposta_tipo_contrato"]
          updated_at: string
          valor_ajustado_centavos: number | null
          valor_mensal_centavos: number
        }
        Insert: {
          admin_id?: string | null
          aprovado_em?: string | null
          created_at?: string
          empresa_id: string
          especialidade_id?: string | null
          id?: string
          medico_id: string
          mensagem_empresa?: string | null
          mensagem_medico?: string | null
          observacao_admin?: string | null
          plano_gerado_id?: string | null
          qtd_atendimentos?: number | null
          respondido_em?: string | null
          status?: Database["public"]["Enums"]["proposta_empresa_status"]
          taxa_plataforma_pct?: number | null
          termo_empresa_aceito?: boolean
          termo_empresa_versao?: number | null
          termo_medico_aceito?: boolean
          termo_medico_versao?: number | null
          tipo_contrato?: Database["public"]["Enums"]["proposta_tipo_contrato"]
          updated_at?: string
          valor_ajustado_centavos?: number | null
          valor_mensal_centavos: number
        }
        Update: {
          admin_id?: string | null
          aprovado_em?: string | null
          created_at?: string
          empresa_id?: string
          especialidade_id?: string | null
          id?: string
          medico_id?: string
          mensagem_empresa?: string | null
          mensagem_medico?: string | null
          observacao_admin?: string | null
          plano_gerado_id?: string | null
          qtd_atendimentos?: number | null
          respondido_em?: string | null
          status?: Database["public"]["Enums"]["proposta_empresa_status"]
          taxa_plataforma_pct?: number | null
          termo_empresa_aceito?: boolean
          termo_empresa_versao?: number | null
          termo_medico_aceito?: boolean
          termo_medico_versao?: number | null
          tipo_contrato?: Database["public"]["Enums"]["proposta_tipo_contrato"]
          updated_at?: string
          valor_ajustado_centavos?: number | null
          valor_mensal_centavos?: number
        }
        Relationships: [
          {
            foreignKeyName: "propostas_empresa_medico_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_empresa_medico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_empresa_medico_especialidade_id_fkey"
            columns: ["especialidade_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_empresa_medico_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_empresa_medico_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "propostas_empresa_medico_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
          {
            foreignKeyName: "propostas_empresa_medico_plano_gerado_id_fkey"
            columns: ["plano_gerado_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_members: {
        Row: {
          created_at: string
          queue_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          queue_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          queue_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_members_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "communication_queues"
            referencedColumns: ["id"]
          },
        ]
      }
      ranking_audit_log: {
        Row: {
          actor_id: string | null
          created_at: string
          detalhes: Json | null
          evento: string
          id: string
          medico_id: string
          posicao_anterior: number | null
          posicao_nova: number | null
          score_anterior: number | null
          score_novo: number | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detalhes?: Json | null
          evento: string
          id?: string
          medico_id: string
          posicao_anterior?: number | null
          posicao_nova?: number | null
          score_anterior?: number | null
          score_novo?: number | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detalhes?: Json | null
          evento?: string
          id?: string
          medico_id?: string
          posicao_anterior?: number | null
          posicao_nova?: number | null
          score_anterior?: number | null
          score_novo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ranking_audit_log_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_audit_log_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ranking_audit_log_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      ranking_config: {
        Row: {
          badge_check_interval_hours: number
          cpc_padrao_centavos: number
          creditos_taxa_conversao: number
          creditos_validade_dias: number
          id: string
          meta_bonus_pontos: number
          min_avaliacoes_exibir: number
          peso_atendimentos: number
          peso_avaliacao: number
          peso_conversao: number
          peso_no_show: number
          peso_premium: number
          peso_recencia: number
          peso_score_clinico: number
          peso_score_comercial: number
          peso_score_operacional: number
          peso_score_reputacional: number
          premium_bonus_ranking: number
          premium_max_no_show: number
          premium_min_atendimentos: number
          premium_min_avaliacao: number
          premium_min_meses_ativo: number
          recencia_dias_ativo: number
          recencia_dias_penalidade: number
          saldo_por_consulta: number
          streak_bonus_multiplicador: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          badge_check_interval_hours?: number
          cpc_padrao_centavos?: number
          creditos_taxa_conversao?: number
          creditos_validade_dias?: number
          id?: string
          meta_bonus_pontos?: number
          min_avaliacoes_exibir?: number
          peso_atendimentos?: number
          peso_avaliacao?: number
          peso_conversao?: number
          peso_no_show?: number
          peso_premium?: number
          peso_recencia?: number
          peso_score_clinico?: number
          peso_score_comercial?: number
          peso_score_operacional?: number
          peso_score_reputacional?: number
          premium_bonus_ranking?: number
          premium_max_no_show?: number
          premium_min_atendimentos?: number
          premium_min_avaliacao?: number
          premium_min_meses_ativo?: number
          recencia_dias_ativo?: number
          recencia_dias_penalidade?: number
          saldo_por_consulta?: number
          streak_bonus_multiplicador?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          badge_check_interval_hours?: number
          cpc_padrao_centavos?: number
          creditos_taxa_conversao?: number
          creditos_validade_dias?: number
          id?: string
          meta_bonus_pontos?: number
          min_avaliacoes_exibir?: number
          peso_atendimentos?: number
          peso_avaliacao?: number
          peso_conversao?: number
          peso_no_show?: number
          peso_premium?: number
          peso_recencia?: number
          peso_score_clinico?: number
          peso_score_comercial?: number
          peso_score_operacional?: number
          peso_score_reputacional?: number
          premium_bonus_ranking?: number
          premium_max_no_show?: number
          premium_min_atendimentos?: number
          premium_min_avaliacao?: number
          premium_min_meses_ativo?: number
          recencia_dias_ativo?: number
          recencia_dias_penalidade?: number
          saldo_por_consulta?: number
          streak_bonus_multiplicador?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      recomendacoes_ia: {
        Row: {
          created_at: string
          dados: Json | null
          descricao: string
          id: string
          lida: boolean
          medico_id: string
          prioridade: string
          tipo: string
          titulo: string
          valida_ate: string
        }
        Insert: {
          created_at?: string
          dados?: Json | null
          descricao: string
          id?: string
          lida?: boolean
          medico_id: string
          prioridade?: string
          tipo: string
          titulo: string
          valida_ate: string
        }
        Update: {
          created_at?: string
          dados?: Json | null
          descricao?: string
          id?: string
          lida?: boolean
          medico_id?: string
          prioridade?: string
          tipo?: string
          titulo?: string
          valida_ate?: string
        }
        Relationships: [
          {
            foreignKeyName: "recomendacoes_ia_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recomendacoes_ia_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recomendacoes_ia_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "reembolsos_consulta_id_fkey"
            columns: ["consulta_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "fk_retornos_consulta_origem"
            columns: ["consulta_origem_id"]
            isOneToOne: true
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_retornos_consulta_uso"
            columns: ["consulta_uso_id"]
            isOneToOne: false
            referencedRelation: "consultas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_retornos_especialidade"
            columns: ["especialidade_id"]
            isOneToOne: false
            referencedRelation: "especialidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_retornos_medico"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_retornos_medico"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_retornos_medico"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
          {
            foreignKeyName: "fk_retornos_paciente"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "saques_medicos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "medicos_publicos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saques_medicos_medico_id_fkey"
            columns: ["medico_id"]
            isOneToOne: false
            referencedRelation: "mv_medico_saldo"
            referencedColumns: ["medico_id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          created_at: string
          descricao: string | null
          detalhes: Json | null
          email: string | null
          id: string
          ip_address: string | null
          lida: boolean
          lida_em: string | null
          lida_por: string | null
          severidade: string
          tipo: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          detalhes?: Json | null
          email?: string | null
          id?: string
          ip_address?: string | null
          lida?: boolean
          lida_em?: string | null
          lida_por?: string | null
          severidade?: string
          tipo: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          detalhes?: Json | null
          email?: string | null
          id?: string
          ip_address?: string | null
          lida?: boolean
          lida_em?: string | null
          lida_por?: string | null
          severidade?: string
          tipo?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      termos_condicoes: {
        Row: {
          conteudo: string
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          status: string
          tipo: Database["public"]["Enums"]["termo_tipo"]
          titulo: string
          versao: number
        }
        Insert: {
          conteudo: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          status?: string
          tipo: Database["public"]["Enums"]["termo_tipo"]
          titulo: string
          versao?: number
        }
        Update: {
          conteudo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          status?: string
          tipo?: Database["public"]["Enums"]["termo_tipo"]
          titulo?: string
          versao?: number
        }
        Relationships: []
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
          obrigatorio: boolean
          ordem: number
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          obrigatorio?: boolean
          ordem?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          obrigatorio?: boolean
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
      user_terms_acceptance: {
        Row: {
          aceito_em: string
          id: string
          ip_address: string | null
          termo_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          aceito_em?: string
          id?: string
          ip_address?: string | null
          termo_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          aceito_em?: string
          id?: string
          ip_address?: string | null
          termo_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_terms_acceptance_termo_id_fkey"
            columns: ["termo_id"]
            isOneToOne: false
            referencedRelation: "termos_condicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_envio_metricas: {
        Row: {
          custo_estimado: number
          data: string
          entregues: number
          falhas: number
          id: string
          lidas: number
          mock_sent: number
          por_template: Json
          total_enviadas: number
          updated_at: string
        }
        Insert: {
          custo_estimado?: number
          data: string
          entregues?: number
          falhas?: number
          id?: string
          lidas?: number
          mock_sent?: number
          por_template?: Json
          total_enviadas?: number
          updated_at?: string
        }
        Update: {
          custo_estimado?: number
          data?: string
          entregues?: number
          falhas?: number
          id?: string
          lidas?: number
          mock_sent?: number
          por_template?: Json
          total_enviadas?: number
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          ai_active: boolean
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
          tenant_id: string | null
          tipo: Database["public"]["Enums"]["whatsapp_instance_tipo"]
          ultima_sincronizacao: string | null
          updated_at: string
          webhook_status: string | null
        }
        Insert: {
          ai_active?: boolean
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
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["whatsapp_instance_tipo"]
          ultima_sincronizacao?: string | null
          updated_at?: string
          webhook_status?: string | null
        }
        Update: {
          ai_active?: boolean
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
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["whatsapp_instance_tipo"]
          ultima_sincronizacao?: string | null
          updated_at?: string
          webhook_status?: string | null
        }
        Relationships: []
      }
      whatsapp_template_logs: {
        Row: {
          conversation_id: string | null
          created_at: string
          enviado_por: string | null
          erro: string | null
          id: string
          payload: Json
          provider_response: Json | null
          status: string
          telefone: string
          template_id: string | null
          template_name: string
          wa_message_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          enviado_por?: string | null
          erro?: string | null
          id?: string
          payload?: Json
          provider_response?: Json | null
          status: string
          telefone: string
          template_id?: string | null
          template_name: string
          wa_message_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          enviado_por?: string | null
          erro?: string | null
          id?: string
          payload?: Json
          provider_response?: Json | null
          status?: string
          telefone?: string
          template_id?: string | null
          template_name?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_template_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_template_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_webhook_log: {
        Row: {
          error: string | null
          http_status: number | null
          id: string
          payload: Json
          processed_count: number
          received_at: string
          signature_valid: boolean | null
          wamid_processed: string[]
        }
        Insert: {
          error?: string | null
          http_status?: number | null
          id?: string
          payload: Json
          processed_count?: number
          received_at?: string
          signature_valid?: boolean | null
          wamid_processed?: string[]
        }
        Update: {
          error?: string | null
          http_status?: number | null
          id?: string
          payload?: Json
          processed_count?: number
          received_at?: string
          signature_valid?: boolean | null
          wamid_processed?: string[]
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
      medicos_publicos: {
        Row: {
          avaliacao_media: number | null
          bio: string | null
          created_at: string | null
          crm: string | null
          especialidade: string | null
          fator_premium: number | null
          foto_url: string | null
          id: string | null
          link_sala_padrao: string | null
          nome: string | null
          online: boolean | null
          ranking_score: number | null
          taxa_no_show: number | null
          total_avaliacoes: number | null
          tratamento: string | null
        }
        Relationships: []
      }
      mv_medico_saldo: {
        Row: {
          atualizado_em: string | null
          disponivel_cents: number | null
          medico_id: string | null
          pendente_cents: number | null
          retido_cents: number | null
          sacado_cents: number | null
          total_movimentos: number | null
        }
        Relationships: []
      }
      servicos_publicos: {
        Row: {
          ativo: boolean | null
          descricao_publica: string | null
          duracao_min: number | null
          id: string | null
          nome: string | null
          prioridade: number | null
          slug: string | null
          tipo: Database["public"]["Enums"]["servico_financeiro_tipo"] | null
          valor_paciente_centavos: number | null
        }
        Insert: {
          ativo?: boolean | null
          descricao_publica?: string | null
          duracao_min?: number | null
          id?: string | null
          nome?: string | null
          prioridade?: number | null
          slug?: string | null
          tipo?: Database["public"]["Enums"]["servico_financeiro_tipo"] | null
          valor_paciente_centavos?: number | null
        }
        Update: {
          ativo?: boolean | null
          descricao_publica?: string | null
          duracao_min?: number | null
          id?: string | null
          nome?: string | null
          prioridade?: number | null
          slug?: string | null
          tipo?: Database["public"]["Enums"]["servico_financeiro_tipo"] | null
          valor_paciente_centavos?: number | null
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
      _test_exec_sql: { Args: { q: string }; Returns: Json }
      _test_purge_medico: { Args: { p_medico_id: string }; Returns: undefined }
      _test_try_delete_movimento: {
        Args: { p_medico_id: string }
        Returns: boolean
      }
      _test_try_update_movimento: {
        Args: { p_medico_id: string }
        Returns: boolean
      }
      admin_agendamentos_overview: {
        Args: { _data?: string; _periodo?: string }
        Returns: Json
      }
      admin_consulta_cancelar: {
        Args: { _consulta_id: string; _motivo: string }
        Returns: undefined
      }
      admin_consulta_forcar_confirmacao: {
        Args: { _consulta_id: string; _motivo: string }
        Returns: undefined
      }
      admin_consulta_marcar_realizada: {
        Args: { _consulta_id: string; _observacao?: string }
        Returns: undefined
      }
      admin_consulta_reenviar_link: {
        Args: { _consulta_id: string }
        Returns: undefined
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
      ai_avatar_assumir_conversa: {
        Args: { _conversation_id: string }
        Returns: {
          ai_active: boolean
          ai_avatar_blocked: boolean
          ai_avatar_blocked_at: string | null
          ai_avatar_blocked_by: string | null
          ai_avatar_blocked_motivo: string | null
          ai_avatar_consecutive_replies: number
          ai_avatar_last_reply_at: string | null
          ai_avatar_paused_until: string | null
          assigned_sector: string | null
          assigned_to: string | null
          bot_active: boolean
          bot_handoff_at: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          closed_at: string | null
          closed_by: string | null
          consulta_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          department_id: string | null
          empresa_id: string | null
          first_response_at: string | null
          id: string
          intent: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          locked_at: string | null
          locked_by: string | null
          medico_id: string | null
          origin: Database["public"]["Enums"]["conversation_origin"]
          paciente_ativo_id: string | null
          patient_id: string | null
          priority: Database["public"]["Enums"]["conversation_priority"]
          queue_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[]
          unread_count: number
          updated_at: string
          whatsapp_instance_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ai_avatar_kill_switch: {
        Args: { _motivo?: string; _on: boolean }
        Returns: {
          active: boolean
          avatar_confianca_minima: Database["public"]["Enums"]["ai_avatar_confianca"]
          avatar_cooldown_segundos: number
          avatar_horario_fim: string | null
          avatar_horario_inicio: string | null
          avatar_kill_switch: boolean
          avatar_kill_switch_at: string | null
          avatar_kill_switch_by: string | null
          avatar_kill_switch_motivo: string | null
          avatar_max_msgs_paciente_dia: number
          avatar_max_respostas_consecutivas: number
          avatar_modo: Database["public"]["Enums"]["ai_avatar_modo"]
          avatar_profile_id: string | null
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
          sugestao_medicos_ativa: boolean
          sugestao_prioridade: Json
          temperature: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "ai_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ai_avatar_pausar_conversa: {
        Args: { _conversation_id: string; _minutos?: number; _motivo?: string }
        Returns: {
          ai_active: boolean
          ai_avatar_blocked: boolean
          ai_avatar_blocked_at: string | null
          ai_avatar_blocked_by: string | null
          ai_avatar_blocked_motivo: string | null
          ai_avatar_consecutive_replies: number
          ai_avatar_last_reply_at: string | null
          ai_avatar_paused_until: string | null
          assigned_sector: string | null
          assigned_to: string | null
          bot_active: boolean
          bot_handoff_at: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          closed_at: string | null
          closed_by: string | null
          consulta_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          department_id: string | null
          empresa_id: string | null
          first_response_at: string | null
          id: string
          intent: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          locked_at: string | null
          locked_by: string | null
          medico_id: string | null
          origin: Database["public"]["Enums"]["conversation_origin"]
          paciente_ativo_id: string | null
          patient_id: string | null
          priority: Database["public"]["Enums"]["conversation_priority"]
          queue_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[]
          unread_count: number
          updated_at: string
          whatsapp_instance_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ai_avatar_should_reply: {
        Args: { _conversation_id: string }
        Returns: Json
      }
      alterar_status_conta_paciente:
        | {
            Args: {
              _motivo: string
              _novo_status: Database["public"]["Enums"]["status_conta_paciente"]
              _observacao?: string
              _paciente_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              _bloqueado_ate?: string
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
      aplicar_restricao_medico: {
        Args: {
          p_ativo: boolean
          p_medico_id: string
          p_motivo?: string
          p_tipo: string
        }
        Returns: undefined
      }
      assumir_conversa: {
        Args: { p_conversation_id: string }
        Returns: {
          ai_active: boolean
          ai_avatar_blocked: boolean
          ai_avatar_blocked_at: string | null
          ai_avatar_blocked_by: string | null
          ai_avatar_blocked_motivo: string | null
          ai_avatar_consecutive_replies: number
          ai_avatar_last_reply_at: string | null
          ai_avatar_paused_until: string | null
          assigned_sector: string | null
          assigned_to: string | null
          bot_active: boolean
          bot_handoff_at: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          closed_at: string | null
          closed_by: string | null
          consulta_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          department_id: string | null
          empresa_id: string | null
          first_response_at: string | null
          id: string
          intent: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          locked_at: string | null
          locked_by: string | null
          medico_id: string | null
          origin: Database["public"]["Enums"]["conversation_origin"]
          paciente_ativo_id: string | null
          patient_id: string | null
          priority: Database["public"]["Enums"]["conversation_priority"]
          queue_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[]
          unread_count: number
          updated_at: string
          whatsapp_instance_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ativar_premium_conquistado: { Args: never; Returns: boolean }
      auditoria_dashboard: {
        Args: { p_fim?: string; p_inicio?: string }
        Returns: Json
      }
      auditoria_listar:
        | {
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
        | {
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
      calcular_nivel_medico: {
        Args: { p_total_pontos: number }
        Returns: {
          nivel: number
          nivel_nome: string
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
      calcular_score_medico: {
        Args: { p_medico_id: string }
        Returns: undefined
      }
      claim_conversation: {
        Args: { p_conversation_id: string }
        Returns: {
          ai_active: boolean
          ai_avatar_blocked: boolean
          ai_avatar_blocked_at: string | null
          ai_avatar_blocked_by: string | null
          ai_avatar_blocked_motivo: string | null
          ai_avatar_consecutive_replies: number
          ai_avatar_last_reply_at: string | null
          ai_avatar_paused_until: string | null
          assigned_sector: string | null
          assigned_to: string | null
          bot_active: boolean
          bot_handoff_at: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          closed_at: string | null
          closed_by: string | null
          consulta_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          department_id: string | null
          empresa_id: string | null
          first_response_at: string | null
          id: string
          intent: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          locked_at: string | null
          locked_by: string | null
          medico_id: string | null
          origin: Database["public"]["Enums"]["conversation_origin"]
          paciente_ativo_id: string | null
          patient_id: string | null
          priority: Database["public"]["Enums"]["conversation_priority"]
          queue_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[]
          unread_count: number
          updated_at: string
          whatsapp_instance_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
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
      coletar_metricas_medico: { Args: { p_medico_id: string }; Returns: Json }
      confirmar_vinculo_paciente: {
        Args: { p_link_id: string }
        Returns: {
          confirmado_em: string | null
          confirmado_por: string | null
          conversation_id: string
          created_at: string
          id: string
          observacao: string | null
          origem: string
          paciente_id: string
          parentesco: string | null
          removido_em: string | null
          updated_at: string
          vinculado_em: string
          vinculado_por: string | null
        }
        SetofOptions: {
          from: "*"
          to: "conversation_pacientes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      consultas_pendentes_avaliacao: {
        Args: never
        Returns: {
          concluida_em: string
          consulta_id: string
          especialidade_nome: string
          medico_id: string
          medico_nome: string
          paciente_id: string
        }[]
      }
      cpf_valido: { Args: { _cpf: string }; Returns: boolean }
      create_conversation_for_consulta: {
        Args: { _consulta_id: string }
        Returns: string
      }
      criar_consulta_pos_pagamento: {
        Args: { _pagamento_id: string }
        Returns: Json
      }
      definir_paciente_ativo_conversa: {
        Args: { p_conversation_id: string; p_paciente_id: string }
        Returns: {
          ai_active: boolean
          ai_avatar_blocked: boolean
          ai_avatar_blocked_at: string | null
          ai_avatar_blocked_by: string | null
          ai_avatar_blocked_motivo: string | null
          ai_avatar_consecutive_replies: number
          ai_avatar_last_reply_at: string | null
          ai_avatar_paused_until: string | null
          assigned_sector: string | null
          assigned_to: string | null
          bot_active: boolean
          bot_handoff_at: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          closed_at: string | null
          closed_by: string | null
          consulta_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          department_id: string | null
          empresa_id: string | null
          first_response_at: string | null
          id: string
          intent: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          locked_at: string | null
          locked_by: string | null
          medico_id: string | null
          origin: Database["public"]["Enums"]["conversation_origin"]
          paciente_ativo_id: string | null
          patient_id: string | null
          priority: Database["public"]["Enums"]["conversation_priority"]
          queue_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[]
          unread_count: number
          updated_at: string
          whatsapp_instance_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dispensar_avaliacao_consulta: {
        Args: { p_consulta_id: string }
        Returns: boolean
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
        Args: { _motivo?: string; _pagamento_id: string }
        Returns: undefined
      }
      financeiro_pagamento_confirmar:
        | { Args: { _pagamento_id: string }; Returns: undefined }
        | {
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
      fn_backfill_financeiro: {
        Args: { p_dry_run?: boolean; p_medico_id?: string }
        Returns: Json
      }
      fn_backfill_financeiro_dry_run: {
        Args: { p_medico_id?: string }
        Returns: Json
      }
      fn_finmov_alert_silent: {
        Args: { p_medico: string; p_meta?: Json; p_msg: string; p_tipo: string }
        Returns: undefined
      }
      fn_finmov_hash: {
        Args: { p_hash_anterior: string; p_payload: Json }
        Returns: string
      }
      fn_medico_saldo_real: {
        Args: { p_medico_id: string }
        Returns: {
          disponivel_cents: number
          pendente_cents: number
          retido_cents: number
          sacado_cents: number
          total_movimentos: number
          ultimo_movimento_em: string
        }[]
      }
      fn_pa_confirmar_reserva: { Args: { _slot_id: string }; Returns: Json }
      fn_pa_reservar_slot: { Args: { _slot_inicio: string }; Returns: Json }
      fn_pa_slots_disponiveis: {
        Args: { _data?: string }
        Returns: {
          fim: string
          inicio: string
          medico_id: string
          modalidade: string
          slot_id: string
          total_vagas: number
        }[]
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
      fn_reconciliar_saldo_medico: {
        Args: { p_medico_id: string }
        Returns: Json
      }
      fn_registrar_movimento_idempotente: {
        Args: { p_key: string; p_payload: Json; p_scope: string }
        Returns: Json
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
      fn_servico_confirmar_reserva: {
        Args: { _servico_id: string; _slot_id: string }
        Returns: Json
      }
      fn_servico_slots_disponiveis: {
        Args: { _data: string; _servico_id: string }
        Returns: {
          fim: string
          inicio: string
          medico_id: string
          modalidade: string
          slot_id: string
          total_vagas: number
        }[]
      }
      fn_validar_hash_chain: {
        Args: { p_limit?: number; p_medico_id: string }
        Returns: boolean
      }
      forcar_status_consulta: {
        Args: {
          _consulta_id: string
          _motivo: string
          _novo_status: Database["public"]["Enums"]["consulta_status"]
        }
        Returns: undefined
      }
      get_empresa_id_do_usuario: { Args: { _user_id: string }; Returns: string }
      get_meta_window_state: {
        Args: { p_conversation_id: string }
        Returns: Json
      }
      get_titular_paciente_id: { Args: never; Returns: string }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
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
      inbox_increment_unread: {
        Args: { p_conversation_id: string; p_preview: string }
        Returns: undefined
      }
      inbox_set_first_response: {
        Args: { p_conversation_id: string }
        Returns: undefined
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
      is_thread_participant: {
        Args: { _thread_id: string; _user_id: string }
        Returns: boolean
      }
      is_titular_do_paciente: {
        Args: { _paciente_id: string }
        Returns: boolean
      }
      liberar_conversa: {
        Args: { p_conversation_id: string }
        Returns: {
          ai_active: boolean
          ai_avatar_blocked: boolean
          ai_avatar_blocked_at: string | null
          ai_avatar_blocked_by: string | null
          ai_avatar_blocked_motivo: string | null
          ai_avatar_consecutive_replies: number
          ai_avatar_last_reply_at: string | null
          ai_avatar_paused_until: string | null
          assigned_sector: string | null
          assigned_to: string | null
          bot_active: boolean
          bot_handoff_at: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          closed_at: string | null
          closed_by: string | null
          consulta_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          department_id: string | null
          empresa_id: string | null
          first_response_at: string | null
          id: string
          intent: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          locked_at: string | null
          locked_by: string | null
          medico_id: string | null
          origin: Database["public"]["Enums"]["conversation_origin"]
          paciente_ativo_id: string | null
          patient_id: string | null
          priority: Database["public"]["Enums"]["conversation_priority"]
          queue_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[]
          unread_count: number
          updated_at: string
          whatsapp_instance_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
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
        Args: { _motivo?: string; _provider_session_id: string }
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
        Returns: undefined
      }
      medico_bloquear: {
        Args: { _id: string; _motivo: string; _observacao?: string }
        Returns: undefined
      }
      medico_colocar_em_analise: {
        Args: { _id: string; _observacao?: string }
        Returns: undefined
      }
      medico_reativar: {
        Args: { _id: string; _justificativa: string }
        Returns: undefined
      }
      medico_reprovar: {
        Args: { _id: string; _motivo: string; _observacao?: string }
        Returns: undefined
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
        Returns: undefined
      }
      medico_tem_consulta_com_paciente: {
        Args: { _medico_user_id: string; _paciente_id: string }
        Returns: boolean
      }
      observabilidade_log: {
        Args: {
          _conversation_id?: string
          _evento: string
          _metadata?: Json
          _modulo: string
          _severity?: Database["public"]["Enums"]["severity_evento"]
        }
        Returns: string
      }
      observabilidade_purge: { Args: never; Returns: number }
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
      plano_pertence_medico: { Args: { _plano_id: string }; Returns: boolean }
      plano_saude_financeira: { Args: { _plano_id: string }; Returns: Json }
      pode_criar_assinatura_paciente: {
        Args: { _paciente_id: string; _plano_id: string; _user_id: string }
        Returns: boolean
      }
      processar_pagamento_confirmado: {
        Args: {
          _metodo: Database["public"]["Enums"]["pagamento_metodo"]
          _payload: Json
          _provider_payment_id: string
          _provider_session_id: string
        }
        Returns: Json
      }
      producao_ativar: {
        Args: { _modo: Database["public"]["Enums"]["whatsapp_modo"] }
        Returns: Json
      }
      producao_pode_ativar: { Args: never; Returns: Json }
      promote_to_admin: { Args: { _email: string }; Returns: Json }
      recalcular_ranking_medico: {
        Args: { p_medico_id: string }
        Returns: undefined
      }
      recalcular_ranking_todos: { Args: never; Returns: undefined }
      recalcular_scores_todos: { Args: never; Returns: undefined }
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
      registrar_conversao_impulsionamento: {
        Args: {
          p_campanha_id: string
          p_clique_id?: string
          p_consulta_id: string
          p_medico_id: string
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
      relatorios_financeiro:
        | { Args: { p_fim?: string; p_inicio?: string }; Returns: Json }
        | {
            Args: {
              p_empresa_id?: string
              p_fim: string
              p_inicio: string
              p_medico_id?: string
            }
            Returns: Json
          }
      relatorios_financeiro_snapshot: {
        Args: { p_compare_mode?: string; p_fim?: string; p_inicio?: string }
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
      reservar_slot_unificado: {
        Args: {
          _cep?: string
          _cpf?: string
          _data_nascimento?: string
          _motivo?: string
          _nome_completo?: string
          _referencia_id: string
          _sexo?: string
          _slot_id: string
          _telefone?: string
          _tipo: string
        }
        Returns: Json
      }
      resolver_conversa: {
        Args: { p_conversation_id: string }
        Returns: {
          ai_active: boolean
          ai_avatar_blocked: boolean
          ai_avatar_blocked_at: string | null
          ai_avatar_blocked_by: string | null
          ai_avatar_blocked_motivo: string | null
          ai_avatar_consecutive_replies: number
          ai_avatar_last_reply_at: string | null
          ai_avatar_paused_until: string | null
          assigned_sector: string | null
          assigned_to: string | null
          bot_active: boolean
          bot_handoff_at: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          closed_at: string | null
          closed_by: string | null
          consulta_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          department_id: string | null
          empresa_id: string | null
          first_response_at: string | null
          id: string
          intent: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          locked_at: string | null
          locked_by: string | null
          medico_id: string | null
          origin: Database["public"]["Enums"]["conversation_origin"]
          paciente_ativo_id: string | null
          patient_id: string | null
          priority: Database["public"]["Enums"]["conversation_priority"]
          queue_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[]
          unread_count: number
          updated_at: string
          whatsapp_instance_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      security_generate_alerts: { Args: never; Returns: Json }
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
      set_conversation_queue: {
        Args: { p_conversation_id: string; p_queue_id: string }
        Returns: {
          ai_active: boolean
          ai_avatar_blocked: boolean
          ai_avatar_blocked_at: string | null
          ai_avatar_blocked_by: string | null
          ai_avatar_blocked_motivo: string | null
          ai_avatar_consecutive_replies: number
          ai_avatar_last_reply_at: string | null
          ai_avatar_paused_until: string | null
          assigned_sector: string | null
          assigned_to: string | null
          bot_active: boolean
          bot_handoff_at: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          closed_at: string | null
          closed_by: string | null
          consulta_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          department_id: string | null
          empresa_id: string | null
          first_response_at: string | null
          id: string
          intent: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          locked_at: string | null
          locked_by: string | null
          medico_id: string | null
          origin: Database["public"]["Enums"]["conversation_origin"]
          paciente_ativo_id: string | null
          patient_id: string | null
          priority: Database["public"]["Enums"]["conversation_priority"]
          queue_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[]
          unread_count: number
          updated_at: string
          whatsapp_instance_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_force_status_transition: {
        Args: { _motivo: string }
        Returns: undefined
      }
      set_typing: {
        Args: { p_conversation_id: string; p_is_typing: boolean }
        Returns: undefined
      }
      transferir_conversa: {
        Args: {
          p_conversation_id: string
          p_reason?: string
          p_to_sector?: string
          p_to_user_id?: string
        }
        Returns: {
          ai_active: boolean
          ai_avatar_blocked: boolean
          ai_avatar_blocked_at: string | null
          ai_avatar_blocked_by: string | null
          ai_avatar_blocked_motivo: string | null
          ai_avatar_consecutive_replies: number
          ai_avatar_last_reply_at: string | null
          ai_avatar_paused_until: string | null
          assigned_sector: string | null
          assigned_to: string | null
          bot_active: boolean
          bot_handoff_at: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          closed_at: string | null
          closed_by: string | null
          consulta_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          department_id: string | null
          empresa_id: string | null
          first_response_at: string | null
          id: string
          intent: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          locked_at: string | null
          locked_by: string | null
          medico_id: string | null
          origin: Database["public"]["Enums"]["conversation_origin"]
          paciente_ativo_id: string | null
          patient_id: string | null
          priority: Database["public"]["Enums"]["conversation_priority"]
          queue_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[]
          unread_count: number
          updated_at: string
          whatsapp_instance_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      trocar_medico_consulta: {
        Args: { _consulta_id: string; _motivo?: string; _novo_slot_id: string }
        Returns: Json
      }
      update_attendant_presence: {
        Args: { p_current_conversation_id?: string; p_status: string }
        Returns: {
          current_conversation_id: string | null
          last_seen_at: string
          status: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "attendant_presence"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_conversation_priority: {
        Args: {
          p_conversation_id: string
          p_priority: Database["public"]["Enums"]["conversation_priority"]
        }
        Returns: {
          ai_active: boolean
          ai_avatar_blocked: boolean
          ai_avatar_blocked_at: string | null
          ai_avatar_blocked_by: string | null
          ai_avatar_blocked_motivo: string | null
          ai_avatar_consecutive_replies: number
          ai_avatar_last_reply_at: string | null
          ai_avatar_paused_until: string | null
          assigned_sector: string | null
          assigned_to: string | null
          bot_active: boolean
          bot_handoff_at: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          closed_at: string | null
          closed_by: string | null
          consulta_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          department_id: string | null
          empresa_id: string | null
          first_response_at: string | null
          id: string
          intent: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          locked_at: string | null
          locked_by: string | null
          medico_id: string | null
          origin: Database["public"]["Enums"]["conversation_origin"]
          paciente_ativo_id: string | null
          patient_id: string | null
          priority: Database["public"]["Enums"]["conversation_priority"]
          queue_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[]
          unread_count: number
          updated_at: string
          whatsapp_instance_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_conversation_status: {
        Args: {
          p_conversation_id: string
          p_status: Database["public"]["Enums"]["conversation_status"]
        }
        Returns: {
          ai_active: boolean
          ai_avatar_blocked: boolean
          ai_avatar_blocked_at: string | null
          ai_avatar_blocked_by: string | null
          ai_avatar_blocked_motivo: string | null
          ai_avatar_consecutive_replies: number
          ai_avatar_last_reply_at: string | null
          ai_avatar_paused_until: string | null
          assigned_sector: string | null
          assigned_to: string | null
          bot_active: boolean
          bot_handoff_at: string | null
          channel: Database["public"]["Enums"]["conversation_channel"]
          closed_at: string | null
          closed_by: string | null
          consulta_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          department_id: string | null
          empresa_id: string | null
          first_response_at: string | null
          id: string
          intent: string | null
          last_message_at: string | null
          last_message_preview: string | null
          lead_id: string | null
          locked_at: string | null
          locked_by: string | null
          medico_id: string | null
          origin: Database["public"]["Enums"]["conversation_origin"]
          paciente_ativo_id: string | null
          patient_id: string | null
          priority: Database["public"]["Enums"]["conversation_priority"]
          queue_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          sla_due_at: string | null
          status: Database["public"]["Enums"]["conversation_status"]
          tags: string[]
          unread_count: number
          updated_at: string
          whatsapp_instance_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "conversations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_can_view_conversation: {
        Args: { _conv_id: string }
        Returns: boolean
      }
      validar_e_aplicar_cupom: {
        Args: { _codigo: string; _pagamento_id: string }
        Returns: Json
      }
      verificar_premium_conquistado: {
        Args: { p_medico_id: string }
        Returns: boolean
      }
      vincular_paciente_conversa: {
        Args: {
          p_conversation_id: string
          p_origem?: string
          p_paciente_id: string
          p_parentesco?: string
        }
        Returns: {
          confirmado_em: string | null
          confirmado_por: string | null
          conversation_id: string
          created_at: string
          id: string
          observacao: string | null
          origem: string
          paciente_id: string
          parentesco: string | null
          removido_em: string | null
          updated_at: string
          vinculado_em: string
          vinculado_por: string | null
        }
        SetofOptions: {
          from: "*"
          to: "conversation_pacientes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      ai_avatar_confianca: "critica" | "baixa" | "media" | "alta"
      ai_avatar_memory_type:
        | "preferencia"
        | "contexto"
        | "historico_operacional"
        | "observacao"
        | "pendencia"
      ai_avatar_modo: "assistido" | "semi_autonomo" | "autonomo_controlado"
      ai_avatar_risco: "nenhum" | "baixo" | "medio" | "alto" | "critico"
      ai_blocked_categoria:
        | "diagnostico"
        | "prescricao"
        | "dosagem"
        | "laudo"
        | "exame"
        | "atestado"
        | "urgencia_medica"
        | "conduta_clinica"
        | "aconselhamento_clinico"
        | "interpretacao"
      ai_handoff_level: "urgente" | "moderado" | "baixo"
      ai_handoff_motivo:
        | "baixa_confianca"
        | "topico_clinico"
        | "urgencia"
        | "crise_emocional"
        | "risco_juridico"
        | "paciente_irritado"
        | "solicitacao_humano"
        | "timeout_provider"
        | "erro_provider"
        | "rate_limit"
        | "anti_loop"
        | "manual"
        | "outro"
      ai_provider: "lovable" | "openai" | "anthropic" | "gemini" | "outro"
      alerta_ia_severidade: "info" | "atencao" | "alerta" | "critico"
      alerta_ia_status:
        | "novo"
        | "visto"
        | "em_acompanhamento"
        | "resolvido"
        | "ignorado"
      alerta_ia_tipo:
        | "queda_pontualidade"
        | "aumento_reclamacoes"
        | "excesso_retrabalho"
        | "correcoes_receita"
        | "crescimento_suspeito_avaliacoes"
        | "conversoes_incompativeis"
        | "comportamento_fora_padrao"
        | "queda_atividade"
        | "risco_churn"
        | "possivel_manipulacao"
        | "abuso_campanha"
        | "no_show_recorrente"
        | "conflito_operacional"
        | "anomalia_generica"
      anomalia_status:
        | "detectada"
        | "investigando"
        | "confirmada"
        | "descartada"
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
        | "pa_publico"
        | "servico_plataforma"
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
        | "aguardando_paciente"
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
        | "prescricao"
        | "atestado"
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
      internal_thread_origem:
        | "Secretaria ↔ Médico"
        | "Secretaria ↔ Admin"
        | "Empresa ↔ Secretaria"
        | "Médico ↔ Admin"
        | "sistema"
      internal_thread_prioridade: "baixa" | "normal" | "alta"
      internal_thread_status: "aberta" | "respondida" | "resolvida"
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
      nivel_risco: "baixo" | "medio" | "alto" | "critico"
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
      politica_reembolso_acao: "total" | "parcial" | "zero"
      politica_reembolso_escopo: "global" | "medico"
      politica_reembolso_situacao:
        | "cancelamento_antecipado"
        | "cancelamento_tardio"
        | "medico_no_show"
        | "sem_inicio_finalizacao"
      proposta_empresa_status:
        | "criada"
        | "em_analise"
        | "aprovada_admin"
        | "enviada_medico"
        | "aceita"
        | "recusada"
        | "convertida"
        | "cancelada"
      proposta_tipo_contrato: "mensal" | "pacote" | "recorrente"
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
      severity_evento: "info" | "warn" | "error" | "critical"
      sexo_biologico: "feminino" | "masculino" | "intersexo" | "nao_informado"
      slot_status: "disponivel" | "reservado" | "bloqueado"
      status_colaborador:
        | "ativo"
        | "pendente_convite"
        | "suspenso"
        | "bloqueado"
        | "removido"
      status_conta_paciente:
        | "ativo"
        | "suspenso"
        | "bloqueado"
        | "banido"
        | "pendente"
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
      termo_tipo:
        | "consulta_paciente"
        | "privacidade"
        | "plano_plataforma"
        | "plano_medico"
        | "contrato_medico"
        | "gamificacao_premium"
        | "criacao_plano_medico"
        | "uso_feegow"
        | "proposta_empresa"
        | "proposta_medico"
        | "cancelamento_reembolso"
      tipo_conta_bancaria: "corrente" | "poupanca"
      tipo_paciente: "titular" | "dependente"
      tipo_pessoa: "pf" | "pj"
      waba_health_status:
        | "ok"
        | "degraded"
        | "down"
        | "pending_credentials"
        | "unknown"
      whatsapp_instance_status:
        | "conectado"
        | "desconectado"
        | "pendente"
        | "erro"
      whatsapp_instance_tipo: "comercial" | "operacional" | "suporte"
      whatsapp_modo: "sandbox" | "staging" | "producao"
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
      ai_avatar_confianca: ["critica", "baixa", "media", "alta"],
      ai_avatar_memory_type: [
        "preferencia",
        "contexto",
        "historico_operacional",
        "observacao",
        "pendencia",
      ],
      ai_avatar_modo: ["assistido", "semi_autonomo", "autonomo_controlado"],
      ai_avatar_risco: ["nenhum", "baixo", "medio", "alto", "critico"],
      ai_blocked_categoria: [
        "diagnostico",
        "prescricao",
        "dosagem",
        "laudo",
        "exame",
        "atestado",
        "urgencia_medica",
        "conduta_clinica",
        "aconselhamento_clinico",
        "interpretacao",
      ],
      ai_handoff_level: ["urgente", "moderado", "baixo"],
      ai_handoff_motivo: [
        "baixa_confianca",
        "topico_clinico",
        "urgencia",
        "crise_emocional",
        "risco_juridico",
        "paciente_irritado",
        "solicitacao_humano",
        "timeout_provider",
        "erro_provider",
        "rate_limit",
        "anti_loop",
        "manual",
        "outro",
      ],
      ai_provider: ["lovable", "openai", "anthropic", "gemini", "outro"],
      alerta_ia_severidade: ["info", "atencao", "alerta", "critico"],
      alerta_ia_status: [
        "novo",
        "visto",
        "em_acompanhamento",
        "resolvido",
        "ignorado",
      ],
      alerta_ia_tipo: [
        "queda_pontualidade",
        "aumento_reclamacoes",
        "excesso_retrabalho",
        "correcoes_receita",
        "crescimento_suspeito_avaliacoes",
        "conversoes_incompativeis",
        "comportamento_fora_padrao",
        "queda_atividade",
        "risco_churn",
        "possivel_manipulacao",
        "abuso_campanha",
        "no_show_recorrente",
        "conflito_operacional",
        "anomalia_generica",
      ],
      anomalia_status: [
        "detectada",
        "investigando",
        "confirmada",
        "descartada",
      ],
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
        "pa_publico",
        "servico_plataforma",
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
        "aguardando_paciente",
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
        "prescricao",
        "atestado",
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
      internal_thread_origem: [
        "Secretaria ↔ Médico",
        "Secretaria ↔ Admin",
        "Empresa ↔ Secretaria",
        "Médico ↔ Admin",
        "sistema",
      ],
      internal_thread_prioridade: ["baixa", "normal", "alta"],
      internal_thread_status: ["aberta", "respondida", "resolvida"],
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
      nivel_risco: ["baixo", "medio", "alto", "critico"],
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
      politica_reembolso_acao: ["total", "parcial", "zero"],
      politica_reembolso_escopo: ["global", "medico"],
      politica_reembolso_situacao: [
        "cancelamento_antecipado",
        "cancelamento_tardio",
        "medico_no_show",
        "sem_inicio_finalizacao",
      ],
      proposta_empresa_status: [
        "criada",
        "em_analise",
        "aprovada_admin",
        "enviada_medico",
        "aceita",
        "recusada",
        "convertida",
        "cancelada",
      ],
      proposta_tipo_contrato: ["mensal", "pacote", "recorrente"],
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
      severity_evento: ["info", "warn", "error", "critical"],
      sexo_biologico: ["feminino", "masculino", "intersexo", "nao_informado"],
      slot_status: ["disponivel", "reservado", "bloqueado"],
      status_colaborador: [
        "ativo",
        "pendente_convite",
        "suspenso",
        "bloqueado",
        "removido",
      ],
      status_conta_paciente: [
        "ativo",
        "suspenso",
        "bloqueado",
        "banido",
        "pendente",
      ],
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
      termo_tipo: [
        "consulta_paciente",
        "privacidade",
        "plano_plataforma",
        "plano_medico",
        "contrato_medico",
        "gamificacao_premium",
        "criacao_plano_medico",
        "uso_feegow",
        "proposta_empresa",
        "proposta_medico",
        "cancelamento_reembolso",
      ],
      tipo_conta_bancaria: ["corrente", "poupanca"],
      tipo_paciente: ["titular", "dependente"],
      tipo_pessoa: ["pf", "pj"],
      waba_health_status: [
        "ok",
        "degraded",
        "down",
        "pending_credentials",
        "unknown",
      ],
      whatsapp_instance_status: [
        "conectado",
        "desconectado",
        "pendente",
        "erro",
      ],
      whatsapp_instance_tipo: ["comercial", "operacional", "suporte"],
      whatsapp_modo: ["sandbox", "staging", "producao"],
    },
  },
} as const
