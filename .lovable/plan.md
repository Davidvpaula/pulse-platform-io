## Validação da arquitetura — Particular do médico × Serviços da plataforma

### Modelo final (confirmado)

Existem duas dimensões independentes, com fontes de verdade distintas:

```text
┌─────────────────────────────┬──────────────────────────────────────┐
│ medico_especialidades       │ servicos_financeiros + medico_servicos│
│ "Particular do médico"      │ "Serviços da plataforma"              │
├─────────────────────────────┼──────────────────────────────────────┤
│ Médico define preço/duração │ Admin define preço/duração (imutável)│
│ Recebe 100% (- taxa global) │ Recebe via fn_resolver_comissao      │
│ Slot.servico_id = NULL      │ Slot.servico_id = <uuid>             │
└─────────────────────────────┴──────────────────────────────────────┘
```

Quem decide o caminho é `agenda_slots.servico_id`. O snapshot financeiro é gravado uma única vez na criação da consulta — nada é recalculado depois. **Essa parte está correta e já implementada.**

### Decisões fechadas agora

1. **Atendimento imediato (PA público)** = página separada `/atendimento-imediato`
   - Lista todos os médicos vinculados ao serviço de PA da plataforma (sem filtro/escolha pelo paciente)
   - O Admin pode editar qual serviço da plataforma alimenta essa página
   - Não usa mais o PA do `medico_especialidades` para a porta pública (esse fica só para agenda interna)

2. **Dashboard do médico** = dois cards separados de receita
   - "Receita particular" (consultas com `servico_id = NULL`)
   - "Receita serviços da plataforma" (consultas com `servico_id` preenchido, mostra repasse)

3. **Criação manual de slot** = default Particular, Serviço opcional
   - Radio "Particular | Serviço da plataforma"
   - Particular já vem marcado; só vira serviço se selecionar explicitamente

---

## O que será feito (Etapa 3 ajustada)

### 3.1 Configuração admin do "Atendimento imediato"
- Em `app_settings` adicionar chave `atendimento_imediato.servico_id` (uuid do serviço que alimenta a porta pública)
- Em `/app/admin/servicos` adicionar seção "Atendimento imediato" com select dos serviços tipo `pronto_atendimento` ativos
- Validação: só permite escolher serviço com pelo menos 1 médico aderido

### 3.2 Página pública `/atendimento-imediato`
- Header explicativo + valor + duração do serviço configurado
- Lista todos os médicos com adesão ativa naquele serviço (sem ranking visível ao paciente, sem filtro)
- Indica quem está "Disponível agora" (slot livre nos próximos N min) vs "Próximo: HH:MM"
- Botão "Iniciar atendimento" → entra na fila do primeiro médico disponível segundo `fn_ranking_medico_servico` internamente
- Sem seleção manual de médico

### 3.3 Bloco na Home
- Card hero "⚡ Atendimento imediato" → CTA leva para `/atendimento-imediato`
- Mostra valor + "X médicos disponíveis agora"

### 3.4 Vitrine `/servicos` e `/servicos/[slug]`
- Grid de serviços ativos (exceto o de PA, que tem porta própria)
- Detalhe do serviço lista médicos aderidos com ranking (aqui sim o paciente escolhe — diferente do PA)

### 3.5 Menu público
- Item "Serviços" entre "Especialidades" e "Para empresas"
- Item "Atendimento imediato" em destaque (badge/cor diferente)

### 3.6 Dashboard do médico — split de receita
- Em `MedicoDashboard.tsx` adicionar dois cards:
  - "Receita particular (mês)" — soma `consultas_financeiro.valor_medico_centavos` onde consulta tem `servico_id IS NULL`
  - "Receita serviços plataforma (mês)" — mesma soma onde `servico_id IS NOT NULL`, com badge mostrando quantos serviços
- Mantém o card total agregado por cima

### 3.7 Criação manual de slot (médico/secretaria)
- Em `MedicoHorarios.tsx` (e telas equivalentes da secretaria) adicionar radio:
  - ⦿ Particular (default) → usa preço/duração de `medico_especialidades`
  - ○ Serviço da plataforma → mostra select dos serviços que o médico aderiu; duração fica readonly
- Validação client + trigger DB já bloqueiam inconsistência

---

## Ordem de execução
1. Migração: `app_settings.atendimento_imediato.servico_id`
2. Admin: tela de configuração do PA público
3. Páginas públicas: `/atendimento-imediato`, `/servicos`, `/servicos/[slug]` + Home + Menu
4. Dashboard médico: split de receita
5. Slot manual: radio Particular/Serviço

Tudo sequencial sem pausa, conforme combinado.

---

## Detalhes técnicos

- **`fn_ranking_medico_servico`** já existe e é usada internamente na página de PA para escolher médico — paciente nunca vê o ranking nessa porta
- **Snapshot financeiro** continua imutável; nenhuma das mudanças mexe em `consultas_financeiro`
- **`medico_especialidades.pronto_atendimento`** continua existindo mas só governa slots PA internos da agenda do médico (uso operacional, não mais a porta pública)
- **Memória**: vou adicionar à memória do projeto a regra "Atendimento imediato público = sempre via servicos_financeiros configurado em app_settings, nunca via medico_especialidades" para não confundir em sessões futuras

**Aprovar para iniciar.**