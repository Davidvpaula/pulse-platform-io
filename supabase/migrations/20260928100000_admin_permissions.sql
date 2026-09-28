-- Operações administrativas atômicas. Nenhuma integração externa é acionada.
CREATE OR REPLACE FUNCTION public.colaborador_permissoes_lote(
  _user_id uuid, _modo text, _keys text[] DEFAULT '{}', _origem uuid DEFAULT NULL,
  _motivo text DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE item record; chave text; total integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administrador pode alterar permissões' USING ERRCODE = '42501';
  END IF;
  IF nullif(trim(_motivo), '') IS NULL THEN RAISE EXCEPTION 'Informe o motivo'; END IF;
  PERFORM 1 FROM public.colaboradores WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Colaborador não encontrado'; END IF;
  IF _modo = 'template' THEN
    FOREACH chave IN ARRAY _keys LOOP
      IF NOT EXISTS (SELECT 1 FROM public.permissions_catalog WHERE permission_key = chave) THEN
        RAISE EXCEPTION 'Permissão desconhecida: %', chave;
      END IF;
      -- Preserva grants E revokes existentes conforme a promessa da interface.
      IF NOT EXISTS (SELECT 1 FROM public.permissoes_colaborador WHERE user_id = _user_id AND permission_key = chave) THEN
        PERFORM public.colaborador_set_permissao(_user_id, chave, 'grant', _motivo);
        total := total + 1;
      END IF;
    END LOOP;
  ELSIF _modo = 'copiar' THEN
    IF _origem IS NULL OR _origem = _user_id THEN RAISE EXCEPTION 'Selecione outro colaborador'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.colaboradores WHERE user_id = _origem) THEN RAISE EXCEPTION 'Origem não encontrada'; END IF;
    FOR item IN SELECT permission_key, efeito FROM public.permissoes_colaborador WHERE user_id = _origem LOOP
      PERFORM public.colaborador_set_permissao(_user_id, item.permission_key, item.efeito, _motivo);
      total := total + 1;
    END LOOP;
  ELSIF _modo = 'limpar' THEN
    FOR item IN SELECT permission_key FROM public.permissoes_colaborador WHERE user_id = _user_id LOOP
      PERFORM public.colaborador_remover_permissao(_user_id, item.permission_key, _motivo);
      total := total + 1;
    END LOOP;
  ELSE RAISE EXCEPTION 'Operação inválida';
  END IF;
  RETURN total;
END $$;
REVOKE ALL ON FUNCTION public.colaborador_permissoes_lote(uuid,text,text[],uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.colaborador_permissoes_lote(uuid,text,text[],uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _key text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'admin')
  OR (
    NOT EXISTS (SELECT 1 FROM colaboradores WHERE user_id = _user_id AND status_conta IS DISTINCT FROM 'ativo')
    AND NOT EXISTS (SELECT 1 FROM permissoes_colaborador WHERE user_id = _user_id AND permission_key = _key AND efeito = 'revoke')
    AND (
      EXISTS (SELECT 1 FROM permissoes_colaborador WHERE user_id = _user_id AND permission_key = _key AND efeito = 'grant')
      OR EXISTS (SELECT 1 FROM colaboradores c JOIN function_permissions f ON f.funcao_interna = c.funcao_interna
        WHERE c.user_id = _user_id AND c.status_conta = 'ativo' AND f.permission_key = _key AND f.ativo)
      OR EXISTS (SELECT 1 FROM user_roles r JOIN permissoes_perfil p ON p.role = r.role
        WHERE r.user_id = _user_id AND p.permission_key = _key AND p.ativo)
    )
  );
$$;
