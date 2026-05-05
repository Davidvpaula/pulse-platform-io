
## Problema

O médico não tem acesso ao Inbox no menu. Além disso, o componente Inbox carrega TODAS as conversas sem filtro por perfil — qualquer usuário que acesse `/app/comunicacao/inbox` vê tudo.

## Solução

### 1. Adicionar "Inbox" no menu do médico

**Arquivo:** `src/lib/profiles.ts`

Adicionar entre "Mensagens das consultas" e "Comunicação interna":
```ts
{ label: "Inbox", to: "/app/comunicacao/inbox", icon: Inbox }
```

### 2. Modo restrito no componente Inbox para médicos

**Arquivo:** `src/pages/app/comunicacao/Inbox.tsx`

Detectar o perfil ativo via `profileFromPath(location.pathname)` ou verificar se o usuário tem registro na tabela `medicos`. Quando o perfil for médico:

**Filtro de conversas:**
- Carregar apenas conversas onde `medico_id = user.id` (médico logado)
- Aplicar filtro de janela temporal: só exibir conversas cuja consulta vinculada tenha `inicio` dentro do intervalo permitido (usar configs `inbox.janela_pos_consulta_dias` e `inbox.medico_iniciar_pos_consulta` da tabela `app_settings`)

**Bloqueio de ações:**
- Esconder botões: "Assumir conversa", "Transferir", toggle Bot, toggle IA
- Manter apenas: ler mensagens e enviar resposta (se dentro da janela e `medico_iniciar_pos_consulta` estiver ativo)
- Esconder filtros "Não atribuídas", "Bot", "IA", "Suporte" (médico só vê as dele)

**Mensagem de acesso negado:**
- Se o médico tentar abrir uma conversa fora da janela ou que não é dele, exibir mensagem clara: "Você não tem permissão para acessar esta conversa..."

**Painel lateral direito:**
- Esconder seção "Acesso temporário" (funcionalidade admin/colaborador)

### 3. Navegação dos botões WhatsApp

Os botões WhatsApp no dashboard médico (`MedicoConsultas.tsx`, `MedicoPacientes.tsx`) já foram atualizados na iteração anterior para apontar para rotas internas. Verificar se estão apontando para `/app/comunicacao/inbox?conv={id}` em vez de `/app/medico/mensagens?conv={id}` — ajustar se necessário para que abram o Inbox unificado.

### 4. Comportamento do query param `?conv=`

O Inbox já suporta abrir conversa por query param. Garantir que quando o médico navega via botão WhatsApp com `?conv={consulta_id}`, o componente encontre a conversa pela `consulta_id` e a selecione automaticamente (apenas se pertencer ao médico).

---

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `src/lib/profiles.ts` | Adicionar item "Inbox" no nav do médico |
| `src/pages/app/comunicacao/Inbox.tsx` | Adicionar lógica de modo restrito para médicos |
| `src/pages/app/medico/MedicoConsultas.tsx` | Ajustar link WhatsApp para `/app/comunicacao/inbox?conv=` (se necessário) |
| `src/pages/app/medico/MedicoPacientes.tsx` | Idem |

## Detalhes Técnicos

- Detecção de perfil médico: verificar se `user.id` existe na tabela `medicos` (query única no mount)
- Janela temporal calculada client-side: `consulta.inicio - 10min` até `consulta.inicio + N dias` (N = `inbox.janela_pos_consulta_dias`)
- RLS já protege no backend (conversas com `medico_id`), mas o filtro client-side garante UX limpa
- Nenhuma migração de banco necessária — as tabelas e configs já existem
