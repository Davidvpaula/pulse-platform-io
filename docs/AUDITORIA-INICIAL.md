# Auditoria inicial — 22/09/2026

## Escopo e estado

Retomada a partir do GitHub, commit base `ce9bb9f4`, preservando a pasta ZIP original `pulse-platform-io-main`. O trabalho ativo está em `pulse-platform-git`. Esta é uma auditoria estrutural e estática com testes do frontend local, não uma certificação funcional ou de segurança do SaaS inteiro.

Inventário inicial: 792 arquivos (sem dependências, saídas de build, ambientes e pasta de relatórios), 190 rotas antes do editor, 104 itens de menu, 175 links estáticos, 213 migrações SQL e 42 Edge Functions. O diretório `_shared` contém utilitários e não conta como função. `audit/inventory.json` lista caminhos, tamanhos e hashes SHA-256, além de variáveis de ambiente por função. O gerador pode ser reexecutado; os totais aumentam com os arquivos desta entrega.

## Arquitetura e mecanismos

- Frontend: React 18, Vite 5, TypeScript, Tailwind, shadcn/Radix, React Router, TanStack Query e Recharts.
- Identidade: `session.tsx` resolve sessão/roles; `auth.tsx` determina perfil; guards específicos tratam paciente, médico, empresa e permissões. Secretaria/supervisor são normalizados para Colaborador.
- Dados: cliente Supabase tipado, hooks e bibliotecas de domínio; autenticação, permissões e RLS dependem do banco.
- Domínios: agendamento, atendimento imediato, consultas, documentos, planos, empresas, financeiro/ledger, comunicação, IA, gamificação, auditoria e operação.
- Integrações no código: Stripe, Google Calendar/Meet, Feegow, WhatsApp e provedores de IA. Existência do código não confirma credenciais, contratos ou serviços operacionais.
- Deploy: não havia configuração Docker na cópia original. CI usava Bun e E2E apontava por padrão para Lovable. Foi adaptado para npm e testes locais independentes.

## Achados prioritários

| Prioridade | Evidência | Situação / ação |
|---|---|---|
| Alta | `internal-financeiro-tests/index.ts` executava testes com service role sem autorização própria no handler | Desativado por padrão; exige opt-in e token específico, método POST. Não implantado nem executado no banco. Ainda requer teste Deno e revisão de concorrência antes de habilitar. |
| Alta | Segurança efetiva reside em 213 migrações e funções SECURITY DEFINER | Validar migração completa em banco vazio e matriz de isolamento paciente/empresa/médico. Não presumir vulnerabilidade apenas por `USING(true)`: existem migrações posteriores que revogam políticas antigas. |
| Alta | `npm ci` falhava por divergência entre manifesto e lock | Lock npm atualizado; execução de build e testes habilitada. |
| Alta | `.env` e `.env.development` eram versionados | Retirar do índice e ignorar novos ambientes; fornecer exemplo. Histórico antigo permanece. As chaves públicas do frontend não equivalem a segredos de serviço. |
| Média | 902 erros e 104 avisos no lint inicial | Relatório em `audit/lint.txt`. Corrigir por domínio; não desabilitar regras globalmente para esconder dívida. O total inicial inclui arquivos posteriormente removidos. |
| Média | Bundle principal inicial de aproximadamente 4,56 MB (1,15 MB gzip) | Imports estáticos amplos em `App.tsx`. Introduzir lazy loading por domínio e medir carregamento. Editor novo já usa importação dinâmica. |
| Média | `SessionProvider` não trata rejeição de `getSession`/`loadRoles` no carregamento inicial | Endurecer estados de erro e recuperação antes de homologação real. |
| Média | `ProtectedRoute` protege conteúdo interno, enquanto o layout pode renderizar antes da sessão | Revisar experiência e guards de toda a árvore; autorização final permanece no backend. |
| Média | 43 rotas sem referência direta pelo analisador inicial | São avisos, não 43 páginas quebradas. Há callbacks e aliases válidos; menus dinâmicos exigem inspeção funcional. |
| Média | Tela de login dependia de OAuth Lovable | Substituída por OAuth Supabase. Configuração Google/redirects precisa de homologação. |

O webhook Stripe contém verificação de assinatura, comparação constante e janela anti-replay. Checkout consultado usa `auth.getUser`. Esses pontos positivos não substituem testes de idempotência, valores, autorização e conciliação.

## Entrega local

Cards para paciente, admin, secretaria, colaborador, médico e empresa. Secretaria e Colaborador usam a operação unificada existente. Não há sessão Supabase fictícia nem privilégio real concedido pelos cards. A prévia aponta para endpoint loopback, intercepta o transporte Supabase, devolve leituras vazias e recusa mutações/RPCs. A ativação exige desenvolvimento, flag explícita e hostname local; produção mantém autenticação.

O editor Puck permite compor rascunhos com blocos registrados, salvar no navegador e exportar JSON. Não foi convertido todo o frontend em blocos editáveis, e o rascunho não publica automaticamente na home. Fonte técnica: https://puckeditor.com/docs/getting-started.

## Verificações e limites

Verificação final: build de produção aprovado, TypeScript aprovado, 35 testes unitários/estáticos aprovados e 7 testes de navegador aprovados no Chrome. Navegação estática sem erros. Os testes de navegador cobrem os seis cards, recarga, troca de perfil, ausência de chamadas a Supabase/Lovable remotos na abertura dos dashboards e salvamento do editor. O inventário final contém 795 arquivos antes dos últimos ajustes de documentação.

O inventário não significa leitura humana linha a linha dos 792 arquivos. A triagem de autenticação em `inventory.json` é heurística. Não foram executados: migrações no banco, RLS por usuário/tenant, Edge Functions em Deno, pagamentos, e-mails, WhatsApp, videoconferência, prescrição, carga, recuperação de backups ou deploy. Docker não foi executado: autorização recusada. Não houve operações clínicas/financeiras reais.

## Sequência de acabamento

1. Backend de testes isolado: aplicar as migrações em ordem, seed fictício e testes de isolamento/RLS, revisar funções privilegiadas.
2. Fluxos completos por perfil: cadastro, agenda, consulta, documentos, cancelamento, pagamento/reembolso, repasse e empresa; medir sucesso e falhas de provedores.
3. Qualidade: corrigir lint por módulo, dividir carregamento e revisar estados vazios/erro, acessibilidade e telas móveis.
4. Edição visual: registrar os blocos reais da home, importar/exportar e versionar conteúdo, adicionar publicação autenticada e reversível.
5. Homologação: pipeline com backend isolado, observabilidade, backups testados e implantação própria.
