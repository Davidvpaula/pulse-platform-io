## FASE 4 — Templates Meta + Janela 24h (SAFE/FREEZE)

Extensão incremental do que já existe. **Não recriar tabelas**, **não trocar provider**, **não mexer em RLS validada**.

### Estado atual já implementado (reaproveitar)

- `conversation_meta_window` (last_inbound_at, window_expires_at) + trigger no inbound — **OK**
- `message_templates` (name, category, language, content, variables, whatsapp_status, whatsapp_template_name, active) — **OK**
- Página `/app/comunicacao/templates` (CRUD básico) — **OK**
- `whatsapp-enviar` já tem guard 24h (retorna 422 `requires_template`) e aceita `template_name` + `template_params` — **OK**
- `Janela24hMeta.tsx` já mostra estado visual no painel direito — **OK**

### O que falta (entregáveis da Fase 4)

#### 1. Migration única (aditiva)
- Tabela nova **`whatsapp_template_logs`**: `id, conversation_id, template_id, template_name, telefone, payload jsonb, provider_response jsonb, wa_message_id, status (sent|failed), erro text, enviado_por uuid, created_at`. RLS: admin/colaborador SELECT; INSERT só service role.
- Adicionar em `message_templates`: `header_type` (text|image|none), `footer text`, `buttons jsonb`, `meta_template_id text`, `aprovado_em timestamptz` — campos opcionais para compatibilidade Cloud API futura.
- Função `get_meta_window_state(p_conversation_id uuid)` retornando `{open, expires_at, remaining_seconds}` — fonte única de verdade para frontend e backend.

#### 2. Backend — adapter pattern
- Novo arquivo `supabase/functions/_shared/wa-providers.ts` com interface `WhatsAppProvider` e implementação `MetaCloudProvider` (atual). Estrutura preparada para `EvolutionProvider` futuro sem hardcode.
- `whatsapp-enviar` refatorado para usar o adapter (mantém comportamento; só reorganiza). Após envio com `template_name`, **gravar log** em `whatsapp_template_logs`.
- Nova função `whatsapp-template-send` (wrapper fino para envio explícito de template a partir do modal — valida template ativo, variáveis obrigatórias preenchidas, telefone válido, registra log mesmo em falha).

#### 3. Inbox — UI de janela + reabertura
- Quando janela expirada e usuário tenta enviar texto livre: bloquear `enviar()` no front + banner amarelo "Janela 24h encerrada — use template oficial" + botão **"Usar template oficial"**.
- Tratar resposta 422 `requires_template` da edge function (já existe) abrindo o modal automaticamente.
- Badges no header da conversa: `Janela ativa` / `Janela expirada` / `Template enviado` / `Falha template` (consumindo `messages.message_type='template'` + último log).

#### 4. Modal `EnviarTemplateDialog.tsx`
- Select de templates ativos (filtro por categoria: utility/marketing/authentication).
- Preview renderizado com substituição de variáveis em tempo real.
- Inputs dinâmicos por variável detectada (`{nome}`, `{data}`, etc.).
- Telefone destino pré-preenchido, editável.
- Botão Confirmar → invoca `whatsapp-template-send`. Toast sucesso/erro com motivo do provider.

#### 5. Templates page — incremento mínimo
- Adicionar coluna **categoria Meta** (utility/marketing/authentication) no formulário existente (campo `category` já aceita; apenas surfacear no UI).
- Badge "aprovado_meta" visual quando `whatsapp_status='aprovado'`.
- Não refatorar a página inteira.

#### 6. Estados visuais e auditoria
- `AuditLogDrawer` já existe — adicionar entry quando template é enviado (via trigger leve ou insert no próprio wrapper).
- Toast/banner padronizado de "Falha no envio do template" com `provider_response.error.message`.

#### 7. Cron leve (opcional, baixo custo)
- pg_cron a cada 1h: marcar conversas com `window_expires_at < now()` em uma view materializada simples ou apenas confiar em consulta on-demand (preferido — sem cron, sem custo).
- **Decisão:** usar consulta on-demand via `get_meta_window_state`. Sem cron nessa fase.

### Não fazer agora (reservado para Fase 5)
- Filas, SLA, transferência multi-atendente real, supervisão.
- Sincronizar templates direto da API Meta (manual por enquanto).
- IA automática, automações disparando templates.

### Arquivos afetados

**Criar:**
- `supabase/migrations/<novo>.sql` (tabela logs + colunas + função)
- `supabase/functions/_shared/wa-providers.ts`
- `supabase/functions/whatsapp-template-send/index.ts`
- `src/components/comunicacao/EnviarTemplateDialog.tsx`
- `src/components/comunicacao/JanelaExpiradaBanner.tsx`

**Editar (mínimo cirúrgico):**
- `supabase/functions/whatsapp-enviar/index.ts` (usar adapter + log de template)
- `src/pages/app/comunicacao/Inbox.tsx` (banner expirada + handler 422 + abrir modal)
- `src/pages/app/comunicacao/Templates.tsx` (badge aprovado, categoria Meta)
- `supabase/config.toml` (adicionar `[functions.whatsapp-template-send]` se necessário)

### Critérios de aceite
1. Janela aberta → envio texto normal funciona como hoje.
2. Janela expirada → envio texto bloqueado no front + back (422).
3. Botão "Usar template oficial" abre modal, lista templates ativos, faz envio real (sandbox).
4. Todo envio de template grava em `whatsapp_template_logs` (sucesso ou falha).
5. Inbox mostra badge correto por mensagem (template enviado / falha).
6. Trocar provider no futuro = trocar implementação no adapter, sem tocar Inbox.
7. Build + TS limpos. RLS preservada. Webhook intacto.
