
-- 1) Permitir acesso público à view servicos_publicos (não tem RLS, owner bypasses base table RLS)
GRANT SELECT ON public.servicos_publicos TO anon, authenticated;

-- 2) Médico pode INSERT em medico_comissao_override (para solicitar override)
CREATE POLICY "Medico solicita override proprio"
  ON public.medico_comissao_override
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medicos m
      WHERE m.id = medico_comissao_override.medico_id
        AND m.user_id = auth.uid()
    )
  );
