
-- ============================================================
-- FASE D: Sessões ativas + Política de senha + Anti brute-force
-- ============================================================

-- ----- 1) USER SESSIONS (heartbeat) -----
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  ip_address inet,
  user_agent text,
  device_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth.users(id),
  revoke_reason text,
  UNIQUE (user_id, session_token)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(user_id) WHERE revoked_at IS NULL;

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Usuário vê suas próprias sessões
CREATE POLICY "user_sessions_self_select"
ON public.user_sessions FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Usuário insere/atualiza sua própria sessão (heartbeat)
CREATE POLICY "user_sessions_self_insert"
ON public.user_sessions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_sessions_self_update"
ON public.user_sessions FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND revoked_at IS NULL);

-- ----- 2) RPC: revogar sessão (admin ou dono) -----
CREATE OR REPLACE FUNCTION public.session_revoke(_session_id uuid, _reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  SELECT user_id INTO v_owner FROM public.user_sessions WHERE id = _session_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'session_not_found';
  END IF;

  IF v_owner <> v_caller AND NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.user_sessions
     SET revoked_at = now(),
         revoked_by = v_caller,
         revoke_reason = _reason
   WHERE id = _session_id
     AND revoked_at IS NULL;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.session_revoke(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.session_revoke(uuid, text) TO authenticated;

-- ----- 3) RPC: heartbeat (upsert sessão) -----
CREATE OR REPLACE FUNCTION public.session_heartbeat(
  _session_token text,
  _ip text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _device_label text DEFAULT NULL
)
RETURNS TABLE(session_id uuid, revoked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
  v_revoked boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  INSERT INTO public.user_sessions (user_id, session_token, ip_address, user_agent, device_label)
  VALUES (v_user, _session_token, NULLIF(_ip,'')::inet, _user_agent, _device_label)
  ON CONFLICT (user_id, session_token) DO UPDATE
    SET last_seen_at = now(),
        ip_address  = COALESCE(EXCLUDED.ip_address, public.user_sessions.ip_address),
        user_agent  = COALESCE(EXCLUDED.user_agent, public.user_sessions.user_agent),
        device_label= COALESCE(EXCLUDED.device_label, public.user_sessions.device_label)
  RETURNING id, (revoked_at IS NOT NULL) INTO v_id, v_revoked;

  session_id := v_id;
  revoked    := v_revoked;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.session_heartbeat(text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.session_heartbeat(text,text,text,text) TO authenticated;

-- ----- 4) PASSWORD POLICY (metadados por usuário) -----
CREATE TABLE IF NOT EXISTS public.password_policy (
  id smallint PRIMARY KEY DEFAULT 1,
  expiration_days int NOT NULL DEFAULT 90 CHECK (expiration_days BETWEEN 0 AND 365),
  min_length int NOT NULL DEFAULT 8 CHECK (min_length BETWEEN 6 AND 64),
  hibp_enabled boolean NOT NULL DEFAULT true,
  require_complexity boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT password_policy_singleton CHECK (id = 1)
);

INSERT INTO public.password_policy (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.password_policy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "password_policy_read"
ON public.password_policy FOR SELECT
TO authenticated USING (true);

CREATE POLICY "password_policy_admin_write"
ON public.password_policy FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(),'admin'))
WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Metadado por usuário (último troca de senha)
CREATE TABLE IF NOT EXISTS public.user_password_meta (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  must_change boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_password_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_password_meta_self"
ON public.user_password_meta FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "user_password_meta_self_upsert"
ON public.user_password_meta FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_password_meta_self_update"
ON public.user_password_meta FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- RPC: marca a senha como trocada agora
CREATE OR REPLACE FUNCTION public.password_mark_changed()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  INSERT INTO public.user_password_meta (user_id, password_changed_at, must_change)
  VALUES (v_user, now(), false)
  ON CONFLICT (user_id) DO UPDATE
    SET password_changed_at = now(), must_change = false, updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.password_mark_changed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.password_mark_changed() TO authenticated;

-- RPC: status da senha (expirou? quantos dias faltam?)
CREATE OR REPLACE FUNCTION public.password_status()
RETURNS TABLE(
  password_changed_at timestamptz,
  expiration_days int,
  expired boolean,
  must_change boolean,
  days_remaining int
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_changed timestamptz;
  v_must boolean;
  v_exp int;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT pp.expiration_days INTO v_exp FROM public.password_policy pp WHERE pp.id = 1;
  IF v_exp IS NULL THEN v_exp := 90; END IF;

  SELECT m.password_changed_at, m.must_change
    INTO v_changed, v_must
    FROM public.user_password_meta m WHERE m.user_id = v_user;

  IF v_changed IS NULL THEN
    SELECT u.created_at INTO v_changed FROM auth.users u WHERE u.id = v_user;
    v_must := false;
  END IF;

  password_changed_at := v_changed;
  expiration_days := v_exp;
  must_change := COALESCE(v_must,false);

  IF v_exp = 0 THEN
    expired := false;
    days_remaining := 999;
  ELSE
    expired := (now() > v_changed + (v_exp || ' days')::interval) OR COALESCE(v_must,false);
    days_remaining := GREATEST(0, v_exp - EXTRACT(EPOCH FROM (now() - v_changed))::int / 86400);
  END IF;

  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.password_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.password_status() TO authenticated;

-- ----- 5) ANTI BRUTE-FORCE -----
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id bigserial PRIMARY KEY,
  email_norm text NOT NULL,
  ip_address inet,
  success boolean NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  user_agent text
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON public.login_attempts(email_norm, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON public.login_attempts(ip_address, attempted_at DESC);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Apenas admin vê histórico
CREATE POLICY "login_attempts_admin_select"
ON public.login_attempts FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'));

-- Inserts via SECURITY DEFINER RPC (sem policy de insert direto)

-- Janela de bloqueio: 5 falhas em 15 min
CREATE OR REPLACE FUNCTION public.login_attempt_check(_email text, _ip text DEFAULT NULL)
RETURNS TABLE(blocked boolean, fails int, retry_after_seconds int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(_email));
  v_window interval := interval '15 minutes';
  v_max int := 5;
  v_fails int;
  v_last timestamptz;
BEGIN
  SELECT count(*), max(attempted_at)
    INTO v_fails, v_last
    FROM public.login_attempts
   WHERE email_norm = v_email
     AND success = false
     AND attempted_at > now() - v_window;

  blocked := v_fails >= v_max;
  fails := v_fails;
  IF blocked THEN
    retry_after_seconds := GREATEST(0, EXTRACT(EPOCH FROM ((v_last + v_window) - now()))::int);
  ELSE
    retry_after_seconds := 0;
  END IF;
  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.login_attempt_check(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_attempt_check(text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.login_attempt_record(
  _email text, _success boolean, _ip text DEFAULT NULL, _user_agent text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts(email_norm, ip_address, success, user_agent)
  VALUES (lower(trim(_email)), NULLIF(_ip,'')::inet, _success, _user_agent);
END;
$$;
REVOKE ALL ON FUNCTION public.login_attempt_record(text,boolean,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.login_attempt_record(text,boolean,text,text) TO anon, authenticated;
