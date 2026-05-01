## Objetivo

Reorganizar perfis e unificar a fonte de verdade do menu lateral:

- **Paciente**, **Médico**, **Empresa**, **Admin**: cada um com menu base próprio (lista fixa de itens).
- **Colaborador**: menu **dinâmico**, sem nenhuma lista fixa — itens aparecem somente conforme `has_permission` retornar `true` para o usuário logado, dado o que o Admin liberou (grant individual, função interna como Secretaria/Supervisor/Financeiro/Comercial/Suporte, ou permissão de role).
- Menu e rota passam a usar a **mesma** fonte: `has_permission` (RPC do banco). O filtro mock `hasCapability` deixa de ser usado em decisões reais.

## O que existe hoje (confirmado)

- Roles do banco (enum `app_role`): `paciente, medico, secretaria, empresa, admin, supervisor`.
- Tabelas reais já em uso: `permissions_catalog` (com `permission_key`, `modulo`, `descricao`), `permissoes_perfil` (defaults por role), `permissoes_colaborador` (grant/revoke por usuário), `function_permissions` (por função interna), `colaboradores` (`funcao_interna`, `status_conta`).
- RPC `has_permission(_user_id, _key)` já cobre: bypass admin → revoke individual → grant individual → função interna → permissão por role. Esta é a fonte oficial.
- O perfil "Colaborador" hoje está fundido com o `secretaria` no `profiles.ts` (lista fixa). Vamos separá-lo conceitualmente.

## Plano

### 1. Catálogo do menu por chave de permissão

Arquivo novo: `src/lib/menu/menuCatalog.ts`.

Define **todos** os possíveis itens do menu de Colaborador como objetos:

```text
{ key: "financeiro.ver", label: "Financeiro", to: "/app/colaborador/financeiro",
  icon: Wallet, modulo: "Financeiro", ordem: 30 }
```

Itens com sub-rotas (ex.: Comunicação, Supervisão) declaram `children`, cada filho com sua própria `key`. Um pai aparece se **qualquer** filho tiver permissão.

A ordem segue a coluna `ordem` do `permissions_catalog` quando aplicável; senão, ordem manual no catálogo.

### 2. Novo perfil `colaborador` em `profiles.ts`

- Adiciona `ProfileKey = "colaborador"` (mantém os outros 4 fixos).
- `profiles.colaborador.nav` fica **vazio** (`[]`) — sinal de "menu dinâmico".
- `basePath: "/app/colaborador"` (rotas reaproveitam as existentes em `/app/secretaria/*` via redirects ou alias; ver passo 6).
- Atualiza `rolesToProfileKey` e `ROLE_PRIORITY` em `auth.tsx`:
  - Se o usuário tem role `secretaria` ou `supervisor`, ou existe registro em `colaboradores` para o `user_id`, o perfil ativo vira `colaborador`.
  - Prioridade: `admin > medico > colaborador > empresa > paciente`.
- O perfil antigo `secretaria` deixa de ser exibido como dashboard separado; vira detalhe de "função interna" dentro de Colaborador.

### 3. Hook `usePermissionsBatch`

Arquivo novo: `src/lib/permissions/usePermissionsBatch.ts`.

- Recebe um `string[]` de chaves.
- Verifica role admin (uma chamada `has_role` com cache) — se admin, retorna todas as chaves como `true` sem ir ao banco para cada uma.
- Caso contrário, faz `Promise.all` de `has_permission` reaproveitando o cache do `usePermission` atual (`cache` do módulo). Memoiza a entrada por `keys.sort().join("|")` para evitar refetch a cada render.
- Retorna `{ loading, has(key), allowed: Record<string, boolean> }`.

### 4. Refatorar `SidebarBody` (`src/layouts/AppLayout.tsx`)

Lógica nova:

