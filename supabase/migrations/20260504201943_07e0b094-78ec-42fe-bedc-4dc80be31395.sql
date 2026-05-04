
-- Fix: assinatura_snapshot RLS — paciente_id is NOT auth.uid(), need join with pacientes
DROP POLICY IF EXISTS "Paciente vê próprio snapshot" ON public.assinatura_snapshot;
CREATE POLICY "Paciente vê próprio snapshot"
ON public.assinatura_snapshot
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM assinaturas a
    JOIN pacientes p ON p.id = a.paciente_id
    WHERE a.id = assinatura_snapshot.assinatura_id
      AND p.user_id = auth.uid()
  )
);

-- Add: paciente can see audit logs of own subscription
CREATE POLICY "Paciente ve auditoria da propria assinatura"
ON public.planos_auditoria
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM assinaturas a
    JOIN pacientes p ON p.id = a.paciente_id
    WHERE a.id = planos_auditoria.assinatura_id
      AND p.user_id = auth.uid()
  )
);
