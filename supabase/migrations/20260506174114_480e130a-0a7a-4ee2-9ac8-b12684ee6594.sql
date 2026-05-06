
-- ============================================
-- FIX: planos
-- ============================================

-- SELECT
DROP POLICY "Médico vê planos próprios" ON public.planos;
CREATE POLICY "Médico vê planos próprios" ON public.planos
FOR SELECT USING (
  (nivel = 'medico'::plano_nivel)
  AND EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = planos.medico_id AND m.user_id = auth.uid())
);

-- INSERT
DROP POLICY "Médico cria plano próprio" ON public.planos;
CREATE POLICY "Médico cria plano próprio" ON public.planos
FOR INSERT WITH CHECK (
  (nivel = ANY (ARRAY['medico'::plano_nivel, 'admin'::plano_nivel]))
  AND EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = planos.medico_id AND m.user_id = auth.uid())
);

-- UPDATE
DROP POLICY "Médico edita plano próprio" ON public.planos;
CREATE POLICY "Médico edita plano próprio" ON public.planos
FOR UPDATE USING (
  (nivel = 'medico'::plano_nivel)
  AND EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = planos.medico_id AND m.user_id = auth.uid())
);

-- ============================================
-- FIX: plano_cancelamento_evento
-- ============================================

DROP POLICY "Médico vê cancelamentos próprios" ON public.plano_cancelamento_evento;
CREATE POLICY "Médico vê cancelamentos próprios" ON public.plano_cancelamento_evento
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = plano_cancelamento_evento.medico_id AND m.user_id = auth.uid())
);

DROP POLICY "Médico cria cancelamento" ON public.plano_cancelamento_evento;
CREATE POLICY "Médico cria cancelamento" ON public.plano_cancelamento_evento
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = plano_cancelamento_evento.medico_id AND m.user_id = auth.uid())
  AND EXISTS (SELECT 1 FROM public.planos p JOIN public.medicos m2 ON m2.id = p.medico_id WHERE p.id = plano_cancelamento_evento.plano_id AND m2.user_id = auth.uid())
);

-- ============================================
-- FIX: plano_medico_status_log
-- ============================================

DROP POLICY "Médico vê status log próprio" ON public.plano_medico_status_log;
CREATE POLICY "Médico vê status log próprio" ON public.plano_medico_status_log
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = plano_medico_status_log.medico_id AND m.user_id = auth.uid())
);

-- ============================================
-- FIX: plano_medicos
-- ============================================

DROP POLICY "Médico vê participações" ON public.plano_medicos;
CREATE POLICY "Médico vê participações" ON public.plano_medicos
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = plano_medicos.medico_id AND m.user_id = auth.uid())
);

DROP POLICY "Médico insere própria participação" ON public.plano_medicos;
CREATE POLICY "Médico insere própria participação" ON public.plano_medicos
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = plano_medicos.medico_id AND m.user_id = auth.uid())
);

DROP POLICY "Médico pode aceitar" ON public.plano_medicos;
CREATE POLICY "Médico pode aceitar" ON public.plano_medicos
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = plano_medicos.medico_id AND m.user_id = auth.uid())
);

-- ============================================
-- FIX: propostas_empresa_medico
-- ============================================

DROP POLICY "Medico ve propostas enviadas" ON public.propostas_empresa_medico;
CREATE POLICY "Medico ve propostas enviadas" ON public.propostas_empresa_medico
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = propostas_empresa_medico.medico_id AND m.user_id = auth.uid())
  AND (status = ANY (ARRAY['enviada_medico'::proposta_empresa_status, 'aceita'::proposta_empresa_status, 'recusada'::proposta_empresa_status, 'convertida'::proposta_empresa_status]))
);

DROP POLICY "Medico responde propostas" ON public.propostas_empresa_medico;
CREATE POLICY "Medico responde propostas" ON public.propostas_empresa_medico
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = propostas_empresa_medico.medico_id AND m.user_id = auth.uid())
  AND (status = ANY (ARRAY['enviada_medico'::proposta_empresa_status, 'aceita'::proposta_empresa_status]))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = propostas_empresa_medico.medico_id AND m.user_id = auth.uid())
  AND (status = ANY (ARRAY['aceita'::proposta_empresa_status, 'recusada'::proposta_empresa_status, 'convertida'::proposta_empresa_status]))
);

-- ============================================
-- FIX: reembolso_planos
-- ============================================

DROP POLICY "Médico vê reembolsos planos próprios" ON public.reembolso_planos;
CREATE POLICY "Médico vê reembolsos planos próprios" ON public.reembolso_planos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.planos p
    JOIN public.medicos m ON m.id = p.medico_id
    WHERE p.id = reembolso_planos.plano_id AND m.user_id = auth.uid()
  )
);