```text
1. Se profileKey ∈ {paciente, medico, empresa, admin}:
     - usa profile.nav fixo (como hoje)
     - chaves coletadas dos itens com requiresCapability são consultadas via usePermissionsBatch
     - admin: bypass total (todas chaves = true)
2. Se profileKey === "colaborador":
     - usa o catálogo do passo 1
     - chaves = todas as keys do catálogo (itens + filhos)
     - usePermissionsBatch retorna o mapa
     - itens visíveis = aqueles com has(key) === true (e pais com pelo menos 1 filho permitido)
3. Enquanto loading: renderiza skeleton de 6-8 linhas no lugar do <ul>, sem piscar.
4. Modo demo (DEV && !session): exibe TUDO do menu do perfil escolhido — bypass local, sem chamar RPC. Garante que o switcher de perfis em desenvolvimento siga útil.
```

Remove de `SidebarBody`:
- `useAuth().hasCapability` (não decide mais o menu real).
- O bypass por `profileKey === "admin"` baseado em string (admin agora é detectado via role).

### 5. Limpeza em `abilities.ts` e `auth.tsx`

- `Capability` deixa de listar chaves do banco (`financeiro.ver`, `auditoria.ver`, etc.). Mantém só caps puramente cosméticas/demo, se houver — caso contrário, marca `hasCapability` como `@deprecated` no `useAuth`.
- `defaultCapabilities` reduzido (ou removido se ninguém mais consome — vou confirmar com `rg "hasCapability"` antes de apagar).
- `useAuth` continua expondo `hasCapability` para retrocompatibilidade temporária, mas o menu não usa mais.

### 6. Rotas do colaborador

- Mantém as URLs existentes (`/app/secretaria/*`) funcionando para não quebrar links externos/bookmarks.
- Adiciona aliases `/app/colaborador/*` redirecionando para as mesmas páginas (mesmo componente, rota duplicada). O guard de cada rota continua sendo `RequireRoutePermission` com a `perm` correspondente — fonte única.
- O catálogo do menu (passo 1) aponta para `/app/colaborador/...`.

### 7. Garantia de coerência (dev only)

Adiciona, em `src/lib/menu/validateMenuKeys.ts`, uma checagem em `import.meta.env.DEV`: ao montar o catálogo, faz `select permission_key from permissions_catalog` (uma vez) e loga `console.warn` para qualquer `key` referenciada no menu que não exista no catálogo. Evita typos silenciosos no futuro.

## Fora de escopo (próximas iterações)

- UI de "atribuir função interna" / "liberar permissão pontual" — já existe em `Permissoes.tsx`; só vamos validar que ela escreve em `permissoes_colaborador` e `colaboradores.funcao_interna`.
- Migrar dados de antigos usuários `secretaria` para registros em `colaboradores` (se necessário, fazemos depois com migração dedicada).

## Arquivos alterados

**Novos**
- `src/lib/menu/menuCatalog.ts`
- `src/lib/menu/validateMenuKeys.ts`
- `src/lib/permissions/usePermissionsBatch.ts`

**Editados**
- `src/layouts/AppLayout.tsx` — `SidebarBody` reescrito.
- `src/lib/profiles.ts` — adiciona perfil `colaborador` (nav vazio); itens fixos dos demais perfis preservados.
- `src/lib/auth.tsx` — `ROLE_PRIORITY`, `rolesToProfileKey` reconhecendo `colaborador`; `hasCapability` marcado deprecated.
- `src/lib/abilities.ts` — limpeza do `Capability`/`defaultCapabilities`.
- `src/App.tsx` — aliases `/app/colaborador/*` apontando para os mesmos componentes de `/app/secretaria/*`.

## Impacto

- **Sem migração de banco.** A função `has_permission` e tabelas já estão prontas.
- **Sem quebra de URL.** Rotas antigas de secretaria continuam respondendo.
- **Menu do colaborador passa a refletir 1:1** o que o Admin libera no painel de Permissões.
- **Risco baixo**: as rotas já são protegidas pelo `RequireRoutePermission` há tempo; só estamos alinhando o menu à mesma fonte.