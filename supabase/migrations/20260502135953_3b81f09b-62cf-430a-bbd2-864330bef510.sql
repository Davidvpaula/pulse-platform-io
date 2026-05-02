
-- Fix termos_condicoes admin policies to use has_role()
DROP POLICY IF EXISTS "admin_termos_select" ON public.termos_condicoes;
DROP POLICY IF EXISTS "admin_termos_insert" ON public.termos_condicoes;
DROP POLICY IF EXISTS "admin_termos_update" ON public.termos_condicoes;

CREATE POLICY "admin_termos_select" ON public.termos_condicoes
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_termos_insert" ON public.termos_condicoes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_termos_update" ON public.termos_condicoes
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Fix user_terms_acceptance admin policy
DROP POLICY IF EXISTS "admin_acceptance_select_all" ON public.user_terms_acceptance;

CREATE POLICY "admin_acceptance_select_all" ON public.user_terms_acceptance
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
