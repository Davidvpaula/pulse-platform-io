# Validação automática de % de repasse (médico + plataforma = 100)

## Objetivo

Garantir, em **três camadas**, que toda configuração de repasse no sistema sempre tenha plataforma + médico = 100%, com 2 casas decimais e sem brechas para valores fora de 0–100.

## 1. Componente reutilizável `RepasseSplitInput`

Novo componente em `src/components/financeiro/RepasseSplitInput.tsx` com dois inputs lado a lado (% médico / % plataforma) que se mantêm sincronizados:

- Editar **qualquer um dos dois** lados recalcula o outro automaticamente.
- **Clamp** automático para `[0, 100]` (impede digitar 150 ou negativos).
- **Arredondamento** para 2 casas, com badge laranja "Ajustado para 2 casas decimais" quando o valor digitado tinha mais.
- **Erro inline** vermelho quando o valor é vazio, NaN ou fora do intervalo.
- Badge verde **"Soma: 100,00%"** confirmando consistência.
- Em `onBlur` com erro, **reverte** para o último valor válido.
- Callback `onValidityChange(valid)` para o pai bloquear o botão Salvar enquanto inválido.

Props: `medicoPct`, `onChange`, `disabled`, `size`, `labels`, `plataformaEditavel`, `onValidityChange`.

## 2. Substituir os inputs atuais pelo componente

### `src/pages/app/admin/AdminFinanceiroConfig.tsx`
- **Card "Repasse global"** (linhas ~209–248): substitui o `Input` solitário do médico + caixa estática da plataforma pelo `RepasseSplitInput` com os dois lados editáveis.
- **Modal `ExcecaoModal`** (linhas ~597–623): mesmo tratamento.
- O botão "Salvar" / "Confirmar e salvar" (incluindo o `MotivoDialog`) fica `disabled` quando `valid === false`.

### `src/pages/app/admin/AdminServicos.tsx`
- Quando `modelo === "percentual"` (linhas ~419–425): troca o `Input` único por `RepasseSplitInput` (lado médico editável, plataforma editável), respeitando o cálculo `comissao_pct = % plataforma` que o backend espera. Os preços de preview (`preview.medico` / `preview.plataforma`) já refletem essa mudança automaticamente.
- Botão "Salvar" do diálogo desabilitado quando inválido.

### `src/pages/app/medico/MedicoServicos.tsx`
- Diálogo "Solicitar override de repasse" (linhas ~194–198): troca o input avulso por `RepasseSplitInput` (size `sm`). Preserva o estado `overridePct`.
- Botão "Solicitar" desabilitado quando inválido.

## 3. Defesa em profundidade no banco (rede de segurança)

Migration nova (será aplicada via tool de migração quando você aprovar este plano):

- **Trigger `BEFORE INSERT/UPDATE` em `app_settings`** (apenas `key='financeiro.comissao_padrao_pct'`):
  - Rejeita valores não numéricos, fora de `[0,100]` ou nulos com erro `check_violation`.
  - Arredonda para 2 casas e regrava `value` normalizado.
- **Trigger `BEFORE INSERT/UPDATE` em `medico_comissao_override`**:
  - Mesma validação + arredondamento (já existe `CHECK chk_override_pct`, mas a trigger garante o `round2`).
- **Trigger `BEFORE INSERT/UPDATE` em `servicos_financeiros`**:
  - Quando `modelo='percentual'`, valida `comissao_pct` ∈ `[0,100]` e arredonda.

Todas com `SET search_path = public`. Sem custos extras de leitura.

## Garantias resultantes

| Camada | Garantia |
|---|---|
| **UI** | Impossível clicar "Salvar" com soma ≠ 100, valor < 0, > 100 ou NaN. Erro visível e auto-correção. |
| **API client** | `setRepasseGlobal` / `upsertOverrideParticular` já fazem `clampPct` + `round2`. |
| **Banco** | Triggers rejeitam qualquer escrita inválida vinda de SQL direto, edge function ou bug futuro. |

## Arquivos afetados

- **Novo**: `src/components/financeiro/RepasseSplitInput.tsx`
- **Editado**: `src/pages/app/admin/AdminFinanceiroConfig.tsx`
- **Editado**: `src/pages/app/admin/AdminServicos.tsx`
- **Editado**: `src/pages/app/medico/MedicoServicos.tsx`
- **Nova migration**: triggers `fn_validar_repasse_global`, `fn_validar_override_pct`, `fn_validar_servico_pct`.

Sem mudanças em snapshots já gravados, sem novos secrets, sem alterações em integrações externas.