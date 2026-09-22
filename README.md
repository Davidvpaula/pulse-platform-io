# Pulse Platform / Nova Saúde

Plataforma React + TypeScript + Vite, com Supabase (Auth, PostgreSQL, Storage, Realtime e Edge Functions). O frontend não depende da Lovable para executar.

## Visualização local sem senha

Requisitos: Node 22.12+ e npm. No Windows use `npm.cmd` se o PowerShell bloquear `npm.ps1`.

```sh
npm ci
npm run dev:local
```

Abra http://127.0.0.1:8080/auth e escolha um perfil. Secretaria utiliza o dashboard unificado de Colaborador. O servidor fica restrito ao computador local. A prévia exige modo de desenvolvimento, `VITE_LOCAL_PREVIEW=true` e hostname loopback; não existe bypass em build de produção.

As chamadas pelo cliente Supabase são isoladas: leituras retornam estados vazios, gravações/RPCs falham explicitamente, sessões reais não são carregadas. Alguns módulos mostram dados demonstrativos existentes ou mensagens de integração pendente. Não é um backend funcional e não deve ser usado para atendimento real.

Na pasta acima desta cópia, `INICIAR-PLATAFORMA.cmd` inicia o servidor e `ABRIR-PLATAFORMA.html` oferece os links. Mantenha o terminal aberto. Encerre com Ctrl+C.

## Editor visual

http://127.0.0.1:8080/editor-visual — Puck integrado localmente, com blocos de destaque, texto e serviço. Arraste os blocos, edite os campos e salve o rascunho. O conteúdo fica no navegador e pode ser exportado como JSON. O botão Publish do Puck também salva somente o rascunho local.

Este primeiro editor é um espaço de composição; não altera automaticamente a home nem os dashboards existentes. A próxima etapa é cadastrar seus componentes e definir publicação/versionamento. Documentação: https://puckeditor.com/docs.

## Backend real e produção

Copie `.env.example` para `.env.local` e configure seu próprio projeto Supabase. Use `npm run dev` para autenticação real. Configure o Google diretamente no Supabase e as URLs de redirecionamento. As 213 migrações e 42 Edge Functions precisam ser validadas em um projeto de testes antes de implantação; segredos de provedores pertencem apenas ao backend.

Nunca use `service_role` em variáveis `VITE_*`. As configurações antigas permanecem somente na cópia local e no histórico anterior; não foram usadas para operações de negócio nesta retomada.

```sh
npm run typecheck
npm test
npm run build
node scripts/validate-routes.mjs --strict
node scripts/audit-inventory.mjs
npx playwright test --config playwright.local.config.ts
npm run e2e:production
npm audit
```

Os testes locais precisam do Chromium instalado (`npx playwright install chromium`). Alternativamente, no PowerShell, use `$env:PLAYWRIGHT_CHANNEL='chrome'` com Chrome instalado. A configuração E2E antiga permanece disponível para homologação com backend real via `E2E_BASE_URL`.

## Docker opcional

```sh
docker compose up --build
```

Disponibiliza apenas a prévia do frontend na porta 8080, restrita a `127.0.0.1`. Não inclui banco Supabase. Pare o servidor Node antes para liberar a porta. Docker validado em 22/09/2026: imagem construída, contêiner saudável e 14 testes locais de navegador aprovados. Executa com usuário `node`, sem privilégios adicionais, com healthcheck e reinício automático (exceto quando parado manualmente). Na pasta acima, `INICIAR-DOCKER.cmd` permite iniciar por dois cliques com o Docker Desktop aberto.

Para parar sem remover o contêiner: `docker compose stop`. Para acompanhar a execução: `docker compose logs -f`. Alterações no código entram na imagem ao executar novamente `docker compose up --build -d`.

Veja [a auditoria inicial](docs/AUDITORIA-INICIAL.md) para evidências, pendências e limites da verificação.

Veja a [auditoria separada por dashboard](docs/auditoria-dashboards/README.md): administrador, paciente, médico, empresa e secretaria/colaborador unificados, além de comunicação compartilhada. Contém rotas, funções, mecanismos, permissões e 35 achados classificados, com inventários reproduzíveis e limites da análise estática.

Veja também [a rodada de segurança e estabilidade](docs/SEGURANCA-ESTABILIDADE.md): dependências corrigidas, recuperação de sessão, isolamento do cache por usuário e carregamento de páginas sob demanda. Os testes de produção usam um servidor temporário na porta 8081 e interceptam o Supabase; não se conectam ao banco real.
