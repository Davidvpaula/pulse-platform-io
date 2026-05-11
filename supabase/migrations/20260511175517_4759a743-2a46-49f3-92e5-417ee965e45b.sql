
ALTER TABLE public.servicos_financeiros
  ADD COLUMN IF NOT EXISTS imagem_url text,
  ADD COLUMN IF NOT EXISTS subtitulo text,
  ADD COLUMN IF NOT EXISTS destacar_na_home boolean NOT NULL DEFAULT true;

CREATE OR REPLACE VIEW public.servicos_publicos AS
SELECT
  id,
  slug,
  nome,
  tipo,
  descricao_publica,
  duracao_min,
  valor_paciente_centavos,
  prioridade,
  ativo,
  icone,
  imagem_url,
  subtitulo,
  destacar_na_home
FROM public.servicos_financeiros
WHERE ativo = true;

INSERT INTO storage.buckets (id, name, public)
VALUES ('servico-imagens', 'servico-imagens', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "servico_imagens_public_read" ON storage.objects;
CREATE POLICY "servico_imagens_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'servico-imagens');

DROP POLICY IF EXISTS "servico_imagens_admin_insert" ON storage.objects;
CREATE POLICY "servico_imagens_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'servico-imagens' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "servico_imagens_admin_update" ON storage.objects;
CREATE POLICY "servico_imagens_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'servico-imagens' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "servico_imagens_admin_delete" ON storage.objects;
CREATE POLICY "servico_imagens_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'servico-imagens' AND public.has_role(auth.uid(), 'admin'));
