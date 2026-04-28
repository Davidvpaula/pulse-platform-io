-- Função de promoção a admin com bootstrap seguro
CREATE OR REPLACE FUNCTION public.promote_to_admin(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_id uuid;
  v_admin_count int;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Autenticação necessária';
  END IF;

  -- Localiza o usuário alvo pelo e-mail
  SELECT id INTO v_target_id FROM auth.users WHERE email = _email LIMIT 1;
  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado', _email;
  END IF;

  -- Conta admins existentes
  SELECT count(*) INTO v_admin_count FROM public.user_roles WHERE role = 'admin';

  -- Regra: bootstrap (sem admin) OU caller já é admin
  IF v_admin_count > 0 AND NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem promover outros usuários';
  END IF;

  -- Insere role admin (idempotente via unique constraint)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_target_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_target_id,
    'email', _email,
    'bootstrap', v_admin_count = 0
  );
END;
$$;

-- Garante que admins possam inserir/atualizar profiles via dashboard administrativo
CREATE POLICY "Admins manage profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));