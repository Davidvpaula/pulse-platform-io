
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  categoria TEXT DEFAULT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- Anyone can read active FAQs
CREATE POLICY "FAQs ativos visíveis publicamente"
  ON public.faqs FOR SELECT
  TO authenticated, anon
  USING (ativo = true);

-- Admins can do everything (using has_role)
CREATE POLICY "Admins gerenciam FAQs"
  ON public.faqs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-update updated_at
CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial FAQs
INSERT INTO public.faqs (pergunta, resposta, ordem) VALUES
  ('Como funciona a telemedicina?', 'Você agenda, recebe um link de vídeo seguro e atende pelo navegador ou app.', 1),
  ('As receitas têm validade legal?', 'Sim, com assinatura digital ICP-Brasil válida em todo território nacional.', 2),
  ('Empresas têm acesso ao prontuário?', 'Não. Empresas só visualizam relatórios e documentos liberados pelo paciente.', 3),
  ('Posso cancelar uma consulta?', 'Sim, com até 4h de antecedência sem custo.', 4);
