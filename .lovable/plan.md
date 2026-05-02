
## Estado atual

- **Admin rotas**: Já protegidas por `<G perm="gamificacao.configurar">` que mostra card "Acesso restrito" com ícone de cadeado quando o usuário não tem permissão.
- **Médico rota**: Protegida por `MedicoGuard` (aguardando aprovação). A página mostra dados do próprio médico — não precisa de capability extra.
- **Permissões no catálogo**: `gamificacao.ver` e `gamificacao.configurar` já existem na tabela `permissions_catalog`.

## Problema

O grupo "Gamificação" no menu lateral do Admin (`profiles.ts`) **não tem** `requiresCapability`, então aparece para todos os admins/colaboradores mesmo que não tenham a permissão. Ao clicar, veem o card de bloqueio, mas o ideal é esconder o menu.

## Alteração

### `src/lib/profiles.ts`

Adicionar `requiresCapability: "gamificacao.configurar"` ao grupo Gamificação do perfil admin (linha ~228), para que o menu só apareça a quem tem a capability.

Nenhuma migração, nenhuma outra alteração. A tela de bloqueio da rota já funciona como fallback.
