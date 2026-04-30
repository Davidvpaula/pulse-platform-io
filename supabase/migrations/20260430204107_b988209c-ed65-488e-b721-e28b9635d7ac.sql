-- =========================================================
-- Fase C — Tabela de auditoria para "Visualizar como"
-- =========================================================

CREATE TABLE IF NOT EXISTS public.impersonation_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      uuid NOT NULL,
  admin_email   text,
  target_id     uuid NOT NULL,
  target_email  text,
  target_role   text,
  motivo        text NOT NULL,
  ip            text,
  user_agent    text,
  iniciado_em   timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  duracao_seg   integer
);

CREATE INDEX IF NOT EXISTS idx_impersonation_admin   ON public.impersonation_log(admin_id, iniciado_em DESC);
CREATE INDEX IF NOT EXISTS idx_impersonation_target  ON public.impersonation_log(target_id, iniciado_em DESC);

ALTER TABLE public.impersonation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin lê impersonation_log"
  ON public.impersonation_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin insere impersonation_log"
  ON public.impersonation_log FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND admin_id = auth.uid());

CREATE POLICY "Admin fecha impersonation_log"
  ON public.impersonation_log FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND admin_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND admin_id = auth.uid());

-- RPC: inicia impersonação
CREATE OR REPLACE FUNCTION public.impersonation_iniciar(
  _target_id uuid,
  _motivo    text,
  _user_agent text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id    uuid := auth.uid();
  v_admin_email text;
  v_target_email text;
  v_target_role text;
  v_log_id uuid;
BEGIN
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF NOT public.has_role(v_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem usar Visualizar como';
  END IF;
  IF _target_id = v_admin_id THEN
    RAISE EXCEPTION 'Não é possível visualizar como você mesmo';
  END IF;
  IF public.has_role(_target_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Não é permitido visualizar como outro administrador';
  END IF;
  IF coalesce(length(trim(_motivo)), 0) < 8 THEN
    RAISE EXCEPTION 'Motivo é obrigatório (mínimo 8 caracteres)';
  END IF;

  SELECT email INTO v_admin_email FROM public.colaboradores WHERE user_id = v_admin_id LIMIT 1;
  IF v_admin_email IS NULL THEN
    SELECT email INTO v_admin_email FROM public.profiles WHERE id = v_admin_id LIMIT 1;
  END IF;

  SELECT email INTO v_target_email FROM public.colaboradores WHERE user_id = _target_id LIMIT 1;
  IF v_target_email IS NULL THEN
    SELECT email INTO v_target_email FROM public.profiles WHERE id = _target_id LIMIT 1;
  END IF;

  SELECT role::text INTO v_target_role
    FROM public.user_roles
   WHERE user_id = _target_id
   ORDER BY CASE role::text
              WHEN 'medico' THEN 1
              WHEN 'secretaria' THEN 2
              WHEN 'empresa' THEN 3
              WHEN 'paciente' THEN 4
              ELSE 9
            END
   LIMIT 1;

  INSERT INTO public.impersonation_log
    (admin_id, admin_email, target_id, target_email, target_role, motivo, user_agent)
  VALUES
    (v_admin_id, v_admin_email, _target_id, v_target_email, v_target_role, trim(_motivo), _user_agent)
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- RPC: finaliza
CREATE OR REPLACE FUNCTION public.impersonation_finalizar(_log_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  UPDATE public.impersonation_log
     SET finalizado_em = now(),
         duracao_seg   = EXTRACT(EPOCH FROM (now() - iniciado_em))::int
   WHERE id = _log_id
     AND admin_id = auth.uid()
     AND finalizado_em IS NULL;
END;
$$;

-- RPC: lista alvos não-admin
CREATE OR REPLACE FUNCTION public.impersonation_listar_alvos(_busca text DEFAULT NULL)
RETURNS TABLE (
  user_id uuid,
  nome    text,
  email   text,
  role    text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  WITH base AS (
    SELECT c.user_id,
           c.nome_completo AS nome,
           c.email,
           coalesce((
             SELECT role::text FROM public.user_roles
              WHERE user_id = c.user_id AND role::text <> 'admin'
              ORDER BY CASE role::text
                         WHEN 'medico' THEN 1
                         WHEN 'secretaria' THEN 2
                         WHEN 'empresa' THEN 3
                         ELSE 9
                       END LIMIT 1
           ), 'colaborador') AS role
      FROM public.colaboradores c
     WHERE c.status_conta = 'ativo'
    UNION
    SELECT p.id AS user_id,
           coalesce(p.nome, p.email) AS nome,
           p.email,
           'paciente'::text AS role
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role::text = 'paciente'
  )
  SELECT b.*
    FROM base b
   WHERE public.has_role(auth.uid(), 'admin'::app_role)
     AND NOT public.has_role(b.user_id, 'admin'::app_role)
     AND b.user_id <> auth.uid()
     AND ( _busca IS NULL
        OR b.nome  ILIKE '%' || _busca || '%'
        OR b.email ILIKE '%' || _busca || '%' )
   ORDER BY b.nome
   LIMIT 100;
$$;

REVOKE ALL ON FUNCTION public.impersonation_iniciar(uuid, text, text)   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.impersonation_finalizar(uuid)             FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.impersonation_listar_alvos(text)          FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.impersonation_iniciar(uuid, text, text)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.impersonation_finalizar(uuid)             TO authenticated;
GRANT EXECUTE ON FUNCTION public.impersonation_listar_alvos(text)          TO authenticated;
