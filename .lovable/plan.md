## Modal de cancelamento com estimativa de reembolso

Substituir o `confirm()` nativo na página de agendamentos do paciente por um modal rico que mostra a estimativa de reembolso antes de confirmar.

### 1. Criar `src/lib/reembolsoEstimativa.ts`
Função `estimarReembolso(consultaId)` que:
- Busca a consulta (valor, inicio, medico_id)
- Calcula horas restantes até a consulta
- Determina situação (antecipado vs tardio baseado na antecedência)
- Busca regra do médico na `politica_reembolso`, fallback para global
- Retorna: situação, tipo, percentual, valor estimado em centavos, horas restantes

### 2. Criar `src/components/paciente/CancelarConsultaDialog.tsx`
Modal com:
- Resumo da consulta (médico, data, valor pago)
- Estimativa de reembolso com destaque visual (total=verde, parcial=amarelo, zero=vermelho)
- Valor estimado formatado em R$
- Horas restantes até a consulta
- Aviso sobre regra aplicada
- Botões Cancelar/Confirmar cancelamento

### 3. Editar `src/pages/app/paciente/PacienteAgendamentos.tsx`
- Substituir `confirm()` por abrir o dialog
- Adicionar estado para consulta selecionada para cancelamento
- Importar e renderizar o novo componente
- Manter a lógica de cancelamento existente (`updateConsultaStatus` + audit log)
