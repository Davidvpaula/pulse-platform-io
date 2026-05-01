
-- Helper: check if current user is the patient linked to a conversation
CREATE OR REPLACE FUNCTION public.is_paciente_da_conversa(_conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.pacientes p ON p.id = c.patient_id
    WHERE c.id = _conversation_id
      AND p.user_id = auth.uid()
  );
$$;

-- Update user_can_view_conversation to include patient access
CREATE OR REPLACE FUNCTION public.user_can_view_conversation(_conv_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_permission(auth.uid(), 'comunicacao.ver_todas')
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = _conv_id
        AND (
          c.assigned_to = auth.uid()
          OR (public.has_permission(auth.uid(), 'comunicacao.ver_atribuidas') AND c.assigned_to = auth.uid())
        )
    )
    OR public.is_medico_da_conversa(_conv_id)
    OR public.is_paciente_da_conversa(_conv_id);
$$;

-- Paciente can see their own conversations
CREATE POLICY "Paciente ve suas conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (is_paciente_da_conversa(id));

-- Paciente can send messages in their conversations
CREATE POLICY "Paciente envia messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    is_paciente_da_conversa(conversation_id)
    AND sender_type = 'paciente'::message_sender_type
  );
