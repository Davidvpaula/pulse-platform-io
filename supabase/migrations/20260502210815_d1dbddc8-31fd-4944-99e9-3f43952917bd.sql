
-- Tabela de alertas de segurança
CREATE TABLE public.security_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('brute_force','novo_dispositivo','login_suspeito','senha_expirada_ignorada','multiplas_sessoes')),
  severidade text NOT NULL DEFAULT 'media' CHECK (severidade IN ('baixa','media','alta','critica')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text,
  ip_address text,
  user_agent text,
  detalhes jsonb DEFAULT '{}',
  descricao text,
  lida boolean NOT NULL DEFAULT false,
  lida_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lida_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin lê alertas"
  ON public.security_alerts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin atualiza alertas"
  ON public.security_alerts FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sistema insere alertas"
  ON public.security_alerts FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_security_alerts_tipo ON public.security_alerts(tipo);
CREATE INDEX idx_security_alerts_created ON public.security_alerts(created_at DESC);
CREATE INDEX idx_security_alerts_lida ON public.security_alerts(lida) WHERE NOT lida;

-- RPC para gerar alertas automaticamente a partir de login_attempts
CREATE OR REPLACE FUNCTION public.security_generate_alerts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  rec record;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- 1. Brute force: 5+ falhas em 15 min para o mesmo email (que ainda não foram alertadas)
  FOR rec IN
    SELECT la.email_norm, count(*) as falhas,
           max(la.attempted_at) as ultima,
           la.ip_address::text as ip,
           la.user_agent
      FROM login_attempts la
     WHERE la.success = false
       AND la.attempted_at > now() - interval '24 hours'
     GROUP BY la.email_norm, la.ip_address, la.user_agent
    HAVING count(*) >= 5
       AND NOT EXISTS (
         SELECT 1 FROM security_alerts sa
          WHERE sa.tipo = 'brute_force'
            AND sa.email = la.email_norm
            AND sa.created_at > now() - interval '1 hour'
       )
  LOOP
    INSERT INTO security_alerts (tipo, severidade, email, ip_address, user_agent, descricao, detalhes)
    VALUES (
      'brute_force', 'alta', rec.email_norm, rec.ip, rec.user_agent,
      format('%s tentativas falhas para %s nas últimas 24h', rec.falhas, rec.email_norm),
      jsonb_build_object('falhas', rec.falhas, 'ultima_tentativa', rec.ultima)
    );
    v_count := v_count + 1;
  END LOOP;

  -- 2. Múltiplas sessões ativas (5+ sessões para mesmo usuário)
  FOR rec IN
    SELECT us.user_id, count(*) as total,
           coalesce(c.email, p.email) as email
      FROM user_sessions us
      LEFT JOIN colaboradores c ON c.user_id = us.user_id
      LEFT JOIN profiles p ON p.id = us.user_id
     WHERE us.revoked_at IS NULL
     GROUP BY us.user_id, c.email, p.email
    HAVING count(*) >= 5
       AND NOT EXISTS (
         SELECT 1 FROM security_alerts sa
          WHERE sa.tipo = 'multiplas_sessoes'
            AND sa.user_id = us.user_id
            AND sa.created_at > now() - interval '6 hours'
       )
  LOOP
    INSERT INTO security_alerts (tipo, severidade, user_id, email, descricao, detalhes)
    VALUES (
      'multiplas_sessoes', 'media', rec.user_id, rec.email,
      format('%s sessões ativas simultâneas para %s', rec.total, rec.email),
      jsonb_build_object('sessoes_ativas', rec.total)
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object('alertas_gerados', v_count);
END;
$$;

-- Policy para admin poder revogar sessões de outros usuários via update direto
CREATE POLICY "Admin revoga sessões"
  ON public.user_sessions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
