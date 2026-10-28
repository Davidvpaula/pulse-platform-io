CREATE POLICY colaborador_reembolsos_leitura ON public.reembolsos AS RESTRICTIVE FOR SELECT TO authenticated USING ((SELECT colaborador_capacidade('financeiro.ver')));
CREATE POLICY colaborador_assinaturas_leitura ON public.assinaturas AS RESTRICTIVE FOR SELECT TO authenticated USING ((SELECT colaborador_capacidade('financeiro.ver')));
CREATE POLICY colaborador_auditoria_paciente_leitura ON public.pacientes_auditoria AS RESTRICTIVE FOR SELECT TO authenticated USING ((SELECT colaborador_capacidade('auditoria.ver')));

CREATE OR REPLACE FUNCTION public.paciente_salvar_observacoes(_paciente_id uuid,_texto text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT colaborador_operacional_ativo() OR NOT has_permission(auth.uid(),'pacientes.ver') OR NOT has_permission(auth.uid(),'pacientes.editar') THEN
    RAISE EXCEPTION 'Sem permissão para editar observações' USING ERRCODE='42501';
  END IF;
  IF length(coalesce(_texto,''))>10000 THEN RAISE EXCEPTION 'Limite de 10000 caracteres'; END IF;
  PERFORM 1 FROM pacientes WHERE id=_paciente_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Paciente não encontrado'; END IF;
  UPDATE pacientes SET observacoes_internas=nullif(trim(_texto),''),updated_at=now() WHERE id=_paciente_id;
  INSERT INTO pacientes_auditoria(paciente_id,actor_id,acao,motivo,payload)
    VALUES(_paciente_id,auth.uid(),'observacao_editada','Edição de observações internas',jsonb_build_object('texto',nullif(trim(_texto),'')));
END;
$$;
REVOKE ALL ON FUNCTION public.paciente_salvar_observacoes(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.paciente_salvar_observacoes(uuid,text) TO authenticated;
