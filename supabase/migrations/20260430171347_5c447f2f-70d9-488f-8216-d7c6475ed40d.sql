
DO $$ BEGIN CREATE TYPE public.pagamento_forma AS ENUM ('pix','cartao','boleto','manual','transferencia','outro'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.pagamento_status AS ENUM ('pendente','aprovado','recusado','cancelado','reembolsado','reembolsado_parcial','expirado'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id uuid, paciente_id uuid, medico_id uuid, empresa_id uuid, servico_id uuid,
  forma public.pagamento_forma NOT NULL DEFAULT 'manual',
  status public.pagamento_status NOT NULL DEFAULT 'pendente',
  gateway text, gateway_ref text,
  valor_bruto_centavos integer NOT NULL DEFAULT 0,
  taxa_gateway_centavos integer NOT NULL DEFAULT 0,
  taxa_imposto_centavos integer NOT NULL DEFAULT 0,
  valor_liquido_centavos integer NOT NULL DEFAULT 0,
  valor_reembolsado_centavos integer NOT NULL DEFAULT 0,
  data_vencimento date, data_pagamento timestamptz,
  responsavel_cobranca uuid, observacoes_internas text, comprovante_url text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin gerencia pagamentos" ON public.pagamentos FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
