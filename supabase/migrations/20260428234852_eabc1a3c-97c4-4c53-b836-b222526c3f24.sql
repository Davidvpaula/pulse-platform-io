-- 1) Novos campos pessoais necessários para liberar acesso na Feegow
ALTER TABLE public.medicos
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS data_nascimento date;

-- 2) Status da liberação na Feegow (controlado pelo Admin)
DO $$ BEGIN
  CREATE TYPE public.feegow_status AS ENUM ('nao_enviado','pendente','liberado','erro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.medicos
  ADD COLUMN IF NOT EXISTS feegow_status public.feegow_status NOT NULL DEFAULT 'nao_enviado',
  ADD COLUMN IF NOT EXISTS feegow_professional_id text,
  ADD COLUMN IF NOT EXISTS feegow_liberado_em timestamptz,
  ADD COLUMN IF NOT EXISTS feegow_erro text,
  ADD COLUMN IF NOT EXISTS feegow_payload jsonb;

-- 3) Permitir médico atualizar próprio cadastro também quando aprovado,
--    mas APENAS para campos pessoais (não os campos Feegow / status).
--    A política antiga só permitia em pendente/reprovado. Mantemos a restrição
--    nos campos sensíveis via trigger.
DROP POLICY IF EXISTS "Medico updates own record (personal fields)" ON public.medicos;
CREATE POLICY "Medico updates own record (personal fields)"
ON public.medicos
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger: bloqueia alterações do próprio médico em campos sensíveis
CREATE OR REPLACE FUNCTION public.medicos_protege_campos_sensiveis()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin pode tudo
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Demais usuários (médico no próprio cadastro): preserva campos sensíveis
  NEW.status := OLD.status;
  NEW.motivo_reprovacao := OLD.motivo_reprovacao;
  NEW.feegow_status := OLD.feegow_status;
  NEW.feegow_professional_id := OLD.feegow_professional_id;
  NEW.feegow_liberado_em := OLD.feegow_liberado_em;
  NEW.feegow_erro := OLD.feegow_erro;
  NEW.feegow_payload := OLD.feegow_payload;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_medicos_protege_campos ON public.medicos;
CREATE TRIGGER trg_medicos_protege_campos
BEFORE UPDATE ON public.medicos
FOR EACH ROW
EXECUTE FUNCTION public.medicos_protege_campos_sensiveis();

-- 4) RPC chamada pela edge function (admin) para registrar resultado da liberação Feegow
CREATE OR REPLACE FUNCTION public.feegow_marcar_liberacao(
  _medico_id uuid,
  _status public.feegow_status,
  _professional_id text,
  _erro text,
  _payload jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem registrar liberação Feegow';
  END IF;

  UPDATE public.medicos
     SET feegow_status = _status,
         feegow_professional_id = COALESCE(_professional_id, feegow_professional_id),
         feegow_liberado_em = CASE WHEN _status = 'liberado' THEN now() ELSE feegow_liberado_em END,
         feegow_erro = CASE WHEN _status = 'erro' THEN _erro ELSE NULL END,
         feegow_payload = COALESCE(_payload, feegow_payload),
         updated_at = now()
   WHERE id = _medico_id;

  INSERT INTO public.medicos_auditoria (medico_id, actor_id, acao, motivo)
  VALUES (
    _medico_id,
    auth.uid(),
    'feegow_' || _status::text,
    _erro
  );
END;
$$;