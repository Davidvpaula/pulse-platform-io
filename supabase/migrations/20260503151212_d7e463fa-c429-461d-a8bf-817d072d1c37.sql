
INSERT INTO public.permissions_catalog (permission_key, modulo, descricao) VALUES
  ('comunicacao.inbox.assumir', 'Comunicação', 'Assumir conversas no Inbox'),
  ('comunicacao.inbox.encerrar', 'Comunicação', 'Encerrar conversas no Inbox')
ON CONFLICT (permission_key) DO NOTHING;
