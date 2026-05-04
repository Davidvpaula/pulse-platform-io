
## Melhorias na página Meus Horários (MedicoHorarios)

### 1. Botão "Excluir dia" na lista de horários cadastrados

Ao lado do título de cada dia (ex: "SEGUNDA-FEIRA, 04 DE MAIO"), adicionar um botão "Excluir dia" com ícone de lixeira. Ao clicar, abre o AlertDialog de confirmação informando quantos slots disponíveis serão excluídos. Somente slots com status `disponivel` são removidos (reservados/bloqueados ficam).

**Alterações:**
- `src/lib/clinico.ts` — nova função `excluirSlotsDoDia(medicoId, dataISO)` que deleta todos slots disponíveis daquele dia de uma vez.
- `src/pages/app/medico/MedicoHorarios.tsx` — adicionar botão ao lado do label do dia + state para controlar o dialog de confirmação de exclusão em lote.

### 2. Seleção múltipla de serviços (tipo "Serviço da plataforma")

Atualmente o médico seleciona 1 serviço por vez no Select. Trocar para um sistema de checkboxes/multi-select: o médico marca vários serviços e ao gerar horários, cria slots separados para cada serviço selecionado (cada slot tem seu `servico_id`).

**Alterações:**
- `src/pages/app/medico/MedicoHorarios.tsx`:
  - `servicoSel: string | null` vira `servicosSel: string[]`
  - Trocar o `<Select>` por uma lista de checkboxes com nome, duração e preço de cada serviço
  - Na geração (`gerarSemanal` / `gerarDia`), iterar sobre cada serviço selecionado e chamar `criarSlotsEmLote` para cada um (usando a duração específica do serviço)
  - Validação: exigir ao menos 1 serviço selecionado
  - Info de duração: mostrar a duração de cada serviço selecionado (ou "variável" se múltiplos com durações diferentes)

### 3. Modo Particular — conectar com perfil/especialidade real

Verificar que quando `tipoSlot === "particular"`:
- A duração vem de `medico_especialidades` (já funciona via `getDuracaoSlotMedico`)
- Mostrar o nome da especialidade e o preço (`preco_centavos`) do médico na UI, para que ele saiba exatamente o que está configurando
- Se não houver especialidade ativa, bloquear geração e linkar para Configurações

**Alterações:**
- `src/pages/app/medico/MedicoHorarios.tsx`:
  - No `refresh()`, buscar também `medico_especialidades` (nome da especialidade + preço) para o médico logado
  - No card de info de duração, quando `particular`, mostrar: "Especialidade: {nome} · Duração: {X}min · Valor: R$ {Y}"
  - Se não tiver especialidade ativa, mostrar alerta com link para Configurações

### Arquivos impactados
- `src/lib/clinico.ts` — nova função `excluirSlotsDoDia`
- `src/pages/app/medico/MedicoHorarios.tsx` — as 3 melhorias acima

### Sem impacto em
- Ranking, gamificação, financeiro — nenhuma dessas funcionalidades é alterada
- Rotas, tabelas, migrations — não necessários (a exclusão em lote usa o mesmo `DELETE` do RLS existente)
