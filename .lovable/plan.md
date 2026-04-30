# Histórico/auditoria de mudanças no repasse financeiro

## O que vai existir

Toda alteração feita em:
- **Repasse global** (`app_settings['financeiro.comissao_padrao_pct']`) — % retido pela plataforma
- **Exceções por médico** (`medico_comissao_override`) — criação, edição, ativação/desativação e remoção

passa a gerar automaticamente um registro na tabela já existente `financeiro_auditoria`, com:
- **data/hora** (`created_at`)
- **usuário responsável** (`actor_id` = `auth.uid()`)
- **valor anterior e valor novo** (em % de repasse do médico, padronizado para a UI)
- **motivo opcional** (texto livre informado pelo admin no momento da edição)
- **payload** com detalhes técnicos (medico_id, servico_id, ativo)

## Como o admin vai ver

Na tela "Repasse financeiro" (`/app/admin/financeiro/repasse`), adicionar um terceiro card:

**"Histórico de alterações"** — tabela com últimas 50 mudanças, mostrando:
- Data/hora
- Quem alterou (nome do staff)
- O que mudou (Global · Exceção criada · Exceção editada · Exceção removida · Ativada/Desativada)
- De → Para (em % do médico)
- Motivo (se informado)

Filtros simples no topo: Tipo (Global / Exceção), médico (busca), período (últimos 7/30/90 dias).

Botão "Exportar CSV" para download do histórico filtrado.

## Captura do motivo na UI

- **Repasse global**: o `confirm()` atual vira um modal pequeno com campo opcional "Motivo da alteração" (textarea).
- **Exceção por médico**: o modal já tem campo `motivo`; passa a ser interpretado também como motivo da alteração (registrado a cada edição).
- **Remover/Toggle ativo**: o `confirm()` atual vira modal com campo opcional de motivo.

## Detalhes técnicos

### 1. Trigger no banco — captura automática

Migration nova com:

**Função `fn_audit_repasse_global()`** (AFTER UPDATE em `app_settings` quando `key = 'financeiro.comissao_padrao_pct'`):
- Calcula `% médico = 100 - % plataforma` para `valor_anterior` e `valor_novo`.
- Insere em `financeiro_auditoria` com `entidade='repasse_global'`, `acao='atualizado'`, `actor_id=auth.uid()`, `motivo=current_setting('app.audit_motivo', true)`.

**Função `fn_audit_override_medico()`** (AFTER INSERT/UPDATE/DELETE em `medico_comissao_override`):
- INSERT → `acao='criado'`, `valor_anterior=NULL`, `valor_novo=100-NEW.comissao_pct`.
- UPDATE → `acao='editado'` ou `acao='ativado'`/`acao='desativado'` se só `ativo` mudou.
- DELETE → `acao='removido'`.
- `entidade='comissao_override'`, `entidade_id=NEW.id` (ou `OLD.id`), `payload` com `{medico_id, servico_id, ativo, motivo_override}`.

Ambas usam `current_setting('app.audit_motivo', true)` (variável de sessão) para puxar o motivo livre informado pelo usuário.

### 2. Front — propagar o motivo

Em `src/lib/financeiroConfig.ts`, novo helper:
```ts
async function comMotivo<T>(motivo: string | null | undefined, fn: () => Promise<T>): Promise<T>
```
que faz `supabase.rpc('set_audit_motivo', { motivo })` antes da operação e limpa depois.

Criar RPC `set_audit_motivo(text)` simples que faz `SET LOCAL app.audit_motivo = $1`.

Atualizar `setRepasseGlobal`, `upsertOverrideParticular`, `deleteOverride` e `toggleOverrideAtivo` para receber `motivo?: string` opcional.

### 3. Front — listagem de auditoria

Em `src/lib/financeiroConfig.ts`:
```ts
export type RepasseAuditoriaRow = {
  id: string;
  created_at: string;
  entidade: 'repasse_global' | 'comissao_override';
  acao: string;
  actor_nome: string | null;
  valor_anterior: number | null;
  valor_novo: number | null;
  motivo: string | null;
  medico_nome?: string | null;
};

export async function listAuditoriaRepasse(filtros: {
  tipo?: 'global' | 'override' | 'todos';
  medico_id?: string;
  desde?: string; // ISO date
}): Promise<RepasseAuditoriaRow[]>
```

Faz `select` em `financeiro_auditoria` filtrando `entidade IN ('repasse_global','comissao_override')`, com join opcional em `medicos` (via `payload->>medico_id`) e em `profiles` (via `actor_id`) para nomes.

### 4. Front — UI do card de histórico

Novo componente `RepasseAuditoriaCard.tsx` colocado dentro de `AdminFinanceiroConfig.tsx`, abaixo das seções existentes:
- Tabela com colunas: Data, Quem, Tipo (badge), De → Para, Motivo
- Filtros: select de tipo, busca de médico (reusa `searchMedicosAtivos`), select de período
- Botão "Exportar CSV" usando `Blob` + download local

### 5. Modais de motivo

- Trocar `confirm()` em `salvarGlobal`, `removerOverride` e `togglar` por um `MotivoDialog` simples (componente novo, ~50 linhas) com textarea opcional + Confirmar/Cancelar.
- O modal de exceção (já existente) passa o `motivo` técnico do override **e** envia via `comMotivo()` para o histórico (mesmo texto, simplifica UX).

## Arquivos afetados

- **Nova migration**: triggers `fn_audit_repasse_global` + `fn_audit_override_medico`, RPC `set_audit_motivo`.
- **`src/lib/financeiroConfig.ts`**: helper `comMotivo`, novos tipos e `listAuditoriaRepasse`, parâmetro `motivo` nas mutations.
- **`src/pages/app/admin/AdminFinanceiroConfig.tsx`**: novo card de histórico + uso do `MotivoDialog`.
- **`src/components/financeiro/MotivoDialog.tsx`** (novo): diálogo reusável de confirmação com motivo.
- **`src/components/financeiro/RepasseAuditoriaCard.tsx`** (novo): card de histórico com filtros e export.

## Garantias

- **Imutável**: `financeiro_auditoria` permanece append-only (RLS já permite só SELECT para admin/staff com `financeiro.ver`; nenhuma policy de UPDATE/DELETE será adicionada).
- **Não afeta snapshots**: triggers só registram; não tocam em consultas, `consultas_financeiro` nem cálculo de comissão.
- **Capability gate**: card e listagem usam a mesma proteção `financeiro.editar_comissao` da rota; SELECT da auditoria pede `financeiro.ver` (já configurado).
- **Sem secrets/integrações novas**.