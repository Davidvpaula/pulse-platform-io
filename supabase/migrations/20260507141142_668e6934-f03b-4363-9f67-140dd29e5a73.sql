
-- Tabela de notificações do sistema
CREATE TABLE public.notificacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'sistema',
  titulo TEXT NOT NULL,
  descricao TEXT,
  lida BOOLEAN NOT NULL DEFAULT false,
  referencia_tipo TEXT,
  referencia_id UUID,
  perfil TEXT NOT NULL DEFAULT 'medico',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_notificacoes_user_lida ON public.notificacoes (user_id, lida, created_at DESC);
CREATE INDEX idx_notificacoes_user_created ON public.notificacoes (user_id, created_at DESC);

-- RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem suas próprias notificações"
  ON public.notificacoes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam suas próprias notificações"
  ON public.notificacoes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários deletam suas próprias notificações"
  ON public.notificacoes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Sistema pode inserir (via triggers/functions)
CREATE POLICY "Sistema insere notificações"
  ON public.notificacoes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;

-- Function para criar notificação a partir de consulta
CREATE OR REPLACE FUNCTION public.notificar_consulta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_medico_user_id UUID;
  v_paciente_nome TEXT;
  v_titulo TEXT;
  v_descricao TEXT;
  v_tipo TEXT;
BEGIN
  -- Buscar user_id do médico
  SELECT user_id INTO v_medico_user_id
  FROM public.medicos WHERE id = NEW.medico_id;

  IF v_medico_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Buscar nome do paciente
  SELECT nome_completo INTO v_paciente_nome
  FROM public.pacientes WHERE id = NEW.paciente_id;

  IF TG_OP = 'INSERT' THEN
    v_tipo := 'agendamento';
    v_titulo := 'Nova consulta agendada';
    v_descricao := COALESCE(v_paciente_nome, 'Paciente') || ' · ' ||
                   to_char(NEW.inicio AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI');
  ELSIF TG_OP = 'UPDATE' THEN
    -- Cancelamento
    IF NEW.status = 'cancelada' AND OLD.status != 'cancelada' THEN
      v_tipo := 'cancelamento';
      v_titulo := 'Consulta cancelada';
      v_descricao := COALESCE(v_paciente_nome, 'Paciente') || ' · ' ||
                     to_char(NEW.inicio AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI');
    -- Confirmação de pagamento
    ELSIF NEW.status = 'confirmada' AND OLD.status = 'aguardando_pagamento' THEN
      v_tipo := 'pagamento';
      v_titulo := 'Pagamento confirmado';
      v_descricao := COALESCE(v_paciente_nome, 'Paciente') || ' · R$ ' ||
                     TRIM(to_char(NEW.valor_centavos / 100.0, 'FM999G999D00'));
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.notificacoes (user_id, tipo, titulo, descricao, referencia_tipo, referencia_id, perfil)
  VALUES (v_medico_user_id, v_tipo, v_titulo, v_descricao, 'consulta', NEW.id, 'medico');

  RETURN NEW;
END;
$$;

-- Trigger na tabela consultas
CREATE TRIGGER trg_notificar_consulta_insert
  AFTER INSERT ON public.consultas
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_consulta();

CREATE TRIGGER trg_notificar_consulta_update
  AFTER UPDATE ON public.consultas
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_consulta();
