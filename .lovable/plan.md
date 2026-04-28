## Onda 1 — Unificar Auth real (Supabase) com seletor demo como atalho de dev

### Objetivo

Hoje o app vive com dois sistemas paralelos de identidade: `AuthProvider` (mock baseado em `localStorage`, decide qual menu/perfil aparece) e `SessionProvider` (sessão real Supabase, usado só por médicos). Isso cria risco de bug e impede ligar features reais (pagamento, prontuário, Feegow) com segurança. Vamos unificar mantendo o seletor de demo apenas em ambiente de desenvolvimento.

### O que muda para o usuário

- Em produção: ao acessar `/app/*` sem estar logado, vai para `/auth` (login/cadastro).
- Cadastro público cria conta como **paciente** automaticamente. Médico continua com fluxo dedicado em `/cadastro/medico`. Secretaria/empresa/admin só por convite ou promoção manual (admin).
- Em desenvolvimento (`import.meta.env.DEV`): o seletor de perfil continua aparecendo como atalho, **mas** se houver sessão real, ela tem prioridade sobre o mock.
- Botão "Sair" no header faz logout real.
- Médico não-aprovado continua sendo redirecionado para `/app/medico/aguardando-aprovacao`.

### Arquitetura

```text
SessionProvider (real)            AuthProvider (papel ativo + UI)
  - session / user                  - profileKey (deriva de roles reais
  - roles[] do user_roles             quando logado, ou do localStorage
  - loading                           apenas em DEV sem sessão)
        │                              - capabilities
        └──────────►  Único hook useAuth() consumido pelo app
                       (mantém API atual: profileKey, user, capabilities)

ProtectedRoute  ──► envolve <Route path="/app">
  - se loading → splash
  - se !session && !DEV → redirect /auth
  - se session && roles vazias → /auth/escolher-perfil (raro)
```

### Banco de dados

Pequena migração para destravar:

1. `profiles.email` recebe trigger garantindo unicidade (já vem do auth, mas validar).
2. RLS de `profiles`: adicionar policy `INSERT` (necessária para o trigger `handle_new_user` funcionar com `SECURITY DEFINER` — atualmente está bloqueado, mas o trigger passa por causa do definer; documentar).
3. Função `promote_to_admin(_email text)` (`SECURITY DEFINER`, callable só por admin existente OU sem nenhum admin no sistema — bootstrap) para promover seu primeiro usuário sem precisar de SQL manual.
4. Criar policy admin em `user_roles` permitindo que admin atribua/remova papéis.

### Mudanças de código

| Arquivo | O que faço |
|---|---|
| `src/lib/session.tsx` | Já está OK. Adicionar helper `isDev = import.meta.env.DEV`. |
| `src/lib/auth.tsx` | `AuthProvider` passa a consumir `useSession()`. Quando `session` existe, `profileKey` é derivado de `roles[0]` (com prioridade admin > medico > secretaria > empresa > paciente). Quando não existe e está em DEV, mantém o `localStorage` atual. Adicionar `signOut()`. |
| `src/components/ProtectedRoute.tsx` | Novo. Splash enquanto `loading`; redirect `/auth` se sem sessão em produção. |
| `src/App.tsx` | Envolver `<Route path="/app">` com `<ProtectedRoute>`. `SessionProvider` precisa estar **fora** de `AuthProvider` (já está). |
| `src/pages/auth/Auth.tsx` | Já tem login email+senha e Google. Garantir que signup público sempre manda `role: 'paciente'` no `raw_user_meta_data`. Adicionar link "esqueci a senha" + página `/reset-password`. |
| `src/pages/public/Login.tsx` (ou similar) | Redirecionar para `/auth`. |
| `src/layouts/AppLayout.tsx` | Botão de logout real. Mostrar nome do usuário a partir de `profiles` quando logado. Seletor de perfil só renderiza se `import.meta.env.DEV && !session`. |
| `src/components/MedicoGuard.tsx` | Usar `useSession()` (já indireto via `useMedicoAguardandoAprovacao`). Sem mudança grande. |

### Contas de teste

Não vou fazer seed automático (você pediu "manter como atalho de dev"). Em DEV o seletor continua disponível, então não precisa criar 5 contas. Em produção, depois do deploy, você cria sua conta admin e roda no SQL Editor:

```sql
SELECT public.promote_to_admin('seu-email@dominio.com');
```

### Riscos e mitigação

- **Risco:** `AuthProvider` hoje é importado em ~30 lugares com `useAuth()`. **Mitigação:** mantenho a mesma API pública (`profileKey`, `user`, `capabilities`, `hasCapability`). Nenhuma página precisa mudar.
- **Risco:** usuário logado real entra com role `paciente` mas `localStorage` tem `admin` salvo de uma sessão de demo anterior → vê menu de admin sem permissão. **Mitigação:** quando há sessão real, `localStorage` é ignorado (sessão > demo).
- **Risco:** o trigger `handle_new_user` falha silenciosamente se `raw_user_meta_data` vier sem `nome`. **Mitigação:** o trigger atual já trata com `COALESCE`, mantém.

### Critérios de aceite

1. Acessar `/app/admin/dashboard` em produção sem login redireciona para `/auth`.
2. Cadastro novo via `/auth` cria linha em `auth.users`, `profiles` e `user_roles` (role = paciente).
3. Login → entra em `/app/paciente/dashboard` automaticamente.
4. Em DEV, sem login, seletor de demo continua funcionando.
5. Em DEV, com login real ativo, seletor fica oculto e o perfil vem do banco.
6. Logout limpa sessão e devolve para `/auth`.
7. `promote_to_admin('email')` funciona apenas para admin existente, ou para qualquer usuário enquanto não houver admin no sistema (bootstrap).

### Fora desta onda (próximas)

- Onda 2: tabelas clínicas (pacientes, agenda, consultas, prontuário) com RLS.
- Onda 3: Stripe (Pix + cartão) + webhook libera consulta.
- Onda 4: edge function proxy Feegow + sincronização.
- Onda 5: empresa/colaboradores no banco.
- Onda 6: audit_log global, rate-limit, HIBP.
