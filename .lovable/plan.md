
# Etapa 3 — Refatorar Agendamentos (pendência do checkup)

## Diagnóstico

Analisei as 4 páginas de agendamento:

| Perfil | Linhas | Fonte de dados | Problemas |
|--------|--------|---------------|-----------|
| **Admin** (808 linhas) | Real (consultas + RPCs + auditoria) | `brl()` local duplicado (deveria usar `@/lib/relatorios/utils`) |
| **Secretaria** (248 linhas) | Real (`lib/clinico`) | Nenhum problema |
| **Paciente** (367 linhas) | Real (`lib/clinico`) + mock apenas para DemoLista (sem login) | Aceitável |
| **Empresa** (207 linhas) | **100% localStorage** (`lib/empresa`) | **Precisa migrar para dados reais** |

Sobre componentes compartilhados: cada perfil tem finalidade muito diferente (Admin = auditoria/controle; Secretaria = operacional; Paciente = self-service; Empresa = corporativo). Forçar um componente único seria gambiarra. Os componentes reutilizáveis que fazem sentido (`StatusBadge`, `ConsultaHistoricoDialog`) **já estão sendo usados**.

## Plano de ação

### 1. Corrigir brl() duplicado no AdminAgendamentos
- Remover função `brl()` local (linha 106-108)
- Importar de `@/lib/relatorios/utils`
- Impacto: apenas `AdminAgendamentos.tsx`

### 2. Migrar EmpresaAgendamentos de localStorage para dados reais
- Substituir imports de `@/lib/empresa` por queries reais à tabela `consultas`
- Buscar agendamentos onde `empresa_id` = empresa do usuário logado (mesmo padrão já usado em `EmpresaFinanceiro` e `EmpresaPropostas`)
- Manter a funcionalidade de criar agendamento individual e em lote, agora via insert real em `consultas`
- Adicionar skeleton loading durante carregamento
- Impacto: apenas `EmpresaAgendamentos.tsx`

### Sem alterações em:
- `SecretariaAgendamentos` (já usa dados reais via `lib/clinico`)
- `PacienteAgendamentos` (dados reais + mock só para demo sem login)
- Nenhuma tabela ou migration necessária
