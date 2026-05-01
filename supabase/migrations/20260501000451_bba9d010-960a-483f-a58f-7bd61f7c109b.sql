-- Módulos de treinamento
CREATE TABLE public.treinamentos_modulos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Aulas (vídeos do YouTube)
CREATE TABLE public.treinamentos_aulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modulo_id UUID NOT NULL REFERENCES public.treinamentos_modulos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  video_url TEXT NOT NULL,
  duracao_min INTEGER,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_treinamentos_aulas_modulo ON public.treinamentos_aulas(modulo_id);

-- Conclusões por médico
CREATE TABLE public.treinamentos_conclusoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  aula_id UUID NOT NULL REFERENCES public.treinamentos_aulas(id) ON DELETE CASCADE,
  concluido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, aula_id)
);

CREATE INDEX idx_treinamentos_conclusoes_user ON public.treinamentos_conclusoes(user_id);
CREATE INDEX idx_treinamentos_conclusoes_aula ON public.treinamentos_conclusoes(aula_id);

-- RLS
ALTER TABLE public.treinamentos_modulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinamentos_aulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinamentos_conclusoes ENABLE ROW LEVEL SECURITY;

-- Módulos: leitura para médicos e admins; escrita só admins
CREATE POLICY "Modulos visiveis para autenticados"
ON public.treinamentos_modulos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins gerenciam modulos"
ON public.treinamentos_modulos FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Aulas: leitura para autenticados; escrita só admins
CREATE POLICY "Aulas visiveis para autenticados"
ON public.treinamentos_aulas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins gerenciam aulas"
ON public.treinamentos_aulas FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Conclusões: cada usuário vê/gerencia as próprias; admins veem tudo
CREATE POLICY "Usuario ve suas conclusoes"
ON public.treinamentos_conclusoes FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Usuario marca propria conclusao"
ON public.treinamentos_conclusoes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuario desmarca propria conclusao"
ON public.treinamentos_conclusoes FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Trigger updated_at
CREATE TRIGGER update_treinamentos_modulos_updated_at
BEFORE UPDATE ON public.treinamentos_modulos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treinamentos_aulas_updated_at
BEFORE UPDATE ON public.treinamentos_aulas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();