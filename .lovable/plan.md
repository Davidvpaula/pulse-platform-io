## FAQ — formulários de contato + feedback + recebimento no Admin

### 1. Página pública `/faq`

Abaixo da lista de perguntas, adicionar duas seções (ref. imagens enviadas):

**A. "Confira os Termos de Uso e Condições"** (faixa em primary)
- Botão `Ler termos` → `/termos`.
- Card com formulário: **Nome**, **Sobrenome**, **Telefone**, **Email** + botão **Enviar**.
- Validação com `zod` (email obrigatório, demais opcionais com limite de caracteres).
- Insere em `feedbacks_site` com `tipo = 'contato'`.

**B. "Formulário de FeedBack"** (card escuro com cabeçalho)
- Campos: **Nome\***, **Sobrenome\***, **Email\***, **Mensagem\*** (textarea) + botão **Enviar**.
- Validação `zod` (todos obrigatórios; mensagem máx. 2000).
- Insere em `feedbacks_site` com `tipo = 'feedback'`.

Ambos exibem toast de sucesso/erro e limpam o formulário. Captura `user_agent` no insert. Sem coleta extra de IP no client (o servidor pode preencher via trigger se quisermos no futuro — não escopo agora).

### 2. Backend (Lovable Cloud)

Migração com:

```sql
create type feedback_tipo as enum ('contato', 'feedback');
create type feedback_status as enum ('novo', 'lido', 'arquivado');

create table public.feedbacks_site (
  id uuid primary key default gen_random_uuid(),
  tipo feedback_tipo not null,
  nome text,
  sobrenome text,
  telefone text,
  email text not null,
  mensagem text,
  user_agent text,
  status feedback_status not null default 'novo',
  lido_em timestamptz,
  lido_por uuid,
  created_at timestamptz not null default now()
);

alter table public.feedbacks_site enable row level security;

-- Insert público (qualquer visitante)
create policy "anon insert feedback" on public.feedbacks_site
  for insert to anon, authenticated with check (true);

-- Admin pode ver e atualizar
create policy "admin select" on public.feedbacks_site
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin update" on public.feedbacks_site
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
```

Validação extra via trigger: `email` precisa ter formato simples e `length(mensagem) <= 2000`.

### 3. Admin — nova página `/app/admin/feedbacks`

- Arquivo: `src/pages/app/admin/AdminFeedbacks.tsx`.
- Lista paginada com filtros: tipo (todos / contato / feedback) e status (novo / lido / arquivado).
- Cada item mostra: tipo (badge), nome+sobrenome, email, telefone (se houver), trecho da mensagem, data.
- Ações: **Marcar como lido**, **Arquivar**, **Abrir detalhe** (drawer com mensagem completa, copiar email).
- Badge de contagem de "novos" no topo da página.
- Realtime opcional (pulando agora — apenas refetch manual + ao montar).

Adicionar entrada no menu admin (`src/lib/profiles.ts`, logo após "FAQ do Site"):

```ts
{ label: "Feedbacks do site", to: "/app/admin/feedbacks", icon: Inbox },
```

Rota em `src/App.tsx`:
```tsx
<Route path="admin/feedbacks" element={<G perm="admin.dashboard"><AdminFeedbacks /></G>} />
```

### Arquivos afetados

- Novo: `src/pages/app/admin/AdminFeedbacks.tsx`
- Novo: `src/components/public/FaqContactForms.tsx` (os 2 formulários)
- Editado: `src/pages/public/PublicPages.tsx` (renderiza `<FaqContactForms />` no fim do `Faq`)
- Editado: `src/lib/profiles.ts` (item de menu)
- Editado: `src/App.tsx` (rota)
- Migração SQL: tabela + enums + RLS.

Sem alterações em integrações externas. Sem dependência de Stripe/WhatsApp.
