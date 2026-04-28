-- Bucket privado para documentos dos médicos
INSERT INTO storage.buckets (id, name, public) VALUES ('medico-docs', 'medico-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Médico gerencia apenas a própria pasta (path = <user_id>/<arquivo>)
CREATE POLICY "Medico reads own docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'medico-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Medico uploads own docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'medico-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Medico updates own docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'medico-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Medico deletes own docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'medico-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin gerencia tudo
CREATE POLICY "Admin manages all medico docs"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'medico-docs' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'medico-docs' AND public.has_role(auth.uid(), 'admin'));