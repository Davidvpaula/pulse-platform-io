
-- =========================================================================
-- 1) SECURITY DEFINER hardening
--    Revoga EXECUTE de PUBLIC/anon/authenticated em TODAS as funções
--    SECURITY DEFINER no schema public, e re-concede apenas para as
--    funções realmente chamadas pelo app (RPCs do client e fluxos públicos).
-- =========================================================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant EXECUTE to `authenticated` on RPCs called by the client
DO $$
DECLARE
  fn text;
  rec record;
  allowed text[] := ARRAY[
    'admin_agendamentos_overview','admin_consulta_cancelar','admin_consulta_forcar_confirmacao',
    'admin_consulta_marcar_realizada','admin_consulta_reenviar_link','admin_consulta_trocar_medico',
    'admin_empresas_overview','admin_visao_geral','agendar_retorno_gratuito',
    'ai_avatar_assumir_conversa','ai_avatar_kill_switch','ai_avatar_pausar_conversa','ai_avatar_should_reply',
    'alterar_status_conta_paciente','analytics_conversao','analytics_financeiro','analytics_overview',
    'analytics_tempo_real','analytics_trafego','aplicar_restricao_medico','assumir_conversa',
    'auditoria_dashboard','auditoria_listar','claim_conversation','colaborador_alterar_status',
    'colaborador_atualizar','colaborador_remover_permissao','colaborador_set_permissao','colaborador_set_role',
    'coletar_metricas_medico','confirmar_vinculo_paciente','definir_paciente_ativo_conversa',
    'event_reprocessar','financeiro_central_dashboard','financeiro_pagamento_cancelar',
    'financeiro_pagamento_confirmar','financeiro_reembolso_aprovar','financeiro_reembolso_recusar',
    'financeiro_repasse_bloquear','financeiro_repasse_marcar_pago','fn_metricas_operacionais_dia',
    'fn_noc_snapshot','fn_observabilidade_financeira','fn_reconciliar_global','fn_resolver_comissao',
    'fn_servico_slots_disponiveis','forcar_status_consulta','get_empresa_id_do_usuario',
    'get_meta_window_state','has_permission','has_permissions_batch','has_role',
    'impersonation_finalizar','impersonation_iniciar','impersonation_listar_alvos',
    'inbox_increment_unread','inbox_set_first_response','integracoes_dashboard','liberar_conversa',
    'login_attempt_check','login_attempt_record','marcar_pagamento_falho','mark_messages_read',
    'medico_aprovar','medico_bloquear','medico_colocar_em_analise','medico_reativar',
    'medico_reprovar','medico_suspender','password_mark_changed','password_status',
    'permissoes_dashboard','permissoes_efetivas','plano_saude_financeira','processar_pagamento_confirmado',
    'producao_ativar','recalcular_ranking_todos','registrar_auditoria_colaborador','remover_cupom_pagamento',
    'reservar_slot_unificado','resolver_conversa','security_generate_alerts','session_heartbeat',
    'session_revoke','set_audit_motivo','set_conversation_queue','set_typing',
    'transferir_conversa','trocar_medico_consulta','update_attendant_presence',
    'update_conversation_priority','update_conversation_status','validar_e_aplicar_cupom',
    'vincular_paciente_conversa','fn_medico_saldo_real','fn_registrar_movimento_idempotente',
    'ativar_premium_conquistado'
  ];
BEGIN
  FOREACH fn IN ARRAY allowed LOOP
    FOR rec IN
      SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname = fn AND p.prosecdef=true
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', fn, rec.args);
    END LOOP;
  END LOOP;
END $$;

-- Re-grant EXECUTE to `anon` only on genuinely public entrypoints
GRANT EXECUTE ON FUNCTION public.public_home_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_pa_slots_disponiveis(date) TO anon, authenticated;

-- Login attempt check/record are used from the auth page (pre-session)
DO $$
DECLARE rec record;
BEGIN
  FOR rec IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('login_attempt_check','login_attempt_record') AND p.prosecdef=true
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon', rec.proname, rec.args);
  END LOOP;
END $$;

-- service_role and postgres retain execute via role membership; ensure explicit grant
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;

-- =========================================================================
-- 2) servicos_financeiros: remover policy pública que exponha comissão/valores
-- =========================================================================
DROP POLICY IF EXISTS "Servicos ativos leitura publica restrita" ON public.servicos_financeiros;
REVOKE SELECT ON public.servicos_financeiros FROM anon;
