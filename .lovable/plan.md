## Diagnóstico — Cadastro de Médicos

---

### A) Funcionando corretamente (real)

1. **Rota e navegação**: `/app/admin/medicos` existe, protegida por `G perm={["medicos.ver","medicos.aprovar"]}`, sidebar correto sob "Cadastros > Médicos", breadcrumb configurado.
2. **Tabela `medicos`**: schema completo com 36 colunas — status, suspensão, bloqueio, Feegow, CPF, prioridade. Enum `medico_status` correto (6 valores).
3. **Tabela `medicos_auditoria`**: existe com colunas id, medico_id, actor_id, acao, status_anterior, status_novo, motivo, observacao, payload.
4. **RLS `medicos`**: Admin ALL, Admin/Secretaria SELECT, Médico INSERT/SELECT/UPDATE own. Correto.
5. **RLS `medicos_auditoria`**: Admin INSERT+SELECT, Médico SELECT own. Correto.
6. **UI**: KPIs, filtros, busca, lista, detalhe split-panel, documentos com preview/download, alertas inteligentes, Feegow card. Tudo funcional.
7. **Cadastro público** (`/cadastro/medico`): usa dados reais, upload para bucket `medico-docs`, validação Zod, cria registro em `medicos` como pendente.
8. **Realtime**: canal `medicos-admin` com `postgres_changes` para auto-reload.
9. **Lib `medicoRegistro.ts`**: CRUD real (listMedicos, createMedico, getMedicoByUser, updateMedicoStatus, listAuditoria, uploadDocumento, getSignedUrl).
10. **Edge Function `feegow-liberar-medico`**: existe e é invocada pela UI.

---

### B) Quebrado / Crítico

1. **RPCs inexistentes no banco**: O código chama 6 RPCs via `supabase.rpc()` que **NÃO existem** no banco:
   - `medico_colocar_em_analise`
   - `medico_aprovar`
   - `medico_reprovar`
   - `medico_suspender`
   - `medico_bloquear`
   - `medico_reativar`
   
   **Impacto**: Todas as ações de status (Aprovar, Reprovar, Suspender, Bloquear, Reativar, Em Análise) vão falhar com erro RPC. O Admin não consegue gerenciar nenhum médico.

2. **Fallback `updateMedicoStatus`**: Existe uma função alternativa que faz UPDATE direto + INSERT na auditoria, mas ela **não é usada** — o código da página chama exclusivamente as RPCs inexistentes.

---

### C) Duplicado / Mal estruturado

1. **Duas vias de atualização de status**: `updateMedicoStatus()` (UPDATE direto) e as 6 RPCs (inexistentes). A função `updateMedicoStatus` existe na lib mas nunca é chamada pela tela. Deveria ser removida ou substituída pelas RPCs.

---

### D) Mockado / Simulado

Nada mockado. Todo o fluxo usa dados reais do Lovable Cloud.

---

### E) Falta implementar

1. **Criar as 6 RPCs no banco** com SECURITY DEFINER, validação de permissão Admin, atualização atômica de status + campos de suspensão/bloqueio + inserção de auditoria — tudo numa transação.
2. **Remover `updateMedicoStatus`** (obsoleto) da lib após criar as RPCs.

---

### F) Melhorias UX/UI

1. Sem paginação na lista — se houver muitos médicos, carrega todos de uma vez. Considerar paginação futura.
2. O loading é um simples texto "Carregando..." — poderia usar skeleton.
3. Minor: botão "Em análise" poderia ter ícone diferenciado (Clock já é usado, ok).

---

### G) Riscos técnicos / segurança

1. **CRÍTICO**: RPCs inexistentes = Admin não gerencia médicos. Nenhuma ação de aprovação/rejeição funciona.
2. A função `updateMedicoStatus` faz UPDATE direto via client — menos seguro que uma RPC SECURITY DEFINER, mas funciona como fallback temporário graças à policy "Admin manages all medicos".
3. A inserção de auditoria via client em `updateMedicoStatus` depende da policy "Admins insert auditoria" — funciona, mas sem transação (se o update passar e o insert da auditoria falhar, fica inconsistente).

---

### H) Plano de ação

**Etapa 1 — Criar as 6 RPCs** (migration SQL)

Criar `medico_colocar_em_analise`, `medico_aprovar`, `medico_reprovar`, `medico_suspender`, `medico_bloquear`, `medico_reativar` como funções SECURITY DEFINER que:
- Verificam `has_role(auth.uid(), 'admin')`
- Atualizam status + campos específicos (motivo, suspenso_ate, etc.)
- Inserem linha na `medicos_auditoria` com actor, observação e payload
- São atômicas (uma única transação)

**Etapa 2 — Limpar código morto**

Remover `updateMedicoStatus` de `medicoRegistro.ts` (não é mais chamada por nenhuma tela).

Apenas 2 etapas. Nenhuma mudança na UI necessária — o código front já está correto, só faltam os RPCs no banco.
