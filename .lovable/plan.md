
# CHECKUP: Secretária vs Colaborador

## DIAGNÓSTICO COMPLETO

### O que existe hoje

Existem **dois perfis** no sistema que fazem basicamente a mesma coisa:

| Aspecto | `secretaria` | `colaborador` |
|---|---|---|
| Rotas | `/app/secretaria/*` (14 rotas) | `/app/colaborador/*` (16 rotas) |
| Páginas próprias | 8 arquivos em `src/pages/app/secretaria/` | 1 arquivo (`ColaboradorPerfil.tsx`) |
| Componentes usados | Páginas próprias (SecretariaDashboard, etc.) | **Reutiliza as mesmas páginas** de secretaria |
| Menu | Nav fixo em `profiles.ts` | Menu dinâmico via `menuCatalog.ts` + `has_permission` |
| Guards de permissão nas rotas | **NENHUM** (todas abertas) | Sim, usa `<G perm="...">` em cada rota |
| Tabela no banco | Não tem tabela própria | `colaboradores` + `permissoes_colaborador` |
| Enum no banco | `funcao_interna` inclui "secretaria" como valor | `funcao_interna` tem vários valores |
| Auth mapping | `rolesToProfileKey()` mapeia role "secretaria" -> perfil "colaborador" | Perfil nativo |
| Impersonation | `ROLE_TO_PROFILE` mapeia "colaborador" -> "secretaria" (invertido!) | - |

### Relação entre eles

**Colaborador é a evolução da Secretária.** O sistema já fez a transição parcial:

1. `auth.tsx` linha 33: roles "secretaria" e "supervisor" sao normalizadas para perfil "colaborador"
2. Todas as rotas `colaborador/*` usam os **mesmos componentes** de `secretaria/` (SecretariaDashboard, SecretariaPacientes, etc.)
3. O menu do colaborador (`menuCatalog.ts`) é dinâmico e respeita permissões via `has_permission`
4. O menu da secretária (`profiles.ts`) é fixo e usa `requiresCapability` (sistema antigo)

**Porém a migração ficou incompleta** -- ambos os conjuntos de rotas continuam ativos.

---

## A) O QUE ESTA FUNCIONANDO

- Colaborador: rotas com guards `<G perm>` funcionam corretamente
- Menu dinâmico do colaborador filtra itens por `has_permission`
- Tabela `colaboradores` + `permissoes_colaborador` + auditoria existe e funciona
- `rolesToProfileKey` resolve corretamente "secretaria" -> "colaborador"
- Ambos usam os mesmos componentes (sem divergencia de dados)
- RLS nas tabelas de colaboradores existe
- Perfil generico (`PerfilGenerico`) e identico em ambos

---

## B) O QUE ESTA QUEBRADO / INCONSISTENTE

1. **Impersonation invertida**: `ROLE_TO_PROFILE` mapeia `colaborador -> "secretaria"` (linha 49 de impersonation.tsx), ou seja, ao impersonar um colaborador, o sistema joga para o perfil secretaria (sem guards de permissao)
2. **Rotas secretaria SEM guards**: nenhuma rota `/app/secretaria/*` tem `<G perm>`. Qualquer usuario que acesse diretamente `/app/secretaria/financeiro` via URL entra sem verificacao de permissao
3. **Rota `admin/secretaria`** redireciona para `/app/admin/colaboradores` -- confirmando que "secretaria" e considerada legada

---

## C) O QUE ESTA DUPLICADO

- 14 rotas `secretaria/*` duplicam exatamente as 16 rotas `colaborador/*` (colaborador tem 2 extras: gamificacao, pendencias-integracao)
- Dois perfis em `profiles.ts` (secretaria e colaborador) para o mesmo papel
- Dois arquivos de perfil identicos (SecretariaPerfil.tsx e ColaboradorPerfil.tsx)
- Duas entradas no menu abilities (secretaria e colaborador em abilities.ts)
- Rota legada `secretaria/pendencias-integracao` (linha 365) tambem existe em `colaborador/`

---

## D) O QUE ESTA MOCKADO/SIMULADO

- Em modo demo (sem sessao), o usuario pode trocar livremente entre secretaria e colaborador via localStorage
- `hasCapability` no menu da secretaria (`requiresCapability: "secretaria.financeiro"`) usa o sistema antigo de abilities, nao o `has_permission` do banco

---

## E) O QUE FALTA IMPLEMENTAR

- Remocao completa do perfil "secretaria" (unificacao em "colaborador")
- Migracao do mapeamento de impersonation

---

## F) MELHORIAS DE UX/UI

- Unificar tudo em "Colaborador" elimina confusao para o admin que gerencia equipe
- Menu dinamico do colaborador ja e superior (filtra por permissao real do banco)

---

## G) RISCOS TECNICOS E DE SEGURANCA

1. **CRITICO**: Rotas `/app/secretaria/*` sem guards permitem bypass de permissoes via URL direta
2. **MEDIO**: Impersonation de colaborador cai no perfil secretaria (sem guards)
3. **BAIXO**: Codigo morto (8 arquivos de pagina + perfil duplicado) aumenta superficie de manutencao

---

## H) PLANO DE ACAO (priorizado)

### Etapa 1 -- Eliminar o bypass de seguranca (URGENTE)
- Redirecionar TODAS as rotas `/app/secretaria/*` para `/app/colaborador/*` equivalente
- Remover as rotas individuais de secretaria do App.tsx (manter apenas redirects)

### Etapa 2 -- Corrigir Impersonation
- Alterar `ROLE_TO_PROFILE` em impersonation.tsx: `colaborador -> "colaborador"` (nao "secretaria")

### Etapa 3 -- Limpar perfil secretaria
- Remover perfil "secretaria" de `profiles.ts` (manter apenas colaborador)
- Remover `secretaria` de `abilities.ts`
- Remover `ProfileKey = "secretaria"` do tipo (ou manter apenas como alias que resolve para colaborador)

### Etapa 4 -- Limpar arquivos mortos
- Manter os componentes em `src/pages/app/secretaria/` (sao usados pelas rotas de colaborador)
- OU renomear pasta para `src/pages/app/colaborador/` e atualizar imports
- Remover `SecretariaPerfil.tsx` (duplicata de `ColaboradorPerfil.tsx`)

### Etapa 5 -- Validar
- Testar que `rolesToProfileKey("secretaria")` ainda resolve para "colaborador"
- Testar que nenhum link hardcoded aponta para `/app/secretaria/`
- Confirmar breadcrumbs corretos

---

### Impacto em outros modulos

- **Permissoes (Admin)**: Nenhum impacto -- ja gerencia via `permissoes_colaborador`
- **Financeiro**: Nenhum -- SecretariaFinanceiro.tsx ja verifica `has_permission` internamente
- **Comunicacao/Inbox**: Nenhum -- usa rota compartilhada
- **Impersonation**: Precisa ajuste (Etapa 2)
- **Planos/Empresa/Gamificacao**: Nenhum impacto

**Conclusao**: "Secretaria" e um perfil legado. "Colaborador" e a versao correta e evoluida. A unificacao e segura e necessaria, especialmente pela falha de seguranca nas rotas sem guards.
