# Estabilização da Onda A — 6 ajustes pontuais

Escopo: **só helpers, setup e config de Playwright**. Zero código de produto, zero novo teste, zero mudança de RBAC.

## 1. Remover seletores frágeis

Arquivos: `tests/e2e/admin/dashboard.spec.ts`, `admin/financeiro.spec.ts`, `admin/noc.spec.ts`.

- Substituir `.card`, `[class*='Card']` (acoplados a Tailwind/shadcn) por âncoras estáveis: `main`, `<h1>/<h2>` visível, `nav a`, `role="link"`.
- Trocar `cards.count() > 0` por uma expectativa concreta: existe `<main>` com texto não-vazio.
- Para "sidebar tem links", manter `nav a, aside a` mas exigir `>= 1` em vez de `> 2` (a sidebar pode estar collapsed em viewport CI).

## 2. Melhorar `expectAccessDenied`

Arquivo: `tests/e2e/helpers/rbac.ts`.

Hoje: `waitForTimeout(800)` fixo + checagem.
Novo: corrida de 2 condições, o que vier primeiro em até 8 s:
- URL muda (`page.waitForURL(u => u.pathname !== originalPath)`), ou
- texto de bloqueio aparece (`page.getByText(/acesso restrito|sem permiss|não autorizado|forbidden/i)`).

Sem `waitForTimeout`. Mensagem de erro inclui a URL final e um snippet do `<main>` para diagnóstico.

## 3. Endurecer `expectNoLoaderForever`

Arquivo: `tests/e2e/helpers/navigation.ts`.

Hoje: poll com `waitForTimeout(250)` em loop — pode passar mesmo sem loader nenhum.
Novo:
- Se nenhum loader apareceu em 1 s, retorna OK (não é falha — só não há loader).
- Se apareceu, usa `locator.first().waitFor({ state: "detached", timeout })`.
- Sem `waitForTimeout` em loop.

## 4. `auth.setup.ts` tolerante a sessão existente

Arquivo: `tests/e2e/auth/auth.setup.ts`.

- Antes do login, `page.goto("/")` e ler `localStorage` — se já houver token Supabase válido para o email esperado, **pular** a tela de `/auth` e ir direto para `storageState({path})`.
- Caso o storage exista em disco mas esteja expirado, capturar o erro de redirect para `/auth` e re-logar.
- Idempotência: rodar `auth.setup.ts` 2x seguidas não deve dobrar o tempo.

## 5. Retry controlado só no setup

Arquivo: `playwright.config.ts`.

- Manter `retries: 1` global no CI.
- Project `setup` ganha override: `retries: 2`. Login pode falhar por jitter de rede do preview Lovable; o resto da suíte não merece esse benefício para não mascarar flakes reais.
- Adicionar `timeout: 90_000` só no project `setup` (login pode ser lento em cold start).

## 6. Criar `tests/e2e/STABILITY.md`

Documento operacional curto (1-2 páginas) cobrindo:

- **Como interpretar uma falha**: passos para baixar o `playwright-report` artifact, abrir trace, identificar se é flake (passou no retry) ou regressão real.
- **Critério de "flaky"**: falhou ≥ 2x em 10 runs consecutivas em main, sem mudança correlata de produto.
- **Quarentena**: `test.fixme()` com comentário `// QUARENTENA <data> — motivo` e issue tracker rastreando. Nunca `test.skip()` silencioso.
- **Sinais de instabilidade do preview**: padrões de erro recorrentes (504, cold start > 30 s) com ação recomendada (re-rodar / abrir ticket).
- **O que NÃO fazer durante observação**: adicionar novos testes, tocar em produto pra "ajudar o teste", aumentar timeouts globalmente, desativar retry.
- **Métricas a observar nos próximos 3-5 dias**: tempo total da suíte, taxa de falha por spec, tempo de cada step do `setup`.

## Validação após os ajustes

Rodar `bunx playwright test` localmente apontando para a URL de preview Lovable (`E2E_BASE_URL=https://pulse-platform-io.lovable.app`).

**Caveat honesto**: no sandbox eu posso rodar Playwright, mas o preview Lovable pode estar em cold start ou indisponível na hora do run — se isso acontecer, vou reportar exatamente o que aconteceu (timeout de navegação, 502, etc.) sem mascarar como sucesso. O dado real de estabilidade vem dos próximos dias de runs no CI; o run local é só smoke do meu próprio refactor.

Vou trazer:
- Resultado por spec (passou / falhou / flaky-passou-no-retry).
- Tempo total e tempo do step `setup`.
- Quais asserts ficaram mais resilientes (ex.: removi `.card`, `expectAccessDenied` agora é determinístico).
- Riscos / trade-offs identificados (ex.: tolerar sessão existente esconde regressões na tela de login? — discutir).

## Fora de escopo (reafirmado)

- Onda B, médico, paciente, checkout real, upload real, integrações externas, novos mocks, mudança de produto.
