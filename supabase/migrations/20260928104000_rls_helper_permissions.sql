-- Helpers de leitura usados nas políticas; não reabre RPCs administrativas indiscriminadamente.
GRANT EXECUTE ON FUNCTION public.is_medico_da_consulta(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_paciente_da_consulta(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plano_pertence_medico(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_titular_do_paciente(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.medico_tem_consulta_com_paciente(_medico_user_id uuid, _paciente_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT (_medico_user_id=auth.uid() OR has_role(auth.uid(),'admin')) AND EXISTS (
   SELECT 1 FROM consultas c JOIN medicos m ON m.id=c.medico_id
   WHERE m.user_id=_medico_user_id AND c.paciente_id=_paciente_id);
$$;
CREATE OR REPLACE FUNCTION public.is_thread_participant(_thread_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT (_user_id=auth.uid() OR has_role(auth.uid(),'admin')) AND EXISTS (
   SELECT 1 FROM internal_threads WHERE id=_thread_id AND (_user_id=ANY(participantes) OR has_role(_user_id,'admin')));
$$;
CREATE OR REPLACE FUNCTION public.pode_criar_assinatura_paciente(_user_id uuid, _paciente_id uuid, _plano_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT _user_id=auth.uid()
 AND EXISTS (SELECT 1 FROM pacientes WHERE id=_paciente_id AND user_id=_user_id)
 AND EXISTS (SELECT 1 FROM planos WHERE id=_plano_id AND created_by=_user_id AND nivel='paciente_custom');
$$;
GRANT EXECUTE ON FUNCTION public.medico_tem_consulta_com_paciente(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_thread_participant(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_criar_assinatura_paciente(uuid,uuid,uuid) TO authenticated;
