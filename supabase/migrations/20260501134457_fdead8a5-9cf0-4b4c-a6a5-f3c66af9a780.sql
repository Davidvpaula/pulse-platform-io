
-- 1. Novos enums
CREATE TYPE public.plano_nivel AS ENUM ('admin', 'medico', 'paciente_custom');
CREATE TYPE public.plano_regra_acesso AS ENUM ('direto', 'pos_consulta');
CREATE TYPE public.origem_receita_assinatura AS ENUM ('consulta', 'servico_plataforma', 'plano_admin', 'plano_medico', 'plano_paciente_custom');

-- 2. Alterar tabela planos
ALTER TABLE public.planos
  ADD COLUMN IF NOT EXISTS nivel plano_nivel NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS regra_acesso plano_regra_acesso NOT NULL DEFAULT 'direto',
  ADD COLUMN IF NOT EXISTS termos_aceitos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS versao integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS plano_base_id uuid REFERENCES public.planos(id);

-- 3. Alterar tabela assinaturas
ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS origem_receita origem_receita_assinatura NOT NULL DEFAULT 'plano_admin';

-- 4. plano_taxa_plataforma
CREATE TABLE public.plano_taxa_plataforma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'percentual' CHECK (tipo IN ('percentual', 'fixo')),
  valor_pct numeric NOT NULL DEFAULT 0,
  valor_fixo_centavos integer NOT NULL DEFAULT 0,
  vigencia_inicio date NOT NULL DEFAULT CURRENT_DATE,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plano_taxa_plataforma ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ver taxas" ON public.plano_taxa_plataforma
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode inserir taxas" ON public.plano_taxa_plataforma
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin pode atualizar taxas" ON public.plano_taxa_plataforma
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. assinatura_snapshot (imutável)
CREATE TABLE public.assinatura_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assinatura_id uuid NOT NULL REFERENCES public.assinaturas(id) ON DELETE CASCADE,
  plano_snapshot jsonb NOT NULL DEFAULT '{}',
  beneficios_snapshot jsonb NOT NULL DEFAULT '[]',
  valor_bruto_centavos integer NOT NULL DEFAULT 0,
  taxa_plataforma_centavos integer NOT NULL DEFAULT 0,
  valor_liquido_medico_centavos integer NOT NULL DEFAULT 0,
  desconto_aplicado_pct numeric NOT NULL DEFAULT 0,
  origem origem_receita_assinatura NOT NULL DEFAULT 'plano_admin',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assinatura_snapshot ENABLE ROW LEVEL SECURITY;

-- Paciente vê snapshot da própria assinatura
CREATE POLICY "Paciente vê próprio snapshot" ON public.assinatura_snapshot
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.assinaturas a
      WHERE a.id = assinatura_snapshot.assinatura_id
        AND a.paciente_id = auth.uid()
    )
  );

-- Admin vê todos
CREATE POLICY "Admin vê todos snapshots" ON public.assinatura_snapshot
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Inserção via sistema (service role ou trigger)
CREATE POLICY "Sistema insere snapshot" ON public.assinatura_snapshot
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. plano_medicos (N:N para planos personalizados)
CREATE TABLE public.plano_medicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES public.planos(id) ON DELETE CASCADE,
  medico_id uuid NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  aceite_medico boolean NOT NULL DEFAULT false,
  aceite_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plano_id, medico_id)
);
ALTER TABLE public.plano_medicos ENABLE ROW LEVEL SECURITY;

-- Médico vê planos onde participa
CREATE POLICY "Médico vê participações" ON public.plano_medicos
  FOR SELECT TO authenticated
  USING (medico_id = auth.uid());

-- Médico pode aceitar (update aceite)
CREATE POLICY "Médico pode aceitar" ON public.plano_medicos
  FOR UPDATE TO authenticated
  USING (medico_id = auth.uid());

-- Paciente vê planos que criou
CREATE POLICY "Criador vê plano_medicos" ON public.plano_medicos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.planos p
      WHERE p.id = plano_medicos.plano_id
        AND p.created_by = auth.uid()
    )
  );

-- Admin vê tudo
CREATE POLICY "Admin vê plano_medicos" ON public.plano_medicos
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Paciente pode inserir (ao montar plano)
CREATE POLICY "Paciente insere plano_medicos" ON public.plano_medicos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.planos p
      WHERE p.id = plano_medicos.plano_id
        AND p.created_by = auth.uid()
        AND p.nivel = 'paciente_custom'
    )
  );

