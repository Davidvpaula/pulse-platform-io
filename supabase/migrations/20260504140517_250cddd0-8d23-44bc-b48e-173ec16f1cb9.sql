-- Create medico_formacoes table
CREATE TABLE public.medico_formacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL CHECK (char_length(titulo) <= 120),
  instituicao TEXT NOT NULL CHECK (char_length(instituicao) <= 120),
  status TEXT NOT NULL DEFAULT 'concluido' CHECK (status IN ('concluido', 'em_andamento')),
  ordem INTEGER NOT NULL DEFAULT 1 CHECK (ordem BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (medico_id, ordem)
);

-- Trigger to enforce max 3 per doctor
CREATE OR REPLACE FUNCTION public.check_max_formacoes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.medico_formacoes WHERE medico_id = NEW.medico_id) >= 3
     AND TG_OP = 'INSERT' THEN
    RAISE EXCEPTION 'Máximo de 3 formações por médico';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_max_formacoes
BEFORE INSERT ON public.medico_formacoes
FOR EACH ROW EXECUTE FUNCTION public.check_max_formacoes();

-- RLS
ALTER TABLE public.medico_formacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medico manages own formacoes"
ON public.medico_formacoes FOR ALL
USING (medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()))
WITH CHECK (medico_id IN (SELECT id FROM medicos WHERE user_id = auth.uid()));

CREATE POLICY "Admin manages all formacoes"
ON public.medico_formacoes FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public reads formacoes"
ON public.medico_formacoes FOR SELECT
USING (true);