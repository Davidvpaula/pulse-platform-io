# Auditoria — Administrador

## Rotas e funções

Entrada: `/app/admin/dashboard`. Há 75 declarações de rota, incluindo aliases e telas analíticas que reutilizam componentes. [Mapa completo com guards, arquivos, funções, RPCs e Edge Functions](INVENTARIO-ADMIN.md).

| Área | Funções encontradas |
|---|---|
| Operação | Visão geral por período, pacientes, médicos/aprovação/contratos, colaboradores, agenda, fluxo, NOC e saúde |
| Financeiro | Central financeira, comissões, prévia de repasses, saques, reembolsos, ledger, serviços, cupons, planos e cancelamentos |
| B2B | Empresas, planos empresariais, contratos, propostas, relatórios e faturamento |
| Controle de acesso | Permissões, logs, impersonação, sessões, segurança e alertas |
| Comunicação | Operação, cockpit de produção, WhatsApp e teste Cloud |
| Integrações | Configuração geral, WhatsApp, Feegow, mapeamento, schema, profissionais e pendências |
| Conteúdo e crescimento | Termos, FAQ, feedbacks, treinamentos, gamificação, planos médicos e IA médicos |
| Análise | Tráfego, comportamento, conversão, financeiro, marketing, comparativo, auditoria e observabilidade |

## Mecânica

As páginas operacionais passam por sessão geral e `RequireRoutePermission`. Admin possui bypass explícito; usuários não admin podem acessar rotas `/admin` quando recebem as capacidades exigidas. Portanto o prefixo da URL não significa, por si só, exclusividade de administrador.

O dashboard usa [queries administrativas](../../src/lib/admin/queries.ts), com React Query, estados de carregamento, erro e recarga. As demais páginas combinam RPCs, consultas diretas e Edge Functions. Os inventários distinguem chamadas diretas das alcançáveis por imports; isso não prova que toda integração esteja configurada.

Permissões de colaboradores são configuradas pela matriz/drawer. Configurações de integração, preços e repasses repercutem em outros dashboards. Segurança real depende das políticas/RPCs, não do guard React.

## Achados

### ADM-01 — Alta — Impersonação não garante somente leitura

**Confirmado no frontend; execução de gravações não testada.** [impersonation.tsx](../../src/lib/impersonation.tsx) mantém a sessão administrativa e troca identidade/perfil da interface. O helper `assertNotImpersonating` só aparece na própria declaração e no exemplo de comentário, sem chamadas nos handlers. O [banner](../../src/components/impersonation/ImpersonationBanner.tsx) afirma “modo somente leitura”, mas não intercepta operações.

Também não se trata de simulação fiel das permissões do alvo: o banco continua recebendo a identidade admin e hooks como `useEmpresaAtual` resolvem o usuário autenticado. Alterar apenas o perfil visual não reproduz escopo de dados do alvo.

Correção: estabelecer contrato explícito de visualização, identidade alvo controlada pelo servidor e bloqueio central de mutações; limpar contexto na troca de sessão. Aceite: nenhum caminho de escrita funciona nesse modo e os dados exibidos pertencem ao alvo selecionado.

### ADM-02 — Alta — Interface pode anunciar alteração de permissão que falhou

**Confirmado no [drawer](../../src/components/permissions/ColaboradorPermissoesDrawer.tsx).** `override`, aplicação de template, cópia e limpeza ignoram o campo `error` de respostas Supabase em operações de escrita. `try/catch` não captura respostas normais `{ error }`. Mesmo com rejeição pelo banco, a interface pode mostrar sucesso.

Templates são aplicados em sequência, sem transação. A mensagem afirma preservar overrides, mas cada chave é enviada a `colaborador_set_permissao`, cujo `ON CONFLICT` atualiza o efeito para grant. Um revoke existente sobre chave do template é substituído.

Correção: validar cada resposta e aplicar template transacional com regra clara para overrides. Aceite: falhas não geram toast de sucesso; nenhum lote fica parcialmente aplicado; revoke preservado quando a interface promete isso.

### ADM-03 — Média — Delegação da tela diverge da autorização de gravação

**Confirmado na implementação consultada.** `/admin/permissoes` exige `colaboradores.alterar_permissoes`; as RPCs `colaborador_set_permissao` e `colaborador_remover_permissao` exigem role admin. O usuário delegado pode entrar na tela e falhar ao salvar. Pode ser uma restrição desejada, mas precisa ser refletida no guard e no produto. Ver [migração](../../supabase/migrations/20260430162810_bbe125f1-7aab-4539-a41b-bcfbad954150.sql).

### ADM-04 — Média — Controles da visão geral não implementados

**Incompleto.** [AdminDashboard](../../src/pages/app/admin/AdminDashboard.tsx) apresenta Exportar e Relatório completo com `disabled` permanente. Não confundir esses controles com exportações existentes em outras páginas. Implementar destinos/exportação ou ajustar apresentação.

### ADM-05 — Alta — Granularidade financeira exige revisão de ponta a ponta

**Risco a validar.** Há rotas B2B de faturamento e relatórios liberadas apenas por `empresas.ver`, e relatório financeiro administrativo por `relatorios.ver`, enquanto o catálogo contém capacidades financeiras específicas. Isso é comprovável no roteador; não comprova vazamento no banco. Revisar necessidade de capacidades adicionais e verificar RLS/RPC em usuários delegados com leitura mínima.

### ADM-06 — Alta — Administração herda inconsistências do colaborador e comunicação

Revogação não reativa e suspensão parcial afetam a confiabilidade do painel de permissões. Ver COL-01/COL-02 e o [relatório de comunicação](COMUNICACAO.md), cujas rotas compartilhadas não recebem uniformemente guards de capacidade.

## Validação necessária

Testar admin real e colaborador delegado; reprovar mutações por identidade sem capacidade; verificar logs e identidade de autor/alvo; simular falha em lote; validar expiração de impersonação; conferir fechamento financeiro e reprocessamento idempotente em banco isolado. As integrações financeiras não foram acionadas nesta auditoria.

Status: inventário e auditoria estática realizados; não é uma certificação de segurança do backend.
