
-- 1) Adicionar colunas em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sexo_biologico text;

-- 2) Adicionar colunas em medicos
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS sexo_biologico text;

-- 3) Atualizar trigger handle_new_user para salvar campos extras e criar médico
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
  v_nome text;
  v_email text;
  v_telefone text;
  v_cpf text;
  v_cep text;
  v_sexo text;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', '');
  v_email := NEW.email;
  v_telefone := NEW.raw_user_meta_data->>'telefone';
  v_cpf := NEW.raw_user_meta_data->>'cpf';
  v_cep := NEW.raw_user_meta_data->>'cep';
  v_sexo := NEW.raw_user_meta_data->>'sexo_biologico';

  -- Cria profile com campos extras
  INSERT INTO public.profiles (id, nome, email, telefone, cpf, cep, sexo_biologico)
  VALUES (NEW.id, v_nome, v_email, v_telefone, v_cpf, v_cep, v_sexo);

  -- Atribui role (default = paciente)
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'paciente');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  -- Se role = medico, cria registro na tabela medicos automaticamente
  IF v_role = 'medico' THEN
    INSERT INTO public.medicos (
      user_id, nome, email, telefone, cpf, crm, crm_estado, especialidade,
      rqe, cep, sexo_biologico, documentos, status
    ) VALUES (
      NEW.id,
      v_nome,
      v_email,
      v_telefone,
      v_cpf,
      COALESCE(NEW.raw_user_meta_data->>'crm', ''),
      COALESCE(NEW.raw_user_meta_data->>'crm_estado', ''),
      COALESCE(NEW.raw_user_meta_data->>'especialidade', 'Clínica Geral'),
      NULLIF(NEW.raw_user_meta_data->>'rqe', ''),
      v_cep,
      v_sexo,
      '[]'::jsonb,
      'pendente'
    );
  END IF;

  RETURN NEW;
END;
$function$;
