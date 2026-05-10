INSERT INTO public.permissions_catalog (permission_key, modulo, descricao, risco, ordem) VALUES
  ('financeiro.saques.solicitar_correcao', 'Financeiro', 'Solicitar correção em pedido de saque do médico', 'alto', 45),
  ('pacientes.reembolsar', 'Pacientes', 'Iniciar reembolso de consulta para paciente', 'alto', 70),
  ('admin.dashboard', 'Administração', 'Acessar dashboard administrativo geral', 'baixo', 10),
  ('termos.gerenciar', 'Administração', 'Gerenciar termos e condições da plataforma', 'critico', 90)
ON CONFLICT (permission_key) DO NOTHING;