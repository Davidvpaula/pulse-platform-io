
ALTER TABLE public.financeiro_alertas DROP CONSTRAINT IF EXISTS financeiro_alertas_tipo_check;
ALTER TABLE public.financeiro_alertas ADD CONSTRAINT financeiro_alertas_tipo_check
  CHECK (tipo = ANY (ARRAY['drift_saldo','movimento_orfao','hash_quebrado','backfill_inconsistente','drift_reconciliacao']));
