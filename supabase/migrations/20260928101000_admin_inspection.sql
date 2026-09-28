CREATE OR REPLACE FUNCTION public.admin_inspecionar_usuario(_log_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE alvo uuid; result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Apenas admin' USING ERRCODE='42501'; END IF;
  SELECT target_id INTO alvo FROM impersonation_log
    WHERE id = _log_id AND admin_id = auth.uid() AND finalizado_em IS NULL
    AND iniciado_em > now() - interval '60 minutes';
  IF alvo IS NULL THEN RAISE EXCEPTION 'Inspeção encerrada ou expirada'; END IF;
  SELECT jsonb_build_object(
    'nome', p.nome, 'email', p.email,
    'papeis', (SELECT coalesce(jsonb_agg(role), '[]') FROM user_roles WHERE user_id = alvo),
    'colaborador', (SELECT jsonb_build_object('funcao', funcao_interna, 'status', status_conta, 'setor', setor) FROM colaboradores WHERE user_id = alvo LIMIT 1),
    'medico', (SELECT jsonb_build_object('nome', nome, 'status', status, 'crm', crm) FROM medicos WHERE user_id = alvo LIMIT 1),
    'paciente', (SELECT jsonb_build_object('nome', nome_completo, 'status', status_conta) FROM pacientes WHERE user_id = alvo LIMIT 1),
    'permissoes', (SELECT coalesce(jsonb_agg(jsonb_build_object('chave', permission_key, 'descricao', descricao, 'permitido', public.has_permission(alvo, permission_key)) ORDER BY permission_key), '[]') FROM permissions_catalog)
  ) INTO result FROM profiles p WHERE p.id = alvo;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_inspecionar_usuario(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_inspecionar_usuario(uuid) TO authenticated;
