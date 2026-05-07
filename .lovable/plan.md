## Objetivo
Adicionar campo **Tratamento** (prefixo) configurável pelo médico no perfil (ex: Dr., Dra., Prof., Prof.ª, ou nenhum). O prefixo será usado automaticamente em toda a plataforma ao exibir o nome do médico.

## 1. Migração — coluna `tratamento` na tabela `medicos`

```sql
ALTER TABLE public.medicos ADD COLUMN tratamento TEXT DEFAULT NULL;
```

Valores esperados: `Dr.`, `Dra.`, `Prof.`, `Prof.ª`, ou `NULL` (sem prefixo). Sem enum — campo texto livre limitado no frontend.

## 2. Perfil do Médico (`MedicoPerfil.tsx`)

- Adicionar um **Select** acima do campo "Nome completo" com opções: *Nenhum*, *Dr.*, *Dra.*, *Prof.*, *Prof.ª*
- Carregar o valor de `medico.tratamento` no state
- Incluir o campo no `salvarPerfilPublico()` via `updateMedicoPerfil`
- Atualizar a **prévia lateral** para mostrar o prefixo antes do nome (ex: "Dra. Nágila Lasmar")

## 3. Helper `formatNomeMedico`

Criar uma função utilitária reutilizável:

```ts
export function formatNomeMedico(tratamento: string | null, nome: string): string {
  return tratamento ? `${tratamento} ${nome}` : nome;
}
```

## 4. Uso em toda a plataforma

Substituir exibições diretas de `nome` / `paciente_nome` (quando se trata de médico) pelo helper nos componentes principais:
- **Fila de atendimento** (MedicoConsultas) — nome do médico no header/breadcrumb se aplicável
- **Página pública do médico** (MedicoSlotsPanel, cards de destaque)
- **Dashboard do médico** — saudação
- **Cards de consulta do paciente** — nome do médico

Onde o `tratamento` não estiver disponível via query, adicionar o campo ao select.

## Detalhes técnicos
- Coluna nullable TEXT, sem enum (flexibilidade futura)
- Sem RLS adicional — mesma policy da tabela `medicos`
- `updateMedicoPerfil` já faz update genérico, basta passar `tratamento`
- Impacto mínimo: adição de coluna + select no perfil + helper nos componentes de exibição
