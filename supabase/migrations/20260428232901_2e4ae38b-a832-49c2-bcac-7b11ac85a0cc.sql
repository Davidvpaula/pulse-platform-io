-- Tabela de pagamentos (pronta para Stripe, hoje em modo simulado)
CREATE TYPE public.pagamento_status AS ENUM ('pendente','processando','pago','cancelado','falhou','reembolsado');
CREATE TYPE public.pagamento_metodo AS ENUM ('pix','cartao','boleto','simulado');
CREATE TYPE public.pagamento_provider AS ENUM ('mock','stripe');

CREATE TABLE public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id uuid NOT NULL REFERENCES public.consultas(id) ON DELETE CASCADE,
  valor_centavos integer NOT NULL CHECK (valor_centavos >= 0),
  moeda text NOT NULL DEFAULT 'BRL',
  metodo public.pagamento_metodo NOT NULL DEFAULT 'simulado',
  status public.pagamento_status NOT NULL DEFAULT 'pendente',
  provider public.pagamento_provider NOT NULL DEFAULT 'mock',
  provider_session_id text,
  provider_payment_id text,
  checkout_url text,
  paid_at timestamptz,
  cancelled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pagamentos_consulta ON public.pagamentos(consulta_id);
CREATE INDEX idx_pagamentos_status ON public.pagamentos(status);
CREATE INDEX idx_pagamentos_provider_session ON public.pagamentos(provider_session_id);

CREATE TRIGGER trg_pagamentos_updated_at
  BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- Paciente vê seus pagamentos
CREATE POLICY "paciente vê seus pagamentos"
ON public.pagamentos FOR SELECT
TO authenticated
USING (public.is_paciente_da_consulta(consulta_id));

-- Paciente cria pagamento da própria consulta (status pendente)
CREATE POLICY "paciente cria pagamento próprio"
ON public.pagamentos FOR INSERT
TO authenticated
WITH CHECK (public.is_paciente_da_consulta(consulta_id) AND status = 'pendente');

-- Paciente pode cancelar seu pagamento pendente (modo simulado)
CREATE POLICY "paciente atualiza pagamento próprio"
ON public.pagamentos FOR UPDATE
TO authenticated
USING (public.is_paciente_da_consulta(consulta_id))
WITH CHECK (public.is_paciente_da_consulta(consulta_id));

-- Médico vê pagamentos das próprias consultas
CREATE POLICY "medico vê pagamentos das suas consultas"
ON public.pagamentos FOR SELECT
TO authenticated
USING (public.is_medico_da_consulta(consulta_id));

-- Admin vê tudo
CREATE POLICY "admin vê todos pagamentos"
ON public.pagamentos FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin atualiza pagamentos"
ON public.pagamentos FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Configuração do provider em app_settings (chave única)
INSERT INTO public.app_settings (key, value)
VALUES ('pagamentos_provider', '"mock"'::jsonb)
ON CONFLICT (key) DO NOTHING;