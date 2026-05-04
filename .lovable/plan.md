
## Limpeza de cadastros fake

### O que será removido

**Usuário 1 — srsoulouco@gmail.com** (auth id: `b49b9c42-...`)
- Registro em `pacientes` (1 registro, sem dados preenchidos)
- Registro em `user_roles` (1)
- Auth user

**Usuário 2 — nagilalasmar@gmail.com** (auth id: `f5c534ef-...`)
- Médico vinculado (`08434d53-...`) + dados dependentes:
  - `medico_especialidades` (1)
  - `agenda_slots` (96)
  - `medico_ranking` (1)
  - `medicos_auditoria` (registros vinculados)
- Registro em `user_roles` (1)
- Auth user

**Preservado:** `davidvpaula01@gmail.com` + médico `80de3629-...` vinculado (será mantido como admin, mas o registro de médico dele **também será removido** já que não é médico real — ou prefere manter?)

### Observação importante

O médico `80de3629-...` está vinculado ao `davidvpaula01@gmail.com`. Ele tem:
- 1 especialidade
- 1 ranking
- ~96 agenda_slots (se compartilhados)
- auditoria

Se `davidvpaula01` é **apenas admin**, faz sentido remover o registro de médico dele também e manter só o auth user + role admin.

### Execução técnica

Uma migration com DELETE em cascata, na ordem correta para respeitar foreign keys:

1. DELETE dependências dos médicos (agenda_slots, medico_especialidades, medico_ranking, medicos_auditoria)
2. DELETE pacientes dos user_ids fake
3. DELETE médicos fake
4. DELETE user_roles dos user_ids fake
5. DELETE auth.users dos 2 user_ids fake (via `auth.users`)

Tudo em uma única migration transacional.
