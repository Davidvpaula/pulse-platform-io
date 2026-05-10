# E2E Playwright — Onda A

Suite mecânica de fluxos críticos rodando **headless contra o preview Lovable**.

## O que está coberto (Onda A)

- **Admin**: dashboard, financeiro, ledger observabilidade, auditoria, NOC, RBAC visual.
- **Guards**: paciente bloqueado em rota admin, colaborador bloqueado em rota financeira admin, rota inexistente, redirect legado secretaria→colaborador.
- **Auth setup**: gera storageState para 4 perfis (admin, médico, paciente, colaborador) usando os seeds `e2e_*@pulse.test`.

A Onda B (médico completo, paciente completo, regressão visual operacional) é introduzida só depois que a Onda A ficar verde por alguns dias.

## Rodar localmente

```bash
bunx playwright install --with-deps chromium   # primeira vez
bun run e2e                                    # roda tudo
bun run e2e:ui                                 # modo interativo
bun run e2e:report                             # abre o último relatório
```

Por padrão, roda contra `https://pulse-platform-io.lovable.app`. Para apontar para outra URL:

```bash
E2E_BASE_URL=https://meu-preview.lovable.app bun run e2e
```

## Seeds

Os 4 usuários de teste são criados pela migration `e2e_seed_users` e são **idempotentes**: rodar a migration de novo não duplica nem altera nada. Senha fixa: `E2eTest!2026` (consciente — só vale para o ambiente de preview).

| Email | Perfil |
|---|---|
| `e2e_admin@pulse.test` | admin |
| `e2e_medico@pulse.test` | médico (aprovado) |
| `e2e_paciente@pulse.test` | paciente |
| `e2e_colaborador@pulse.test` | colaborador (secretária) |

## Estrutura

```text
tests/e2e/
  auth/auth.setup.ts       # login dos 4 perfis, salva .storage/*.json
  fixtures/users.ts        # credenciais e helpers tipados
  helpers/navigation.ts    # gotoApp, expectNoBlankScreen, expectNoLoaderForever
  helpers/rbac.ts          # expectAccessDenied, expectMenuItemHidden
  admin/                   # specs do escopo admin
  guards/                  # specs de RBAC cruzado e rotas
```

## Princípios (não desviar)

- **Poucos testes, fluxos completos.** Suíte ~12-15 testes; nada de 300 testes pequenos.
- **Sem `waitForTimeout`** como fallback principal. Use `waitForURL`, `waitForLoadState`, ou os helpers.
- **Sem pixel-perfect, sem snapshots visuais.** A regressão que importa é tela branca / runtime error / 404.
- **Não tocar dados reais.** Tudo gira em torno dos prefixos `e2e_*` na DB.
- **Stripe**: nunca automatizar o checkout hospedado. Cobrir até o redirect e mockar webhook se necessário.

## Como adicionar um teste novo

1. Identifique o perfil de auth necessário (`admin`, `medico`, `paciente`, `colaborador`).
2. Crie um arquivo em `admin/`, `guards/` ou (na Onda B) `medico/` / `paciente/`.
3. No topo do spec, declare `test.use({ storageState: E2E_USERS.<role>.storage })` se for diferente do default do project.
4. Use `gotoApp(page, "/app/...")` em vez de `page.goto` cru — ele já valida tela branca.
5. Use `expectAccessDenied(page, path)` para testes de RBAC.

## Como atualizar a baseline

Para esta frente E2E, **não há baseline de snapshot**. A baseline funcional é o smoke (`scripts/baseline.json`), validada pelo job `validate` no CI. Os testes E2E são **declarativos** — se o comportamento mudar intencionalmente, ajusta-se o spec; se mudar sem intenção, o spec quebra e mostra o problema.

## Falhas no CI

Quando algum teste falha, o GitHub Actions:
- Mantém **screenshot** do momento da falha.
- Mantém **trace** completo (timeline + DOM + network).
- Faz upload do artefato `playwright-report/` por 7 dias.

Para investigar:
1. Baixar o artefato `playwright-report` da run.
2. Rodar `bunx playwright show-report playwright-report` localmente.
