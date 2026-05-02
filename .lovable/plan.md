
# Checkup Completo — Termos & Condições

---

## A) O que está funcionando (real)

| Item | Status |
|---|---|
| Tabela `termos_condicoes` com versionamento automático | OK |
| Tabela `user_terms_acceptance` com IP + user-agent | OK |
| Trigger `trg_termos_auto_versao` — incrementa versão automaticamente | OK |
| Trigger `trg_termos_ensure_single_active` — garante 1 ativo por tipo | OK |
| Trigger `trg_termos_audit` — registra criação/ativação em auditoria | OK |
| RLS: admin CRUD, usuário lê apenas ativos, aceite vinculado a `auth.uid()` | OK |
| Lib `src/lib/termos.ts` — CRUD completo, aceite com IP, verificação de pendentes | OK |
| Painel Admin (`AdminTermosCondicoes.tsx`) — filtros, abas, criar, ativar/desativar, preview, ver aceites | OK |
| Banner global `TermosPendentesBanner` no AppLayout — detecta termos pendentes | OK |
| `TermsAcceptanceDialog` — modal obrigatório reutilizável | OK |
| Enforcement no fluxo de agendamento paciente (`consulta_paciente`) | OK |
| Enforcement no dashboard médico (`contrato_medico`) | OK |
| Histórico `MeusAceites` visível para Paciente, Médico e Empresa | OK |
| 10 tipos de termo no enum (cobre todos os cenários planejados) | OK |

---

## B) O que está quebrado

### BUG 1: Rota admin sem permission guard
`/app/admin/termos-condicoes` não tem `<G perm="...">`. Qualquer perfil autenticado que acesse a URL direta consegue ver a página (a RLS protege os dados, mas a UI não deveria estar acessível).

### BUG 2: EmpresaTermos busca categoria errada
Linha 31 de `EmpresaTermos.tsx`: `buscarTermosPendentes("paciente")` — deveria ser `"empresa"` para buscar `proposta_empresa`.

### BUG 3: Tabela `termos_condicoes` vazia
Nenhum termo foi cadastrado no banco. Os cards aparecem com "0 versão(ões) / Nenhuma ativa". Sem termos ativos, nenhum enforcement funciona.

---

## C) O que está duplicado ou mal estruturado

Nada duplicado — a arquitetura está limpa. A lib `termos.ts` é a única fonte de verdade, reutilizada em todos os componentes.

---

## D) O que está mockado/simulado

Nenhum mock. Todo o código é real, conecta ao banco, com triggers e auditoria. O problema é que o banco está vazio (sem termos cadastrados).

---

## E) O que falta implementar

### FALTA 1: Termos pré-populados
O admin precisa ter termos de exemplo/template pré-criados para cada tipo. Sem isso, o botão "Criar novo termo" é confuso — o admin não sabe o que escrever.

### FALTA 2: Enforcement nos demais fluxos
Apenas 2 dos 10 tipos de termo estão sendo exigidos. Falta enforcement em:
- `privacidade` — no cadastro do paciente
- `plano_plataforma` — na contratação de plano pelo paciente
- `plano_medico` — na contratação de plano pelo paciente
- `gamificacao_premium` — ao aderir ao premium
- `criacao_plano_medico` — quando médico cria plano
- `uso_feegow` — quando médico ativa Feegow
- `proposta_empresa` — quando empresa aceita proposta
- `proposta_medico` — quando médico aceita proposta B2B

### FALTA 3: Edição de conteúdo
O admin não pode **editar** um termo existente (apenas criar nova versão). Isso é intencional para imutabilidade, mas deveria poder editar **rascunhos** (status = "inativo") antes de publicar.

---

## F) Melhorias de UX/UI

1. **Botão "Criar novo termo"** — confuso para quem não entende os tipos. Sugestão: ao clicar, mostrar um wizard com templates pré-preenchidos por tipo.
2. **Preview do conteúdo** — renderiza HTML diretamente (`dangerouslySetInnerHTML`). Funciona, mas deveria ter um editor rich-text (ou Markdown) para facilitar a criação.
3. **Falta indicador de "rascunho"** — termos inativos não mostram claramente que são editáveis.

---

## G) Riscos técnicos ou de segurança

1. **Rota admin sem guard** (BUG 1) — risco médio, RLS protege os dados mas a UI deveria ser restrita.
2. **`dangerouslySetInnerHTML`** no preview e aceite — se o admin inserir HTML malicioso ou for comprometido, pode causar XSS. Risco baixo (somente admin cria termos), mas deveria sanitizar.
3. **IP via api.ipify.org** — chamada externa síncrona no aceite. Se o serviço estiver fora, não falha (tem try/catch), mas o IP fica vazio.

---

## H) Plano de ação em etapas

### Etapa 1 — Correções críticas (bugs)
- Adicionar `<G perm="termos.gerenciar">` na rota admin
- Corrigir `EmpresaTermos.tsx` para usar categoria `"empresa"` ao invés de `"paciente"`

### Etapa 2 — Pré-popular termos de exemplo
- Inserir 1 termo (inativo/rascunho) para cada um dos 10 tipos com conteúdo de template genérico
- Admin pode então editar, personalizar e ativar

### Etapa 3 — Permitir edição de rascunhos
- Adicionar botão "Editar" para termos com status "inativo"
- Criar função `editarTermo()` na lib que só permite edição de inativos

### Etapa 4 — Enforcement nos fluxos restantes
- Adicionar `useTermsCheck` + `TermsAcceptanceDialog` nos pontos estratégicos:
  - `privacidade` no cadastro/primeiro login
  - `plano_*` na tela de contratação
  - `proposta_*` no aceite de propostas B2B
  - `gamificacao_premium` na adesão premium

### Etapa 5 — Sanitização HTML
- Adicionar DOMPurify para sanitizar conteúdo antes de renderizar com `dangerouslySetInnerHTML`

---

Diga **"etapa 1"** para começar pelas correções de bugs, ou indique qual etapa prefere.
