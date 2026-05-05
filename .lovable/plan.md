
## Problema

1. **AdminPlanos.tsx** carrega TODOS os planos sem filtrar por `nivel`, misturando planos da plataforma com planos de médicos.
2. **Perfil público do médico** (`MedicoDetalhe` em PublicPages.tsx) não exibe os planos do médico.
3. **PacientePlano.tsx** — quando o paciente não tem assinatura, o botão "Selecionar" do plano chama `onSelecionar={() => {}}` (no-op). Nada acontece ao clicar.
4. **PacienteMontarPlano.tsx** — não filtra por `aprovado_admin`, permitindo que médicos não aprovados apareçam.

---

## Plano de Implementação

### 1. AdminPlanos — filtrar apenas planos da plataforma

Em `src/pages/app/admin/AdminPlanos.tsx`, na função `carregar()`, adicionar filtro `.not("nivel", "eq", "medico")` na query de planos. Isso exclui planos de médicos dessa tela (que já têm a tela dedicada `AdminPlanosMedicos`).

### 2. Perfil público do médico — exibir planos aprovados

Em `src/pages/public/PublicPages.tsx`, no componente `MedicoDetalhe`:

- Carregar planos do médico: query `planos` com `medico_id = med.id`, `nivel = medico`, `status = ativo`, `aprovado_admin = true`, `publicado_site = true`, incluindo `plano_beneficios(nome)`.
- Renderizar seção "Planos do Médico" ao final da coluna principal, com cards mostrando nome, valor, benefícios e botão "Assinar" (link para `/app/paciente/plano`).

### 3. PacientePlano — corrigir seleção de planos sem assinatura

Em `src/pages/app/paciente/PacientePlano.tsx`:

- No bloco sem assinatura (linhas ~194-199), trocar `onSelecionar={() => {}}` por uma função que redirecione o paciente para a contratação (ex: `toast.info("Funcionalidade de contratação em breve")` ou navegar para checkout quando disponível).
- Garantir que o botão "Selecionar" tenha feedback visual claro.

### 4. PacienteMontarPlano — filtrar por aprovado_admin

Em `src/pages/app/paciente/PacienteMontarPlano.tsx`, na query de `planosMedicos` (linha ~77), adicionar `.eq("aprovado_admin", true)` para que apenas médicos com planos aprovados pelo admin apareçam como selecionáveis.

### 5. AdminPlanosMedicos — melhorias de dados

A tela `AdminPlanosMedicos.tsx` já filtra por `nivel = medico` e já funciona corretamente. Nenhuma alteração necessária.

---

## Arquivos Afetados

- `src/pages/app/admin/AdminPlanos.tsx` — adicionar filtro de nivel
- `src/pages/public/PublicPages.tsx` — seção de planos no perfil do médico
- `src/pages/app/paciente/PacientePlano.tsx` — corrigir onSelecionar
- `src/pages/app/paciente/PacienteMontarPlano.tsx` — filtrar aprovado_admin