-- 7. desconto_progressivo_regras
CREATE TABLE public.desconto_progressivo_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qtd_medicos_min integer NOT NULL,
  desconto_pct numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(qtd_medicos_min)
);
ALTER TABLE public.desconto_progressivo_regras ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado vê regras ativas (paciente precisa para calcular)
CREATE POLICY "Autenticado vê regras ativas" ON public.desconto_progressivo_regras
  FOR SELECT TO authenticated
  USING (ativo = true);

CREATE POLICY "Admin gerencia regras desconto" ON public.desconto_progressivo_regras
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. RLS para médicos criarem planos próprios
CREATE POLICY "Médico cria plano próprio" ON public.planos
  FOR INSERT TO authenticated
  WITH CHECK (
    medico_id = auth.uid() AND nivel = 'medico'
  );

CREATE POLICY "Médico edita plano próprio" ON public.planos
  FOR UPDATE TO authenticated
  USING (medico_id = auth.uid() AND nivel = 'medico');

CREATE POLICY "Médico vê planos próprios" ON public.planos
  FOR SELECT TO authenticated
  USING (medico_id = auth.uid() AND nivel = 'medico');

-- 9. Trigger para preencher origem_receita automaticamente na assinatura
CREATE OR REPLACE FUNCTION public.set_origem_receita_assinatura()
RETURNS TRIGGER AS $$
DECLARE
  _nivel plano_nivel;
BEGIN
  SELECT nivel INTO _nivel FROM public.planos WHERE id = NEW.plano_id;
  IF _nivel = 'admin' THEN
    NEW.origem_receita := 'plano_admin';
  ELSIF _nivel = 'medico' THEN
    NEW.origem_receita := 'plano_medico';
  ELSIF _nivel = 'paciente_custom' THEN
    NEW.origem_receita := 'plano_paciente_custom';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_set_origem_receita
  BEFORE INSERT ON public.assinaturas
  FOR EACH ROW
  EXECUTE FUNCTION public.set_origem_receita_assinatura();

-- 10. Trigger para criar snapshot imutável ao inserir assinatura
CREATE OR REPLACE FUNCTION public.create_assinatura_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  _plano jsonb;
  _beneficios jsonb;
  _taxa_pct numeric := 0;
  _taxa_fixo integer := 0;
  _taxa_total integer := 0;
  _nivel plano_nivel;
BEGIN
  -- Snapshot do plano
  SELECT to_jsonb(p.*) INTO _plano FROM public.planos p WHERE p.id = NEW.plano_id;
  -- Snapshot dos benefícios
  SELECT COALESCE(jsonb_agg(to_jsonb(b.*)), '[]'::jsonb) INTO _beneficios
  FROM public.plano_beneficios b WHERE b.plano_id = NEW.plano_id;

  _nivel := (_plano->>'nivel')::plano_nivel;

  -- Calcular taxa da plataforma (apenas para planos de médico)
  IF _nivel = 'medico' THEN
    SELECT COALESCE(t.valor_pct, 0), COALESCE(t.valor_fixo_centavos, 0)
    INTO _taxa_pct, _taxa_fixo
    FROM public.plano_taxa_plataforma t
    WHERE t.ativo = true
    ORDER BY t.vigencia_inicio DESC
    LIMIT 1;

    _taxa_total := GREATEST(
      ROUND(NEW.valor_cobrado_centavos * _taxa_pct / 100),
      _taxa_fixo
    );
  END IF;

  INSERT INTO public.assinatura_snapshot (
    assinatura_id, plano_snapshot, beneficios_snapshot,
    valor_bruto_centavos, taxa_plataforma_centavos, valor_liquido_medico_centavos,
    desconto_aplicado_pct, origem
  ) VALUES (
    NEW.id, _plano, _beneficios,
    NEW.valor_cobrado_centavos, _taxa_total,
    CASE WHEN _nivel = 'medico' THEN NEW.valor_cobrado_centavos - _taxa_total ELSE 0 END,
    0, NEW.origem_receita
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_create_assinatura_snapshot
  AFTER INSERT ON public.assinaturas
  FOR EACH ROW
  EXECUTE FUNCTION public.create_assinatura_snapshot();
