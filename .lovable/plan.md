
## Problema

O retorno gratuito foi criado com sucesso no banco (status `disponivel`), mas não aparece para o paciente porque a query PostgREST falha com erro:

```
Could not find a relationship between 'retornos_gratuitos' and 'medico_id' in the schema cache
```

A tabela `retornos_gratuitos` não possui **foreign keys** definidas para `medico_id`, `especialidade_id`, `paciente_id`, etc. Sem FK, o PostgREST não consegue fazer o JOIN implícito que o código usa (`medicos:medico_id ( nome )`), e a função `listRetornosDisponiveis` retorna array vazio silenciosamente.

## Plano

### 1. Migration: adicionar foreign keys na tabela `retornos_gratuitos`

```sql
ALTER TABLE retornos_gratuitos
  ADD CONSTRAINT fk_retornos_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  ADD CONSTRAINT fk_retornos_medico FOREIGN KEY (medico_id) REFERENCES medicos(id),
  ADD CONSTRAINT fk_retornos_especialidade FOREIGN KEY (especialidade_id) REFERENCES especialidades(id),
  ADD CONSTRAINT fk_retornos_consulta_origem FOREIGN KEY (consulta_origem_id) REFERENCES consultas(id),
  ADD CONSTRAINT fk_retornos_consulta_uso FOREIGN KEY (consulta_uso_id) REFERENCES consultas(id);
```

### 2. Adicionar banner de retorno gratuito no Dashboard do paciente

Atualmente os vouchers só aparecem na página "Agendamentos". Vou adicionar um card/banner destacado no `PacienteDashboard.tsx` para que o paciente veja imediatamente ao entrar no app, com botão levando para a página de agendamentos ou abrindo o dialog de agendamento do retorno.

### Resultado esperado

- Vouchers aparecem na lista de agendamentos (corrigido pela FK)
- Vouchers também aparecem em destaque no Dashboard do paciente
