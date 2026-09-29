CREATE TABLE public.anexo_compartilhamento_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anexo_id uuid NOT NULL REFERENCES public.anexos_consulta(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  compartilhado boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.anexo_compartilhamento_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Autor e admin consultam compartilhamento" ON public.anexo_compartilhamento_log
  FOR SELECT TO authenticated USING (actor_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.medico_compartilhar_anexo(_anexo_id uuid, _compartilhar boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_consulta uuid;
BEGIN
  SELECT a.consulta_id INTO v_consulta FROM anexos_consulta a
    JOIN consultas c ON c.id = a.consulta_id JOIN medicos m ON m.id = c.medico_id
    WHERE a.id = _anexo_id AND m.user_id = auth.uid() AND m.status = 'aprovado' FOR UPDATE OF a;
  IF v_consulta IS NULL THEN RAISE EXCEPTION 'Anexo não encontrado ou acesso negado' USING ERRCODE = '42501'; END IF;
  IF _compartilhar IS NULL THEN RAISE EXCEPTION 'Informe a visibilidade'; END IF;
  UPDATE anexos_consulta SET visibilidade_empresa = _compartilhar WHERE id = _anexo_id;
  INSERT INTO anexo_compartilhamento_log(anexo_id, actor_id, compartilhado) VALUES (_anexo_id, auth.uid(), _compartilhar);
END $$;
REVOKE ALL ON FUNCTION public.medico_compartilhar_anexo(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.medico_compartilhar_anexo(uuid,boolean) TO authenticated;

-- Serializa transições clínicas e impede sucesso sobre registros invisíveis.
CREATE OR REPLACE FUNCTION public.medico_transicionar_consulta(_consulta_id uuid, _status public.consulta_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status public.consulta_status;
BEGIN
  SELECT c.status INTO v_status FROM consultas c JOIN medicos m ON m.id = c.medico_id
    WHERE c.id = _consulta_id AND m.user_id = auth.uid() AND m.status = 'aprovado' FOR UPDATE OF c;
  IF v_status IS NULL THEN RAISE EXCEPTION 'Consulta não encontrada ou acesso negado' USING ERRCODE = '42501'; END IF;
  IF _status IS NULL OR _status NOT IN ('em_andamento', 'concluida', 'cancelada') THEN RAISE EXCEPTION 'Transição não permitida'; END IF;
  IF v_status = _status THEN RETURN; END IF;
  IF _status = 'em_andamento' AND v_status IN ('agendada','confirmada') THEN
    IF v_status = 'agendada' THEN UPDATE consultas SET status = 'confirmada' WHERE id = _consulta_id; END IF;
  ELSIF _status = 'concluida' AND v_status = 'em_andamento' THEN NULL;
  ELSIF _status = 'cancelada' AND v_status IN ('agendada','confirmada','aguardando_pagamento') THEN NULL;
  ELSE RAISE EXCEPTION 'Status atual não permite esta ação: %', v_status;
  END IF;
  UPDATE consultas SET status = _status WHERE id = _consulta_id;
END $$;
REVOKE ALL ON FUNCTION public.medico_transicionar_consulta(uuid,public.consulta_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.medico_transicionar_consulta(uuid,public.consulta_status) TO authenticated;
NOTIFY pgrst, 'reload schema';
