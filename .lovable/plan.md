## Histórico de cancelamentos e reembolsos no dashboard do paciente

### 1. Migração — RLS para paciente ler reembolsos
Atualmente apenas admin, médico e staff podem ler a tabela `reembolsos`. Adicionar policy para que o paciente veja reembolsos das suas próprias consultas:

```sql
CREATE POLICY "Paciente ve seus proprios reembolsos"
ON public.reembolsos FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM consultas c
  JOIN pacientes p ON p.id = c.paciente_id
  WHERE c.id = reembolsos.consulta_id AND p.user_id = auth.uid()
));
```

### 2. Criar `src/components/paciente/HistoricoCancelamentos.tsx`
Componente que:
- Busca últimos 10 reembolsos do paciente logado (`reembolsos` + join `consultas` + `medicos`)
- Mostra para cada item: nome do médico, data da consulta, motivo, valor e status
- Status com ícone e cor: solicitado (amarelo), em_análise (azul/spin), aprovado (verde), concluído (verde escuro), recusado (vermelho)
- Estado vazio: "Nenhum cancelamento ou reembolso registrado"

### 3. Editar `src/pages/app/paciente/PacienteDashboard.tsx`
- Importar e renderizar `HistoricoCancelamentos` após a seção "Próximos agendamentos" e antes de "Comunicação"
