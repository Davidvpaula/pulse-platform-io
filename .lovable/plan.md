# F7 Onda A — Playwright E2E (infra + Admin + Guards + CI)

Escopo desta entrega: **só a Onda A**. Médico, Paciente e regressão visual ficam para a Onda B, depois que a Onda A estiver verde por alguns dias.

## Princípios

- Poucos testes, fluxos completos, asserts funcionais.
- Nada de pixel-perfect, nada de `waitForTimeout`, nada de mock excessivo.
- Roda só no CI, headless, contra a URL de **preview Lovable**.
- Seeds com prefixo `e2e_` — convivem com o banco do preview, nunca tocam dados reais.
- Stripe coberto até o redirect; webhook de retorno simulado via fixture.

## 1. Estrutura de arquivos

```text
playwright.config.ts
tests/
  e2e/
    auth/
      auth.setup.ts              # login dos 4 perfis, salva storageState
    fixtures/
      users.ts                   # emails/senhas dos seeds e2e_*
      test.ts                    # extends base test com helpers tipados
    helpers/
      navigation.ts              # gotoApp, expectNoBlankScreen, expectNoLoaderForever
      rbac.ts                    # expectAccessDenied, expectMenuItemHidden
      stripe.ts                  # mockStripeRedirect, simulateWebhookSuccess
    admin/
      dashboard.spec.ts
      financeiro.spec.ts
      auditoria.spec.ts
      noc.spec.ts
      rbac.spec.ts
    guards/
      rotas.spec.ts              # rota inexistente, sem permissão, redirects
.storage/
  admin.json medico.json paciente.json colaborador.json   # gitignored
```

## 2. Seeds (migration `e2e_seed_users`)

Migration **idempotente** que garante 4 usuários de teste:

| Email | Perfil | Observações |
|---|---|---|
| `e2e_admin@pulse.test` | admin | acesso total |
| `e2e_medico@pulse.test` | medico | com `link_sala_padrao` configurado |
| `e2e_paciente@pulse.test` | paciente | sem dependentes |
| `e2e_colaborador@pulse.test` | colaborador | escopo limitado |

Senha fixa para todos (constante no fixture, **não** secret), pois rodam só contra preview. Migration usa `ON CONFLICT DO NOTHING` em `auth.users` + upsert nas tabelas de perfil.

Helper `resetEnvironment()` opcional (não destrutivo): apaga apenas linhas com `email LIKE 'e2e_%'` ou `created_by = e2e_admin`.

## 3. Auth state reuse

`auth.setup.ts` roda **uma vez** no início da suíte:
- Login via UI (não via API direta — queremos pegar regressão de tela de login).
- Salva `storageState` por perfil em `.storage/{perfil}.json`.
- Os specs declaram `test.use({ storageState: '.storage/admin.json' })` e já entram logados.

## 4. Testes da Onda A (~12-15 no total)

### admin/dashboard.spec.ts
- Renderiza KPIs (assert: pelo menos N cards com valor numérico).
- Sidebar abre e fecha.
- CTA principal navega para destino esperado.
- Não há tela branca nem loader > 10s (helpers).

### admin/financeiro.spec.ts
- Abas carregam sem runtime error.
- KPIs de saldo aparecem (valor pode ser zero, mas o componente renderiza).
- Página de ledger / observabilidade abre.

### admin/auditoria.spec.ts
- Filtros aplicam (verifica que URL muda).
- `correlation_id` filtra (insere uma linha de teste, busca por ela).
- Botão exportar CSV dispara download.

### admin/noc.spec.ts
- KPIs operacionais renderizam.
- Lista de alertas carrega (vazia ou com dados — ambos OK).
- Timestamp "atualizado em" presente.

### admin/rbac.spec.ts
- Admin vê menus admin.
- Paciente logado em rota admin → "Acesso restrito".
- Colaborador limitado não vê menu financeiro.

### guards/rotas.spec.ts
- `/rota-que-nao-existe` → catch-all 404.
- Rota protegida sem permissão → redirect ou tela de acesso restrito (não tela branca).
- Sidebar coerente com perfil ativo.

## 5. Helpers principais

- **`expectNoBlankScreen(page)`**: garante que `body` tem conteúdo visível e que `#root` tem filhos renderizados.
- **`expectNoLoaderForever(page, timeoutMs)`**: espera spinners/skeletons sumirem.
- **`expectAccessDenied(page)`**: procura por texto "Acesso restrito" ou redirect para `/app`.
- **`mockStripeRedirect(page)`**: intercepta `**/checkout.stripe.com/**` e simula sucesso/cancelamento.

## 6. CI (`.github/workflows/ci.yml`)

Adiciona job `e2e` que roda **depois** do job atual:

```yaml
e2e:
  needs: [build-and-test]
  runs-on: ubuntu-latest
  steps:
    - checkout
    - setup-node
    - npm ci
    - npx playwright install --with-deps chromium
    - npx playwright test
      env:
        E2E_BASE_URL: https://pulse-platform-io.lovable.app
        E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}
    - upload-artifact:
        name: playwright-report
        path: playwright-report/
        if: failure()
```

Config:
- `retries: 1` no CI, `0` local.
- `workers: 2` (suíte é pequena, paralelismo controlado).
- `screenshot: 'only-on-failure'`, `trace: 'retain-on-failure'`, vídeo desligado.
- Timeout global por teste: 60s.

## 7. Critérios de aceite (Onda A)

- Suíte Playwright roda no CI e fica verde.
- Falha do CI mostra: screenshot + trace + URL + console errors.
- Os 4 storageStates são gerados em < 30s.
- Suíte total roda em < 4 min no CI.
- Nenhum dado fora de `e2e_*` é tocado.
- README curto em `tests/e2e/README.md` explicando: como rodar local, como adicionar teste, como atualizar seed.

## 8. Fora de escopo (Onda B, depois)

- E2E completo de Médico (agenda, consulta, sala, upload).
- E2E completo de Paciente (agendamento → checkout → documentos → dependentes).
- Detector de regressão visual operacional (tela branca em todas as rotas).
- Cobertura de fluxo de saque, retorno gratuito, cupons.

## 9. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Preview cair durante CI | Job `e2e` marcado como `continue-on-error: false` mas com 1 retry. Se cair 2x, falha clara. |
| Seeds sujarem o banco | Prefixo `e2e_` + script de cleanup opcional. Nunca `DELETE` sem `WHERE email LIKE 'e2e_%'`. |
| Senha em secret do GitHub | Pedirei `E2E_PASSWORD` via add_secret na implementação. Single secret, único uso. |
| Lentidão do preview | Timeouts generosos (60s por teste, 10s para loaders). Sem `waitForTimeout` fixo. |

## 10. O que vou pedir antes de começar a implementar

1. Criar o secret `E2E_PASSWORD` no GitHub Actions (vou pedir via add_secret).
2. Aprovação da migration de seed `e2e_seed_users` (vai pelo fluxo padrão de migration).
