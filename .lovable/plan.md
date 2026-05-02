## Problem

`AdminGestaoB2B.tsx` maps DB columns using incorrect field names (`valor_mensal_centavos`, `vidas_contratadas`, `competencia`, `valor_centavos`, `emitida_em`) that don't exist in the actual schema. The code uses `as any` casts which suppress TS errors but causes all values to render as defaults (0, "---").

### Actual schema

**empresas_contratos**: `plano_mensal_centavos`, `valor_colaborador_centavos`, `valor_consulta_centavos`, `data_inicio`, `data_fim`, `status`, `limite_consultas_mes`, `modelo_financeiro`  
**empresas_faturas**: `competencia_ano`, `competencia_mes`, `valor_total_centavos`, `vencimento`, `status`, `qtd_funcionarios`, `qtd_consultas`, `pago_em`

No `vidas_contratadas` or `vidas_ativas` columns exist on contratos -- those would come from counting `empresas_funcionarios`.

## Plan

### 1. Fix AdminGestaoB2B.tsx field mappings

Update the `carregarDados` function to map real column names:

**Contratos:**
- `valor_mensal_centavos` -> `c.plano_mensal_centavos`
- `vidas_contratadas` -> `c.limite_consultas_mes ?? 0` (approximate; or query funcionarios count)
- `vidas_ativas` -> query `empresas_funcionarios` count per empresa (or set 0 for now)
- `inicio` -> `c.data_inicio`
- `fim` -> `c.data_fim`

**Faturas:**
- `competencia` -> `${f.competencia_mes}/${f.competencia_ano}`
- `valor_centavos` -> `f.valor_total_centavos`
- `emitida_em` -> `f.created_at`
- `vencimento` -> `f.vencimento`

### 2. Fix AdminRelatoriosB2B.tsx StatCard ref warning

The console shows `Function components cannot be given refs` for StatCard used in AdminRelatoriosB2B. This is a non-blocking warning but will clean it up if StatCard doesn't use forwardRef.

### Files changed
- `src/pages/app/admin/AdminGestaoB2B.tsx` -- fix all column mappings
- `src/pages/app/admin/AdminRelatoriosB2B.tsx` -- minor cleanup if needed
