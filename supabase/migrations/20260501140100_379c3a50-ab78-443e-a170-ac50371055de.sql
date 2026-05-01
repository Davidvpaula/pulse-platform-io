
-- 1. Adicionar novos valores ao enum plano_status
ALTER TYPE public.plano_status ADD VALUE IF NOT EXISTS 'encerramento_pendente';
ALTER TYPE public.plano_status ADD VALUE IF NOT EXISTS 'encerrado';

-- 2. Novo enum para modo de cancelamento
DO $$ BEGIN
  CREATE TYPE public.modo_cancelamento_plano AS ENUM ('cumprir_ciclo', 'reembolso_imediato', 'hibrido');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Adicionar campo aprovado_admin em planos
ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS aprovado_admin boolean NOT NULL DEFAULT false;

-- 4. Adicionar campos de controle de cancelamento em assinaturas
ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS renovacao_bloqueada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_fim_acesso date;

-- 5. Tabela de eventos de cancelamento
CREATE TABLE IF NOT EXISTS public.plano_cancelamento_evento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES public.planos(id) ON DELETE CASCADE,
  medico_id uuid NOT NULL,
  total_pacientes integer NOT NULL DEFAULT 0,
  valor_total_comprometido_centavos integer NOT NULL DEFAULT 0,
  tipo_encerramento public.modo_cancelamento_plano NOT NULL DEFAULT 'cumprir_ciclo',
  motivo text,
  termos_aceitos boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado_admin', 'em_encerramento', 'finalizado', 'cancelado')),
  admin_acao text,
  admin_id uuid,
  admin_acao_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plano_cancelamento_evento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Médico vê cancelamentos próprios" ON public.plano_cancelamento_evento
  FOR SELECT TO authenticated USING (medico_id = auth.uid());
CREATE POLICY "Admin vê todos cancelamentos" ON public.plano_cancelamento_evento
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Médico cria cancelamento" ON public.plano_cancelamento_evento
  FOR INSERT TO authenticated
  WITH CHECK (medico_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.planos p WHERE p.id = plano_cancelamento_evento.plano_id AND p.medico_id = auth.uid()
  ));
CREATE POLICY "Admin atualiza cancelamento" ON public.plano_cancelamento_evento
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. Tabela de reembolsos de planos
CREATE TABLE IF NOT EXISTS public.reembolso_planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id uuid NOT NULL,
  plano_id uuid NOT NULL REFERENCES public.planos(id),
  assinatura_id uuid REFERENCES public.assinaturas(id),
  cancelamento_evento_id uuid REFERENCES public.plano_cancelamento_evento(id),
  valor_centavos integer NOT NULL DEFAULT 0,
  valor_proporcional_centavos integer NOT NULL DEFAULT 0,
  dias_restantes integer NOT NULL DEFAULT 0,
  dias_total_ciclo integer NOT NULL DEFAULT 30,
  status public.reembolso_status NOT NULL DEFAULT 'solicitado',
  motivo text,
  processado_por uuid,
  processado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reembolso_planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paciente vê reembolsos próprios" ON public.reembolso_planos
  FOR SELECT TO authenticated USING (paciente_id = auth.uid());
CREATE POLICY "Admin vê todos reembolsos" ON public.reembolso_planos
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia reembolsos" ON public.reembolso_planos
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Médico vê reembolsos planos próprios" ON public.reembolso_planos
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.planos p WHERE p.id = reembolso_planos.plano_id AND p.medico_id = auth.uid())
  );

-- 7. Log de mudança de status do plano
CREATE TABLE IF NOT EXISTS public.plano_medico_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES public.planos(id) ON DELETE CASCADE,
  medico_id uuid,
  status_anterior text,
  status_novo text NOT NULL,
  changed_by uuid,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plano_medico_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin vê status log" ON public.plano_medico_status_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Médico vê status log próprio" ON public.plano_medico_status_log
  FOR SELECT TO authenticated USING (medico_id = auth.uid());

-- 8. Trigger para logar mudanças de status do plano
CREATE OR REPLACE FUNCTION public.log_plano_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.plano_medico_status_log (plano_id, medico_id, status_anterior, status_novo, changed_by)
    VALUES (NEW.id, NEW.medico_id, OLD.status::text, NEW.status::text, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_log_plano_status ON public.planos;
CREATE TRIGGER trg_log_plano_status
  AFTER UPDATE ON public.planos
  FOR EACH ROW
  EXECUTE FUNCTION public.log_plano_status_change();

REVOKE EXECUTE ON FUNCTION public.log_plano_status_change() FROM anon;

-- 9. Função para calcular reembolso proporcional
CREATE OR REPLACE FUNCTION public.calcular_reembolso_proporcional(
  _valor_cobrado integer,
  _data_inicio date,
  _data_fim date,
  _data_cancelamento date DEFAULT CURRENT_DATE
)
RETURNS TABLE(dias_restantes integer, dias_total integer, valor_proporcional integer) AS $$
DECLARE
  _total integer;
  _restantes integer;
BEGIN
  _total := GREATEST((_data_fim - _data_inicio), 1);
  _restantes := GREATEST((_data_fim - _data_cancelamento), 0);
  RETURN QUERY SELECT
    _restantes,
    _total,
    ROUND(_valor_cobrado::numeric * _restantes / _total)::integer;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.calcular_reembolso_proporcional(integer, date, date, date) FROM anon;
GRANT EXECUTE ON FUNCTION public.calcular_reembolso_proporcional(integer, date, date, date) TO authenticated;
