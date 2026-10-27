CREATE OR REPLACE FUNCTION public.paciente_criar_dependente(_nome text, _cpf text, _nascimento date, _sexo public.sexo_biologico, _parentesco text, _termo text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE titular uuid; dependente uuid; cpf text := regexp_replace(coalesce(_cpf,''),'\D','','g'); soma integer; digito integer; i integer;
BEGIN
  SELECT id INTO titular FROM pacientes WHERE user_id = auth.uid() AND status_conta = 'ativo' AND tipo_paciente = 'titular';
  IF titular IS NULL THEN RAISE EXCEPTION 'Titular ativo necessário'; END IF;
  IF length(trim(_nome)) < 3 OR length(trim(_nome)) > 120 OR _nome IS NULL THEN RAISE EXCEPTION 'Nome inválido'; END IF;
  IF length(cpf) <> 11 OR cpf = repeat(left(cpf,1),11) THEN RAISE EXCEPTION 'CPF inválido'; END IF;
  FOR digito IN 10..11 LOOP
    soma := 0;
    FOR i IN 1..digito-1 LOOP soma := soma + substring(cpf,i,1)::int * (digito+1-i); END LOOP;
    IF ((soma * 10) % 11) % 10 <> substring(cpf,digito,1)::int THEN RAISE EXCEPTION 'CPF inválido'; END IF;
  END LOOP;
  IF _nascimento IS NULL OR _nascimento > current_date OR _nascimento < date '1900-01-01' THEN RAISE EXCEPTION 'Nascimento inválido'; END IF;
  IF coalesce(length(trim(_parentesco)),0) = 0 OR coalesce(length(trim(_termo)),0) < 20 OR _sexo IS NULL THEN RAISE EXCEPTION 'Parentesco e consentimento obrigatórios'; END IF;
  INSERT INTO pacientes (nome_completo,cpf,data_nascimento,sexo,parentesco,tipo_paciente,responsavel_id,status_conta)
    VALUES (trim(_nome),cpf,_nascimento,_sexo,_parentesco,'dependente',titular,'ativo') RETURNING id INTO dependente;
  INSERT INTO dependente_consentimentos (responsavel_id,dependente_id,tipo_consentimento,aceite,accepted_at,texto_termo_snapshot)
    VALUES (titular,dependente,'cadastro_dependente',true,now(),_termo);
  RETURN dependente;
END; $$;
REVOKE ALL ON FUNCTION public.paciente_criar_dependente(text,text,date,public.sexo_biologico,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.paciente_criar_dependente(text,text,date,public.sexo_biologico,text,text) TO authenticated;
DROP POLICY IF EXISTS titular_insert_dependentes ON public.pacientes;

-- Autogerenciamento não permite mudar empresa, titularidade ou desbloquear a própria conta.
CREATE OR REPLACE FUNCTION public.proteger_campos_paciente()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE permitidos text[] := ARRAY['nome_completo','cpf','telefone','data_nascimento','sexo','cep','logradouro','numero','complemento','bairro','cidade','uf','alergias','condicoes_cronicas','medicamentos_uso','contato_emergencia_nome','contato_emergencia_telefone','whatsapp_opt_in','updated_at'];
BEGIN
  IF current_user <> 'authenticated' OR public.has_role(auth.uid(),'admin') OR public.has_permission(auth.uid(),'pacientes.editar') THEN RETURN NEW; END IF;
  IF OLD.responsavel_id = public.get_titular_paciente_id() THEN
    permitidos := ARRAY['nome_completo','cpf','data_nascimento','sexo','parentesco','status_conta','updated_at'];
    IF NEW.status_conta IS DISTINCT FROM OLD.status_conta AND (OLD.status_conta NOT IN ('ativo','suspenso') OR NEW.status_conta NOT IN ('ativo','suspenso')) THEN RAISE EXCEPTION 'Status administrado pela equipe'; END IF;
  END IF;
  IF (to_jsonb(NEW) - permitidos) IS DISTINCT FROM (to_jsonb(OLD) - permitidos) THEN RAISE EXCEPTION 'Campo restrito à administração'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER proteger_campos_paciente BEFORE UPDATE ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_paciente();
