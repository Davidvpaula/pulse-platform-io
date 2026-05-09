UPDATE pagamentos
SET
  paciente_id = COALESCE(paciente_id, NULLIF(metadata->>'paciente_id','')::uuid),
  medico_id   = COALESCE(medico_id,   NULLIF(metadata->>'medico_id','')::uuid)
WHERE provider = 'stripe'
  AND status = 'pendente'
  AND consulta_id IS NULL
  AND (paciente_id IS NULL OR medico_id IS NULL)
  AND (metadata ? 'paciente_id' OR metadata ? 'medico_id');