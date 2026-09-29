CREATE OR REPLACE FUNCTION public.medico_salvar_formacoes(_formacoes jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_medico uuid; item jsonb; pos integer := 0;
BEGIN
  SELECT id INTO v_medico FROM medicos WHERE user_id = auth.uid() AND status = 'aprovado' FOR UPDATE;
  IF v_medico IS NULL THEN RAISE EXCEPTION 'Médico aprovado não encontrado' USING ERRCODE = '42501'; END IF;
  IF _formacoes IS NULL OR jsonb_typeof(_formacoes) <> 'array' THEN RAISE EXCEPTION 'Formato inválido'; END IF;
  IF jsonb_array_length(_formacoes) > 3 THEN RAISE EXCEPTION 'Máximo de três formações'; END IF;
  -- Validação e troca fazem parte da mesma transação; falhas preservam os registros anteriores.
  DELETE FROM medico_formacoes WHERE medico_id = v_medico;
  FOR item IN SELECT value FROM jsonb_array_elements(_formacoes) LOOP
    IF nullif(trim(item->>'titulo'), '') IS NULL OR nullif(trim(item->>'instituicao'), '') IS NULL THEN
      RAISE EXCEPTION 'Informe título e instituição';
    END IF;
    pos := pos + 1;
    INSERT INTO medico_formacoes(medico_id,titulo,instituicao,status,ordem)
      VALUES(v_medico,trim(item->>'titulo'),trim(item->>'instituicao'),item->>'status',pos);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.medico_salvar_formacoes(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.medico_salvar_formacoes(jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
