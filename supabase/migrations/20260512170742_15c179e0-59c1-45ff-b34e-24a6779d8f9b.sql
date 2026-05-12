
-- 1. Nova tabela contratos_modelo
CREATE TABLE public.contratos_modelo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  versao TEXT NOT NULL,
  titulo TEXT NOT NULL,
  arquivo_path TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT false,
  publicado_em TIMESTAMPTZ,
  publicado_por UUID,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_contratos_modelo_ativo
  ON public.contratos_modelo (ativo) WHERE ativo = true;

ALTER TABLE public.contratos_modelo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_contratos_modelo"
ON public.contratos_modelo FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "medicos_select_contratos_modelo_ativo"
ON public.contratos_modelo FOR SELECT
TO authenticated
USING (ativo = true AND public.has_role(auth.uid(), 'medico'));

CREATE TRIGGER update_contratos_modelo_updated_at
BEFORE UPDATE ON public.contratos_modelo
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Trigger garantindo apenas 1 ativo (desativa os outros automaticamente)
CREATE OR REPLACE FUNCTION public.fn_contratos_modelo_unico_ativo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ativo = true THEN
    UPDATE public.contratos_modelo
    SET ativo = false
    WHERE id <> NEW.id AND ativo = true;
    IF NEW.publicado_em IS NULL THEN
      NEW.publicado_em := now();
    END IF;
    IF NEW.publicado_por IS NULL THEN
      NEW.publicado_por := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_contratos_modelo_unico_ativo
BEFORE INSERT OR UPDATE ON public.contratos_modelo
FOR EACH ROW EXECUTE FUNCTION public.fn_contratos_modelo_unico_ativo();

-- 3. Coluna modelo_id em medicos_contratos
ALTER TABLE public.medicos_contratos
  ADD COLUMN modelo_id UUID REFERENCES public.contratos_modelo(id) ON DELETE SET NULL;

-- 4. Bucket privado contratos-modelo
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos-modelo', 'contratos-modelo', false)
ON CONFLICT (id) DO NOTHING;

-- Policies bucket: admin full, médico read
CREATE POLICY "admin_all_contratos_modelo_bucket"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'contratos-modelo' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'contratos-modelo' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "medicos_read_contratos_modelo_bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contratos-modelo' AND public.has_role(auth.uid(), 'medico'));
