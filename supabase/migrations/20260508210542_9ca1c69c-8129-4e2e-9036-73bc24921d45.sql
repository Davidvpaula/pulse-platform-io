INSERT INTO public.app_settings (key, value)
VALUES ('clinical_provider', '"none"'::jsonb)
ON CONFLICT (key) DO NOTHING;