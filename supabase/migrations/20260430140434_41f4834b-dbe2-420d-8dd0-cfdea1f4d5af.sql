-- Log de uso de cupons
CREATE TABLE public.cupons_uso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cupom_id uuid NOT NULL REFERENCES public.cupons(id) ON DELETE RESTRICT,
  consulta_id uuid REFERENCES public.consultas(id) ON DELETE SET NULL,
  paciente_id uuid REFERENCES public.pacientes(id) ON DELETE SET NULL,
  medico_id uuid REFERENCES public.medicos(id) ON DELETE SET NULL,
  aplicado_por uuid,
  valor_original_centavos integer NOT NULL DEFAULT 0,
  valor_desconto_centavos integer NOT NULL DEFAULT 0,
  valor_final_centavos integer NOT NULL DEFAULT 0,
  codigo_snapshot text NOT NULL,
  tipo_snapshot public.cupom_tipo NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cupons_uso_cupom ON public.cupons_uso(cupom_id);
CREATE INDEX idx_cupons_uso_consulta ON public.cupons_uso(consulta_id);
CREATE INDEX idx_cupons_uso_paciente ON public.cupons_uso(paciente_id);
CREATE INDEX idx_cupons_uso_medico ON public.cupons_uso(medico_id);
CREATE INDEX idx_cupons_uso_created ON public.cupons_uso(created_at DESC);

ALTER TABLE public.cupons_uso ENABLE ROW LEVEL SECURITY;

-- Admin gerencia tudo
CREATE POLICY "Admin gerencia cupons_uso"
  ON public.cupons_uso FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Secretaria vê e cria registros
CREATE POLICY "Secretaria vê cupons_uso"
  ON public.cupons_uso FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'secretaria'));

CREATE POLICY "Secretaria cria cupons_uso"
  ON public.cupons_uso FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'secretaria'));

-- Médico vê usos das próprias consultas/cupons
CREATE POLICY "Médico vê cupons_uso próprios"
  ON public.cupons_uso FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = cupons_uso.medico_id AND m.user_id = auth.uid())
    OR (consulta_id IS NOT NULL AND public.is_medico_da_consulta(consulta_id))
  );

-- Paciente vê seus próprios usos
CREATE POLICY "Paciente vê cupons_uso próprios"
  ON public.cupons_uso FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.pacientes p WHERE p.id = cupons_uso.paciente_id AND p.user_id = auth.uid())
    OR (consulta_id IS NOT NULL AND public.is_paciente_da_consulta(consulta_id))
  );

-- Paciente registra próprio uso
CREATE POLICY "Paciente cria cupons_uso próprio"
  ON public.cupons_uso FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.pacientes p WHERE p.id = cupons_uso.paciente_id AND p.user_id = auth.uid())
  );

-- Trigger: incrementa uso_atual no cupom e preenche aplicado_por
CREATE OR REPLACE FUNCTION public.cupons_uso_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.aplicado_por IS NULL THEN
    NEW.aplicado_por := auth.uid();
  END IF;
  UPDATE public.cupons
     SET uso_atual = uso_atual + 1,
         updated_at = now()
   WHERE id = NEW.cupom_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cupons_uso_before_insert
  BEFORE INSERT ON public.cupons_uso
  FOR EACH ROW EXECUTE FUNCTION public.cupons_uso_after_insert();
