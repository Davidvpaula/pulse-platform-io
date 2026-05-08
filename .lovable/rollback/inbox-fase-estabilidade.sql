-- ============================================================
-- ROLLBACK: Inbox Fase Estabilidade — Etapa A
-- Executar EM ORDEM se for preciso reverter a migração.
-- ============================================================

BEGIN;

-- 1) Triggers
DROP TRIGGER IF EXISTS trg_messages_update_window ON public.messages;
DROP TRIGGER IF EXISTS trg_conversations_audit_lock ON public.conversations;
DROP TRIGGER IF EXISTS trg_conv_pacientes_updated_at ON public.conversation_pacientes;

-- 2) Funções (RPCs + trigger fns)
DROP FUNCTION IF EXISTS public.assumir_conversa(uuid);
DROP FUNCTION IF EXISTS public.liberar_conversa(uuid);
DROP FUNCTION IF EXISTS public.transferir_conversa(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.vincular_paciente_conversa(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.confirmar_vinculo_paciente(uuid);
DROP FUNCTION IF EXISTS public.definir_paciente_ativo_conversa(uuid, uuid);
DROP FUNCTION IF EXISTS public.tg_messages_update_window();
DROP FUNCTION IF EXISTS public.tg_conversations_audit_lock();

-- 3) Tabelas novas (drop em ordem reversa por causa de FKs)
DROP TABLE IF EXISTS public.conversation_audit_log;
DROP TABLE IF EXISTS public.conversation_meta_window;
DROP TABLE IF EXISTS public.conversation_pacientes;

-- 4) Colunas adicionadas
ALTER TABLE public.conversations
  DROP COLUMN IF EXISTS locked_by,
  DROP COLUMN IF EXISTS locked_at,
  DROP COLUMN IF EXISTS bot_handoff_at,
  DROP COLUMN IF EXISTS first_response_at,
  DROP COLUMN IF EXISTS paciente_ativo_id;

ALTER TABLE public.whatsapp_instances
  DROP COLUMN IF EXISTS ai_active,
  DROP COLUMN IF EXISTS tenant_id;

COMMIT;
