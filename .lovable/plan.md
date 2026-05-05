## Notificações automáticas de reembolso (paciente + médico)

### 1. Criar edge function `notificar-reembolso`
Edge function que recebe `{ reembolso_id, evento }` e:
- Busca dados do reembolso, consulta, paciente e médico
- Cria/reutiliza conversa canal "sistema" para cada destinatário
- Insere mensagem no inbox com texto contextual (valor, data, motivo, status)
- Atualiza `last_message_at` e `unread_count` da conversa

Eventos: `solicitado`, `aprovado`, `recusado`, `concluido`

### 2. Disparar notificação na criação do reembolso
No `PacientePerfil.tsx`, após o `insert` bem-sucedido na tabela `reembolsos`, chamar `supabase.functions.invoke("notificar-reembolso", { body: { reembolso_id, evento: "solicitado" } })`.

### 3. Disparar notificação na mudança de status
No `AdminFinanceiroCentral.tsx` (onde o admin atualiza status do reembolso), após update bem-sucedido, chamar a edge function com o evento correspondente (`concluido`, `aprovado`, `recusado`).

### 4. Deploy da edge function
Deploy automático do `notificar-reembolso`.
