## Objetivo

Permitir que o admin defina manualmente a ordem em que as especialidades aparecem na home pública (e demais listagens públicas), em **Configurações da plataforma → Especialidades**.

---

## 1. Banco (migration)

Adicionar coluna de ordem na tabela `especialidades`:

- `ordem` (integer, NOT NULL, default `999`) — quanto menor, mais cedo aparece.
- Inicializar com valores incrementais (10, 20, 30…) seguindo a ordem alfabética atual, deixando "saltos" para inserções futuras.
- Índice `idx_especialidades_ordem (ordem, nome)` para ordenação rápida.

Sem mudança de RLS (admin já gerencia tudo, leitura pública continua igual).

---

## 2. UI Admin — `AdminConfiguracoes.tsx`

Na tabela atual de especialidades (Nome / Descrição / Ativo / Ações), incluir:

- **Botões ↑ / ↓** em cada linha (coluna nova "Ordem", antes de "Ativo"), que trocam o `ordem` com o vizinho.
- Linhas exibidas ordenadas por `ordem ASC, nome ASC`.
- Pequeno selo numérico (`#1`, `#2`…) opcional ao lado do nome para feedback visual.
- Botão "Reordenar alfabeticamente" no header da seção (reseta `ordem` para múltiplos de 10 segundo o nome).

Implementação simples, sem drag-and-drop (mantém leveza, sem nova dependência). Cada clique em ↑/↓ faz um único `UPDATE` em 2 linhas via RPC ou dois updates sequenciais.

---

## 3. Leitura pública

Atualizar todos os pontos que listam especialidades para usuário final / médico:

- `src/hooks/useEspecialidadesPublicas.ts` — trocar `.order("nome")` por `.order("ordem").order("nome")` e selecionar `ordem` no select.
- `src/components/GlobalSearch.tsx` — mesma troca.
- `src/lib/cupons.ts` (linha 111) — idem.
- `src/pages/app/admin/AdminServicos.tsx`, `AdminPlanosEmpresariais.tsx`, `BeneficioSelector.tsx`, `MedicoHorarios.tsx`, `EmpresaPropostas.tsx`: ordenar por `ordem, nome`.

A home (`Home.tsx`) já consome `useEspecialidadesPublicas`, então passa a respeitar a ordem automaticamente. O `slice(0, 8)` continua válido — admin agora controla quais aparecem primeiro.

---

## 4. Detalhes técnicos

```text
especialidades
├─ ordem INT NOT NULL DEFAULT 999
└─ INDEX (ordem, nome)
```

- Toggle ativo, criação e exclusão continuam iguais.
- Nova especialidade criada via formulário recebe `ordem = max(ordem)+10` para entrar no fim.
- Sem alteração em `medico_especialidades`, `consultas` ou ledger.

---

## 5. Fora de escopo

- Drag-and-drop visual (pode entrar depois com `@dnd-kit` se necessário).
- Reordenar serviços (`servicos_financeiros`) — outra tabela, outro pedido.
- Categorias / agrupamentos.
