
## 1. Ativar botão "Solicitar cancelamento" no PacientePlano

**Arquivo:** `src/pages/app/paciente/PacientePlano.tsx` (linhas 409-422)

O botão está `disabled` com tooltip "Em breve". Vou:
- Remover `disabled` e o wrapper `Tooltip`
- Adicionar um `Dialog` de confirmação com campo de motivo obrigatório
- Ao confirmar, inserir registro em `plano_cancelamento_evento` (tabela já existente) e atualizar status da assinatura para `cancelada` e do plano para `encerramento_pendente`
- O paciente sempre pode cancelar, independente do status do plano (exceto se já estiver `cancelada`)

---

## 2. Card "Meus Profissionais do Plano" no PacienteAgendamentos

**Arquivo:** `src/pages/app/paciente/PacienteAgendamentos.tsx`

Criar uma seção acima da lista de agendamentos que:
- Busca a assinatura ativa do paciente + plano vinculado
- Busca os médicos vinculados via `plano_medicos` (JOIN com `medicos`)
- Busca os benefícios do plano (`plano_beneficios`) para mostrar créditos (quantidade, ilimitado, período)
- Exibe cards com: foto do médico, nome, especialidade, créditos restantes/totais
- Botão "Agendar" em cada card que navega para a agenda do médico (`/app/agendamento?medico_id=...`)

### Sistema de créditos

A tabela `plano_beneficios` já tem `quantidade`, `ilimitado`, `periodo`. Para calcular créditos usados, vou contar consultas do paciente com cada médico no período atual (mês corrente). Créditos restantes = `quantidade - consultas_no_periodo` (ou "Ilimitado" se `ilimitado = true`).

Não existe tabela de "consumo de créditos" separada. O cálculo é derivado: conta-se quantas consultas confirmadas/concluídas o paciente teve com o médico no período vigente da assinatura.

---

## Mudanças técnicas

| Arquivo | O que muda |
|---|---|
| `src/pages/app/paciente/PacientePlano.tsx` | Remover `disabled` do botão cancelamento, adicionar Dialog com motivo, lógica de cancelamento via Supabase |
| `src/pages/app/paciente/PacienteAgendamentos.tsx` | Novo componente `MeusProfissionaisPlano` com cards dos médicos e créditos, navegação para agenda |

Nenhuma migração de banco necessária -- as tabelas `plano_cancelamento_evento`, `plano_medicos`, `plano_beneficios`, `assinaturas` já existem.
