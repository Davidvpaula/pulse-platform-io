
-- ============================================================
-- 1. Adicionar valores faltantes ao enum consulta_canal
-- ============================================================
ALTER TYPE public.consulta_canal ADD VALUE IF NOT EXISTS 'pa_publico';
ALTER TYPE public.consulta_canal ADD VALUE IF NOT EXISTS 'servico_plataforma';

-- ============================================================
-- 2. Liberar slots reservados expirados
-- ============================================================
UPDATE public.agenda_slots
SET status = 'disponivel',
    reservado_por = NULL,
    reserva_expira_em = NULL,
    updated_at = now()
WHERE status = 'reservado'
  AND reserva_expira_em < now();

-- ============================================================
-- 3. Corrigir recursão RLS em pacientes
-- ============================================================

-- Função SECURITY DEFINER que verifica vínculo médico-paciente
-- Bypassa RLS para evitar o loop pacientes → consultas → pacientes
CREATE OR REPLACE FUNCTION public.medico_tem_consulta_com_paciente(
  _medico_user_id uuid,
  _paciente_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.consultas c
    JOIN public.medicos m ON m.id = c.medico_id
    WHERE m.user_id = _medico_user_id
      AND c.paciente_id = _paciente_id
  );
$$;

-- Remover a policy recursiva (ambas grafias possíveis)
DROP POLICY IF EXISTS "Medico ve pacientes vinculados" ON public.pacientes;
DROP POLICY IF EXISTS "Medico vê pacientes vinculados" ON public.pacientes;

-- Recriar usando a função SECURITY DEFINER (sem recursão)
CREATE POLICY "Medico vê pacientes vinculados"
  ON public.pacientes
  FOR SELECT
  TO authenticated
  USING (
    public.medico_tem_consulta_com_paciente(auth.uid(), id)
  );
