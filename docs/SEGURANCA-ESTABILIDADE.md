# Segurança e estabilidade — 22/09/2026

Esta rodada corrige os alertas de dependências, as falhas de carregamento da sessão e o peso do pacote inicial encontrados na auditoria. Não altera credenciais, dados de produção ou operações financeiras.

## Resultado

| Verificação | Resultado |
|---|---|
| npm audit no contêiner | De 19 pacotes com alertas para zero vulnerabilidades conhecidas no momento da consulta |
| TypeScript | Aprovado |
| Testes unitários/estáticos | 43 aprovados |
| Playwright local | 14 aprovados: seis cards, editor, logout, tela móvel e cinco páginas internas |
| Playwright produção | 2 aprovados: perfil local adulterado não abre dashboard; editor local indisponível |
| Docker | Imagem reconstruída; contêiner saudável; usuário sem root; porta somente em loopback |
| Build de produção | Aprovado; avisos de chunks grandes ainda presentes |
| Lint dos módulos novos de sessão/recuperação | Sem erros; um aviso de Fast Refresh pelo hook exportado junto ao provider |

## Dependências

Atualizações compatíveis resolveram 15 alertas. Os restantes exigiram migrar Vite para 7.3.6, Vitest para 4.1.11 e o plugin React SWC para 4.3.3. O requisito de Node passou a 22.12+. O npm lockfile foi atualizado, e a instalação limpa foi validada na construção Docker.

Evidências: [antes](audit/dependency-audit-before.json), [depois](audit/dependency-audit-after.json). Ausência de alertas conhecidos não é certificação de segurança do produto.

Guias usados para conferir compatibilidade: [Vite 7](https://v7.vite.dev/guide/migration) e [Vitest 4](https://v4.vitest.dev/guide/migration).

## Sessão, identidade e navegação

- Falha ao recuperar sessão ou permissões deixa de manter a tela carregando sem fim. O usuário recebe mensagem de erro e pode tentar novamente.
- Requisições de sessão/permissões têm limite de 12 segundos; respostas atrasadas não substituem a identidade atual.
- Trocar de usuário ou sair remove o cache de consultas da identidade anterior, inclusive consultas pendentes.
- O perfil visual deriva da sessão/roles atuais; não permanece como administrador após mudança de identidade.
- A renovação de token do mesmo usuário preserva a tela e os dados em edição, sem remontar o formulário apenas por renovar a sessão.
- O guard envolve o layout inteiro antes de exibir navegação protegida.
- Sair da prévia apaga o perfil selecionado; voltar diretamente ao dashboard exige selecionar outro perfil.
- Falhas de página recebem recuperação amigável, com recarregamento e link para o início.

Os testes de recuperação usam respostas simuladas para validar falha de rede, timeout, retry, logout, troca de usuário, cache e renovação. Os testes de produção interceptam chamadas externas para não usar o banco real.

## Carregamento

139 imports de páginas e os grupos públicos passaram a usar carregamento sob demanda. O pacote JavaScript principal caiu de aproximadamente 4.557 KB para 759 KB (cerca de 83%); gzip de aproximadamente 1.149 KB para 224 KB. Isso mede o arquivo principal, não a soma de todos os arquivos transferidos nem o tempo percebido no navegador. Componentes compartilhados e bibliotecas ainda geram chunks grandes. Evidência: [build anterior](audit/build.txt) e [build atualizado](audit/build-after.txt).

## Docker e CI

O contêiner usa `node`, bloqueia novos privilégios, remove capabilities extras e tem healthcheck HTTP. Reinicia automaticamente, exceto após parada manual. A imagem mantém a prévia isolada do Supabase real.

O CI verifica tipos, build, testes, rotas, navegador local, bloqueios no build de produção e alertas altos/críticos de dependências. O build de CI recebe somente URL/chave públicas fictícias. A execução no GitHub depende do evento configurado (push na main ou pull request); testes relatados acima foram executados localmente.

## Pendências mantidas

O backend local completo, as 213 migrações, RLS por empresa/usuário e integrações reais continuam pendentes de homologação. A dívida de lint registrada na auditoria inicial ainda precisa de correção por domínio. O editor visual permanece um compositor de rascunhos; a publicação na home e a conversão dos dashboards em blocos não fazem parte desta rodada.
