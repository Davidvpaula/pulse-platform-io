## Problema

Na página **Meu Plano** do paciente (`/app/paciente/plano`), os botões da seção "Planos disponíveis" não fazem nada quando clicados.

**Causa raiz:** em `PlanoPlataformaTab.tsx`, o componente `<PlanosDisponiveisSection>` é renderizado em dois lugares passando `onSelecionar={() => {}}` — uma função vazia. O clique em **Selecionar** chama esse callback que não faz nada.

A rota de assinatura já existe e funciona: `/app/paciente/assinar-plano/:planoId` → `PacienteAssinarPlano`.

## Mudanças

### 1. `src/components/paciente/PlanoPlataformaTab.tsx`
- Importar `useNavigate` do `react-router-dom`.
- Substituir os dois `onSelecionar={() => {}}` por:
  ```ts
  onSelecionar={(id) => navigate(`/app/paciente/assinar-plano/${id}`)}
  ```
- O botão **"Ver planos disponíveis"** do estado vazio também aponta para `/planos` (página pública). Trocar para um scroll suave até a seção `PlanosDisponiveisSection` (que já está logo abaixo), evitando sair do app.

### 2. `src/components/paciente/plano-helpers.tsx` (opcional, leve)
- Adicionar `id="planos-disponiveis"` na `<section>` de `PlanosDisponiveisSection` para suportar o scroll/anchor do item acima.

### 3. Verificar `PlanoPersonalizadoTab` e `PlanoEmpresaTab`
- Não usam `PlanosDisponiveisSection`, então não precisam de alteração. Apenas confirmar.

## Escopo

Mudança puramente de UI/navegação — sem alterar queries, schema ou lógica de negócio. Nenhuma rota nova.

## Validação

- Clicar em **Selecionar** em qualquer card de "Planos disponíveis" deve abrir `/app/paciente/assinar-plano/:planoId` (tela já existente com checkout Stripe embedded).
- Botão **"Ver planos disponíveis"** no estado vazio rola a página até a grade de cards, em vez de levar para `/planos` público.
- Botão **"Plano atual"** continua desabilitado quando `isAtual = true`.
