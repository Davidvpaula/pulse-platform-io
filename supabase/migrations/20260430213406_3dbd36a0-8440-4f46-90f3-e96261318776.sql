INSERT INTO public.app_settings (key, value)
VALUES ('atendimento_imediato.servico_id', 'null'::jsonb)
ON CONFLICT (key) DO NOTHING;