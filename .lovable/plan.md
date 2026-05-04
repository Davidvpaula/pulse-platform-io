
# Refatorar Fluxo de Agendamento

## Problema atual
Na página `/agendar`, ao selecionar uma especialidade, os slots de horário são exibidos diretamente. Isso polui a tela e não valoriza o profissional.

## Novo fluxo
Especialidade → Cards de médicos → Agenda individual (accordion no desktop / modal no mobile)

---

## 1. Migration: Atualizar view `medicos_publicos`

Adicionar campos necessários para os cards enriquecidos:
- `bio`, `foto_url`, `rqe` (da tabela `medicos`)
- Manter `GRANT EXECUTE ON FUNCTION public.has_role(...) TO anon` (pendente da correção anterior)

SQL da migration:
```sql
-- Grant pendente
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;

-- Recriar view com campos adicionais
DROP VIEW IF EXISTS public.medicos_publicos;
CREATE VIEW public.medicos_publicos
WITH (security_invoker = on) AS
SELECT
  m.id, m.nome, m.especialidade, m.crm, m.bio, m.foto_url,
  m.link_sala_padrao, m.created_at,
  COALESCE(r.avaliacao_media, 5.0) AS avaliacao_media,
  COALESCE(r.total_avaliacoes, 0) AS total_avaliacoes,
  COALESCE(r.ranking_score, 0) AS ranking_score,
  COALESCE(r.taxa_no_show, 0) AS taxa_no_show,
  COALESCE(r.fator_premium, 0) AS fator_premium,
  (m.link_sala_padrao IS NOT NULL) AS online
FROM public.medicos m
LEFT JOIN public.medico_ranking r ON r.medico_id = m.id
WHERE m.status = 'aprovado';
```

## 2. Refatorar componente `Agendar` (PublicPages.tsx)

### Etapa intermediária: lista de médicos por especialidade
Após selecionar especialidade, em vez de chamar `listSlotsDisponiveisPorEspecialidade`, buscar:
1. Médicos vinculados via `medico_especialidades` (filtro `especialidade_id` + `ativo`)
2. Dados públicos via `medicos_publicos`
3. Próximo slot disponível por médico (1 query com `agenda_slots` agrupado)
4. Dados de especialização (RQE, especialista) via `medico_especialidades`

### Card de médico -- conteúdo
- Foto ou iniciais (avatar)
- Nome completo
- Especialidade + "Especialista (RQE: XXXX)" ou "Clínico geral"
- Avaliacao: estrela + nota (padrão 5.0); contador oculto
- Tags: "Novo" (< 30 dias), "Mais agendado" (top ranking), "Alta satisfação" (< 5% no_show)
- Bio resumida (120 chars + "...")
- Próximo horário: "Hoje às 14:30" ou "Amanhã às 09:00" ou "Sem horários"
- Preço (do `medico_especialidades.preco_centavos`)
- Badges: "Telemedicina", "CRM verificado"

### Ordenação dos cards
1. Melhor avaliação
2. Disponibilidade mais próxima (quem tem slot mais cedo primeiro)
3. Menor taxa de no_show
4. Premium (fator_premium)

### Ações do card
- **Agendar**: desktop = accordion expansível abaixo do card com slots do médico; mobile = modal/drawer
- **Ver perfil**: navega para `/medicos/:slug`

### Performance
- Buscar próximo slot por médico com 1 query (não carregar agenda completa)
- Slots completos carregados on-demand ao expandir accordion

## 3. Novo componente `MedicoAgendaAccordion`

Componente reutilizável que:
- Recebe `medicoId` e `especialidadeId`
- Carrega slots via `listSlotsDisponiveisPorEspecialidade` filtrado por médico (ou nova fn `listSlotsByMedico`)
- Grid de slots clicáveis
- No mobile: renderizado dentro de um Drawer/Sheet

## 4. Refatorar `MedicoDetalhe` (página `/medicos/:slug`)

Expandir para página de perfil completa:
- Seção hero: foto, nome, especialidade + RQE, avaliação
- Bio completa
- Formação acadêmica (campo `bio` por enquanto; futuramente campo dedicado)
- Badges: Telemedicina, CRM verificado
- Avaliações de pacientes (se >= 3 avaliações, consultar `avaliacoes_medicos`)
- Agenda completa embarcada (reutilizar `MedicoAgendaAccordion` sempre aberto)

## 5. UX/UI

- Grid responsivo: 1 col mobile, 2 cols tablet, 3 cols desktop
- Skeleton loading com `Skeleton` component existente
- Hierarquia visual clara: nome > especialidade > bio > ações
- Espaçamento e cards com `card-elevated` existente

## 6. Atualizar hook `useMedicosDestaque`

Ajustar para consumir os novos campos da view (`bio`, `foto_url`, `taxa_no_show`, `fator_premium`).

---

## Impactos
- **Ranking/Gamificação**: sem impacto, apenas leitura dos dados existentes
- **Financeiro**: sem impacto, preços lidos de `medico_especialidades`
- **Rotas**: nenhuma rota nova; `/medicos/:slug` já existe, apenas enriquecida
- **Arquivos modificados**: `PublicPages.tsx`, `useMedicosDestaque.ts`, `src/lib/clinico.ts` (nova fn auxiliar), migration SQL, novo componente `MedicoAgendaAccordion`
