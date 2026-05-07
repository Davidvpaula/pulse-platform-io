-- Adicionar campos Feegow à tabela consultas (todos nullable, sem alterar fluxo)
ALTER TABLE public.consultas
  ADD COLUMN IF NOT EXISTS feegow_agendamento_id text,
  ADD COLUMN IF NOT EXISTS feegow_sync_status text,
  ADD COLUMN IF NOT EXISTS feegow_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS feegow_sync_error text;

-- Index para busca rápida por agendamento Feegow (anti-duplicidade)
CREATE INDEX IF NOT EXISTS idx_consultas_feegow_agendamento_id
  ON public.consultas (feegow_agendamento_id)
  WHERE feegow_agendamento_id IS NOT NULL;