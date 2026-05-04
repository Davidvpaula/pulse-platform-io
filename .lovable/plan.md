Do I know what the issue is? Sim.

Diagnóstico confirmado:
- O erro atual não é por o usuário ter sido cadastrado antes das alterações. O usuário logado já tem perfil em `pacientes` vinculado.
- A causa direta é estrutural: as RPCs de reserva (`fn_servico_reservar_slot` e `fn_pa_reservar_slot`) tentam gravar em `agenda_slots.reservado_por`, mas essa coluna ainda não existe no banco ativo.
- `reservado_por` deve apontar para `public.pacientes(id)`, não para o ID do login/autenticação. Ela é usada como marcador temporário de reserva antes da consulta existir.
- `reservado_por_consulta_id` continua sendo outra coisa: guarda a consulta criada depois da confirmação/reserva convertida.
- Especialidade flui normal porque consulta particular usa `criar_consulta_com_reserva`, que já trabalha com `reservado_por_consulta_id` e não depende dessa coluna temporária.

Impactos identificados:
- Agenda: precisa adicionar `reservado_por` sem alterar `reservado_por_consulta_id`; limpar reservas expiradas/canceladas precisa continuar liberando slots.
- Médico: seleção/ranking por médico continua igual; não vou mexer na geração de slots nem disponibilidade médica.
- Financeiro: serviço da plataforma deve manter `servico_id` e preço de `servicos_financeiros`; consulta particular continua usando especialidade/valor do médico.
- UX: hoje serviço da plataforma reserva 10 minutos no banco, mas a tela usa 1m30s. Vou alinhar a tela ao prazo real retornado pela RPC para não parecer que expirou antes/depois.

Plano de correção, sem gambiarra:

1. Aplicar migration real no banco
   - Adicionar coluna temporária:
     - `agenda_slots.reservado_por uuid null references public.pacientes(id) on delete set null`
   - Criar índice leve para consultas/limpezas de reserva, se ainda não existir.
   - Não remover nem substituir `reservado_por_consulta_id`.

2. Corrigir RPCs de reserva para ficarem consistentes
   - `fn_pa_reservar_slot(_slot_inicio timestamptz)`:
     - continuar buscando `pacientes.id` via `auth.uid()`;
     - gravar `reservado_por = paciente_id`;
     - manter `FOR UPDATE OF s SKIP LOCKED`;
     - retornar `reserva_expira_em`.
   - `fn_servico_reservar_slot(_servico_id uuid, _slot_inicio timestamptz)`:
     - manter assinatura oficial com `_servico_id` primeiro;
     - gravar `reservado_por = paciente_id`;
     - manter `FOR UPDATE OF s SKIP LOCKED`;
     - retornar `reserva_expira_em` real de 10 minutos.

3. Corrigir RPCs de confirmação onde há inconsistência latente
   - `fn_servico_confirmar_reserva(_slot_id uuid, _servico_id uuid)`:
     - validar que `_slot.reservado_por` pertence ao paciente logado;
     - criar consulta com `paciente_id = public.pacientes.id`;
     - preencher `reservado_por_consulta_id`;
     - limpar `reserva_expira_em` e `reservado_por` após converter em consulta.
   - `fn_pa_confirmar_reserva(_slot_id uuid)`:
     - remover dependência errada de `_paciente_id default auth.uid()` como se fosse paciente;
     - buscar `pacientes.id` via `auth.uid()`;
     - validar proprietário da reserva via `reservado_por`;
     - ler o serviço de PA pela chave atual `atendimento_imediato.servico_id`;
     - preencher `servico_id`, preço e `reservado_por_consulta_id` corretamente;
     - limpar `reserva_expira_em` e `reservado_por`.

4. Manter as assinaturas oficiais e remover ambiguidade
   - Garantir que restem somente:
     - `fn_pa_reservar_slot(_slot_inicio timestamptz)`
     - `fn_servico_reservar_slot(_servico_id uuid, _slot_inicio timestamptz)`
     - `fn_pa_confirmar_reserva(_slot_id uuid)` ou assinatura sem parâmetro de paciente exposto
     - `fn_servico_confirmar_reserva(_slot_id uuid, _servico_id uuid)`
   - Dropar assinaturas antigas/invertidas se ainda existirem.

5. Atualizar frontend apenas para consumir o contrato correto
   - Em `/servicos/:slug`, usar o `reserva_expira_em` retornado pela RPC em vez de TTL fixo de 90s.
   - Manter chamada de serviço da plataforma com `_servico_id` + `_slot_inicio`.
   - Não alterar fluxo de consulta particular/especialidade, exceto se algum tipo gerado precisar refletir a migration automaticamente.

6. Validação pós-migration
   - Confirmar no banco que `agenda_slots.reservado_por` existe e referencia `pacientes(id)`.
   - Confirmar assinaturas restantes das RPCs via `pg_proc`.
   - Confirmar que as funções usam `FOR UPDATE OF s SKIP LOCKED`.
   - Testar/leitura de fluxo:
     - Atendimento imediato: reservar → `reservado_por` preenchido → confirmar → consulta criada → `reservado_por_consulta_id` preenchido.
     - Serviço da plataforma: reservar → prazo 10 min em `reserva_expira_em` → confirmar → consulta criada com `servico_id` e preço.
     - Consulta particular/especialidade: criar consulta com reserva continua usando `reservado_por_consulta_id`, sem regressão.
   - Checkup de agenda:
     - slots disponíveis seguem aparecendo;
     - slots reservados não aparecem como disponíveis;
     - reservas expiradas continuam liberáveis;
     - médico/financeiro não perde vínculo.

Se a ferramenta de migration real não estiver disponível no próximo passo, eu paro e informo o SQL exato para aplicação manual no Lovable Cloud. Não vou tentar “corrigir pelo frontend” enquanto a coluna estiver ausente no banco.

<lov-actions>
  <lov-open-history>View History</lov-open-history>
</lov-actions>

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>