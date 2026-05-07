
# Cadastro Inline de Dependente na Tela de Agendamento

## Conceito

Adicionar ao `SeletorPacienteAtendido` uma terceira opção **"+ Agendar para outra pessoa"** que abre um mini-formulário inline (collapsible/accordion) direto na tela de confirmação — sem sair da rota, sem dialog, sem perder dados.

Após preencher os dados do dependente e avançar (clicar "Reservar e ir para pagamento"), o sistema:
1. Cria o dependente na tabela `pacientes` (com `tipo_paciente = 'dependente'`, `responsavel_id = titular`)
2. Registra o consentimento em `dependente_consentimentos`
3. Seleciona automaticamente o novo dependente como `paciente_atendido_id`
4. Prossegue normalmente com reserva + checkout

**Documentos do dependente vão para o dashboard do responsável** — isso já está implementado e funcionando (RLS via `is_titular_do_paciente`).

## O que muda

### 1. `SeletorPacienteAtendido.tsx`
- **Sempre mostrar** o componente (mesmo sem dependentes existentes) — remover o `if (dependentes.length === 0) return null`
- Adicionar opção de rádio **"Outra pessoa"** com ícone `UserPlus`
- Quando selecionada, exibir formulário inline com: Nome completo, CPF, Data nascimento, Sexo, Parentesco, Checkbox de consentimento LGPD
- Nova prop `onDependenteCriado?: (id: string) => void` para notificar o pai
- O formulário reutiliza as mesmas validações e constantes de `PacienteDependentes.tsx` (parentescos, termo)

### 2. `AgendamentoConfirmar.tsx`
- Remover a condição `{titularPacienteId && (` — o seletor deve aparecer sempre que há `titularPacienteId`
- Interceptar o submit: se "Outra pessoa" está selecionada e o dependente ainda não foi salvo, criar o dependente primeiro e depois prosseguir com a reserva
- Passar `titularPacienteId` para o seletor (já faz isso)

### 3. Nenhuma alteração em
- Banco de dados / migrations
- RLS policies
- Checkout
- Documentos
- Agenda médica
- Slots
- Financeiro
- RPCs

## Fluxo do usuário

```text
Tela de confirmação:
┌──────────────────────────────────┐
│ 👤 Quem será atendido?           │
│                                  │
│ ○ Eu mesmo                       │
│ ○ Maria (Filho(a)) ← se existir │
│ ○ + Agendar para outra pessoa    │
│                                  │
│ ┌─ Formulário inline ──────────┐ │
│ │ Nome: [___________]          │ │
│ │ CPF: [___] Nasc: [___]       │ │
│ │ Sexo: [___] Parent: [___]    │ │
│ │ ☑ Declaro responsabilidade…  │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

## Respostas às perguntas

- **É possível?** Sim — toda a infra de dependentes já existe (tabela, RLS, consentimentos)
- **Fácil de implantar?** Sim — é basicamente um formulário inline no componente existente, reutilizando a mesma lógica de `PacienteDependentes`
- **Documentos vão para o dashboard do responsável?** Sim — já implementado via `is_titular_do_paciente()` na RLS de `documentos_paciente`

## Detalhes técnicos

- Validação: CPF (lib existente), nome ≥3 chars com sobrenome, nascimento obrigatória, parentesco obrigatório, aceite obrigatório
- Insert usa `supabase.from("pacientes").insert(...)` com `tipo_paciente: "dependente"` e `user_id: null` (mesmo padrão da tela Dependentes)
- Consentimento registrado em `dependente_consentimentos` com snapshot do termo
- Após criação, o dependente aparece automaticamente na lista de rádios e fica selecionado
- Nenhuma migration necessária — usa apenas estruturas existentes
