CREATE TABLE public.colaborador_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo text NOT NULL CHECK (length(trim(titulo)) BETWEEN 1 AND 200),
  prioridade text NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta')),
  prazo timestamptz,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','andamento','concluida')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.colaborador_tarefas(owner_id,created_at DESC);
ALTER TABLE public.colaborador_tarefas ENABLE ROW LEVEL SECURITY;
CREATE POLICY tarefas_proprias_leitura ON public.colaborador_tarefas FOR SELECT TO authenticated
  USING (owner_id=auth.uid() AND public.colaborador_operacional_ativo());
CREATE POLICY tarefas_proprias_criacao ON public.colaborador_tarefas FOR INSERT TO authenticated
  WITH CHECK (owner_id=auth.uid() AND public.colaborador_operacional_ativo());
CREATE POLICY tarefas_proprias_edicao ON public.colaborador_tarefas FOR UPDATE TO authenticated
  USING (owner_id=auth.uid() AND public.colaborador_operacional_ativo())
  WITH CHECK (owner_id=auth.uid() AND public.colaborador_operacional_ativo());
GRANT SELECT,INSERT,UPDATE ON public.colaborador_tarefas TO authenticated;
