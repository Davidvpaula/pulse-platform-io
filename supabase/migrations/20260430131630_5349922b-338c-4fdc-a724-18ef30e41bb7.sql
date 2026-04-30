-- Enum tipos de cupom
DO $$ BEGIN
  CREATE TYPE public.cupom_tipo AS ENUM ('percentual', 'fixo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cupom_escopo AS ENUM ('global', 'medico', 'especialidade');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.cupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  descricao text,
  tipo public.cupom_tipo NOT NULL,
  -- Para percentual: 1 a 100. Para fixo: valor em centavos.
  valor integer NOT NULL CHECK (valor > 0),
  escopo public.cupom_escopo NOT NULL DEFAULT 'global',
  medico_id uuid,
  especialidade_id uuid,
  valido_de timestamptz NOT NULL DEFAULT now(),
  valido_ate timestamptz,
  uso_maximo integer,        -- NULL = ilimitado
  uso_atual integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Normaliza código em maiúsculas
CREATE OR REPLACE FUNCTION public.cupom_normaliza_codigo()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.codigo := upper(regexp_replace(NEW.codigo, '\s+', '', 'g'));
  -- Validações coerentes com o escopo / tipo
  IF NEW.escopo = 'medico' AND NEW.medico_id IS NULL THEN
    RAISE EXCEPTION 'Cupom com escopo "medico" requer medico_id';
  END IF;
  IF NEW.escopo = 'especialidade' AND NEW.especialidade_id IS NULL THEN
    RAISE EXCEPTION 'Cupom com escopo "especialidade" requer especialidade_id';
  END IF;
  IF NEW.escopo = 'global' THEN
    NEW.medico_id := NULL;
    NEW.especialidade_id := NULL;
  END IF;
  IF NEW.tipo = 'percentual' AND (NEW.valor > 100) THEN
    RAISE EXCEPTION 'Cupom percentual deve ter valor entre 1 e 100';
  END IF;
  IF NEW.valido_ate IS NOT NULL AND NEW.valido_ate <= NEW.valido_de THEN
    RAISE EXCEPTION 'Validade final deve ser posterior à validade inicial';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cupons_normaliza ON public.cupons;
CREATE TRIGGER trg_cupons_normaliza
BEFORE INSERT OR UPDATE ON public.cupons
FOR EACH ROW EXECUTE FUNCTION public.cupom_normaliza_codigo();

DROP TRIGGER IF EXISTS trg_cupons_updated_at ON public.cupons;
CREATE TRIGGER trg_cupons_updated_at
BEFORE UPDATE ON public.cupons
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_cupons_ativo ON public.cupons (ativo);
CREATE INDEX IF NOT EXISTS idx_cupons_escopo ON public.cupons (escopo);
CREATE INDEX IF NOT EXISTS idx_cupons_medico ON public.cupons (medico_id);
CREATE INDEX IF NOT EXISTS idx_cupons_especialidade ON public.cupons (especialidade_id);

ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;

-- RLS: admin/secretaria gerenciam tudo; pacientes leem apenas cupons ativos válidos.
DROP POLICY IF EXISTS "Admin gerencia cupons" ON public.cupons;
CREATE POLICY "Admin gerencia cupons" ON public.cupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Secretaria gerencia cupons" ON public.cupons;
CREATE POLICY "Secretaria gerencia cupons" ON public.cupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'secretaria'))
  WITH CHECK (public.has_role(auth.uid(), 'secretaria'));

DROP POLICY IF EXISTS "Médico vê cupons aplicáveis" ON public.cupons;
CREATE POLICY "Médico vê cupons aplicáveis" ON public.cupons
  FOR SELECT TO authenticated
  USING (
    ativo = true
    AND (escopo = 'global' OR EXISTS (
      SELECT 1 FROM public.medicos m
       WHERE m.user_id = auth.uid() AND m.id = cupons.medico_id
    ))
  );

DROP POLICY IF EXISTS "Paciente vê cupons ativos" ON public.cupons;
CREATE POLICY "Paciente vê cupons ativos" ON public.cupons
  FOR SELECT TO authenticated
  USING (
    ativo = true
    AND (valido_ate IS NULL OR valido_ate > now())
    AND (uso_maximo IS NULL OR uso_atual < uso_maximo)
  );