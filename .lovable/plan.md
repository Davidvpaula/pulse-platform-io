
# 5 Ações Pendentes + Sistema de Cancelamento de Planos Médicos

## Ação 1 — Menus e Navegação
- `profiles.ts`: importar icone `Layers`
- Menu paciente: adicionar "Montar Plano" (`/app/paciente/montar-plano`, icone `Layers`) após "Meu Plano"
- Menu medico: adicionar "Meus Planos" (`/app/medico/planos`, icone `BadgeCheck`) após "Treinamento"
- Menu admin: adicionar sub-item "Planos de Médicos" (`/app/admin/planos-medicos`) dentro da seção existente

## Ação 2 — Integrar Configs no Admin
- `AdminPlanos.tsx`: adicionar abas "Regras de desconto" e "Taxa plataforma" renderizando `DescontoProgressivoConfig` e `TaxaPlataformaConfig`

## Ação 3 — Fluxo de Aceite do Médico
- `MedicoPlanos.tsx`: adicionar seção "Planos pendentes de aceite" consultando `plano_medicos` onde `medico_id = uid` e `aceite_medico = false`
- Botões Aceitar/Recusar com update no banco

## Ação 4 — Receita Separada nos Dashboards
- `AdminDashboard.tsx` e `MedicoFinanceiro.tsx`: adicionar cards de receita agrupados por `origem_receita` da tabela `assinaturas`

## Ação 5 — Versionamento de Plano
- `PlanoBuilder.tsx`: verificar se plano tem assinaturas ativas; se sim, bloquear edição e oferecer "Criar nova versão"

## Ação 6 — Sistema de Cancelamento (GRANDE)

### Migration (banco)
- Enum `plano_status`: adicionar `encerramento_pendente` e `encerrado`
- Enum `modo_cancelamento_plano`: `cumprir_ciclo`, `reembolso_imediato`, `hibrido`
- `planos`: adicionar `aprovado_admin` (boolean)
- `assinaturas`: adicionar `renovacao_bloqueada` (boolean), `data_fim_acesso` (date)
- Nova tabela `plano_cancelamento_evento`: plano_id, medico_id, total_pacientes, valor_comprometido, tipo_encerramento, motivo, termos_aceitos, status, admin_acao
- Nova tabela `reembolso_planos`: paciente_id, plano_id, assinatura_id, valor, valor_proporcional, dias_restantes, status, motivo
- Nova tabela `plano_medico_status_log`: plano_id, medico_id, status_anterior, status_novo, changed_by, motivo
- Trigger para logar mudanças de status automaticamente
- Função `calcular_reembolso_proporcional`
- RLS completo em todas as tabelas

### Frontend — Médico
- `MedicoPlanos.tsx`: botão "Encerrar plano" em cada card
- Modal obrigatório com: aviso jurídico, numero de pacientes ativos, valor comprometido, possível reembolso, checkbox de termos, campo de motivo
- Ao confirmar: cria evento de cancelamento, muda status para `encerramento_pendente`, bloqueia renovações

### Frontend — Admin
- Nova página `AdminCancelamentosPlanos.tsx` em `/app/admin/planos-cancelamentos`
- Tabela com: médico, plano, pacientes afetados, valor, status
- Ações: aprovar, forçar reembolso, bloquear médico, ajustar saldo
- Configuração de modo de cancelamento (cumprir_ciclo/reembolso_imediato/hibrido) via `app_settings`

### Frontend — Termos
- Campo editável em Admin para "Termos de cancelamento de plano médico" (salvo em `app_settings`)
- Exibido no modal de cancelamento e no momento da criação do plano

### Auditoria
- Todas as ações registradas em `plano_cancelamento_evento` e `plano_medico_status_log`

## Ordem de Execução
1. Migration (banco) — tudo em uma migração
2. Código: menus, configs, aceite, versionamento
3. Código: sistema de cancelamento (médico + admin)
4. Código: dashboards de receita
