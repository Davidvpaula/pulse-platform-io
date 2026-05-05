## Log de auditoria de reembolsos no admin

A tabela `financeiro_auditoria` já registra eventos (as RPCs `financeiro_reembolso_aprovar/recusar` já chamam `_log_financeiro`). Falta enriquecer a query de reembolsos e mostrar os detalhes.

### Editar `AdminFinanceiroCentral.tsx`

**1. Enriquecer query de reembolsos** (linha ~140):
```
.from("reembolsos")
.select("*, consultas!inner(inicio, paciente_id, medico_id, pacientes!inner(nome_completo), medicos!inner(nome)), pagamentos:pagamento_id(provider_payment_id, gateway_ref), actor:profiles!actor_id(full_name), analisador:profiles!analisado_por(full_name)")
```

**2. Adicionar estado** para reembolso expandido e seu audit log.

**3. Função `carregarAuditReembolso(id)`** que busca da `financeiro_auditoria` WHERE entidade='reembolso' AND entidade_id=id, com join no `profiles` do actor_id.

**4. Expandir linha da tabela** ao clicar — mostrar painel com:
- Quem solicitou (actor) e quando (created_at)
- Quem analisou (analisado_por) e quando (decidido_em)
- Paciente e médico da consulta
- Payment intent / gateway ref do pagamento vinculado
- Política aplicada (buscar `politica_reembolso` pelo medico_id + situação)
- Timeline de audit logs (ação, ator, timestamps, valor anterior→novo)

**5. Expandir headers** da tabela para incluir Paciente e Médico.
