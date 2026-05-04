-- Add sexo and foto_url to medicos
ALTER TABLE public.medicos
  ADD COLUMN IF NOT EXISTS sexo TEXT CHECK (sexo IN ('masculino','feminino','outro','prefiro_nao_informar')),
  ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Create storage bucket for doctor avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('medico-avatars', 'medico-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Public read medico avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'medico-avatars');

-- Medico uploads own avatar (folder = their user_id)
CREATE POLICY "Medico uploads own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'medico-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Medico updates own avatar
CREATE POLICY "Medico updates own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'medico-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Medico deletes own avatar
CREATE POLICY "Medico deletes own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'medico-avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);