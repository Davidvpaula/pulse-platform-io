
# Checkup Completo — IA Avatar

## A) O que está funcionando

- **Rota**: `/app/comunicacao/ia` existe e carrega corretamente
- **Menu lateral**: "IA Avatar" aparece no menu de Comunicação do Admin
- **CRUD de configurações**: salva/carrega de `ai_settings` (provider, modelo, prompt, base de conhecimento, regras de segurança, max_tokens, temperatura, handoff_keywords)
- **Toggle ativa/inativa**: switch funcional com badge visual
- **RLS**: políticas existentes para Admin e Staff (ALL + SELECT)
- **Tabela `ai_settings`**: schema correto com 13 colunas, enum `ai_provider`

## B) O que está quebrado

- **Nenhum registro salvo**: tabela `ai_settings` está vazia — o formulário nunca foi salvo pela primeira vez (funciona, mas o user precisa clicar "Salvar")
- **Simulação fake**: botão "Simular" não chama nenhum modelo de IA; apenas monta string estática

## C) O que está duplicado ou mal estruturado

- **Handoff via campo de texto simples**: campo de keywords separadas por vírgula — sem níveis de urgência, sem ações diferenciadas
- **Sem separação em cards claros**: configuração geral, prompt, transferência e segurança estão em 4 cards genéricos sem hierarquia visual clara

## D) O que está mockado/simulado

| Item | Status |
|------|--------|
| Simulação de resposta | 100% fake (string estática) |
| Sugestão de médicos | Não existe |
| Transferência inteligente por níveis | Não existe |
| Edge function `ai-respond` | Não existe |
| Integração com agenda/ranking para sugestão | Não existe |

## E) O que falta implementar

1. **Edge function `ai-respond`** — backend que recebe mensagem, lê `ai_settings`, monta prompt completo (base + knowledge + safety), chama Lovable AI Gateway, retorna resposta
2. **Transferência inteligente com níveis** — substituir campo simples por lista de regras com palavra-chave + nível (urgente/moderado/baixo) + ação automática
3. **Sugestão inteligente de médicos** — card de configuração + lógica no prompt/edge function que consulta `especialidades`, `medico_especialidades`, `agenda_slots`, `medico_ranking` para recomendar médicos
4. **Prompt base melhorado** — substituir prompt atual pelo novo sugerido (mais completo, com regras de condução)
5. **Simulação real** — botão "Simular" deve chamar a edge function com a mensagem de teste

## F) Melhorias de UX/UI

- Reorganizar em 6 cards: Configuração Geral, Prompt Base, Transferência Inteligente, Sugestão de Médicos, Base de Conhecimento, Segurança
- Transferência: lista visual com badges coloridos (vermelho/amarelo/verde) por nível
- Card de sugestão de médicos com toggle de ativação e opções (priorizar avaliação, disponibilidade, custo)

## G) Riscos técnicos ou de segurança

- **RLS `ALL`**: políticas de `ai_settings` usam `ALL` — devem ser separadas em SELECT/INSERT/UPDATE/DELETE para controle granular
- **Sem auditoria**: alterações nas configurações da IA não são registradas em log de auditoria
- **Dados sensíveis**: a edge function de sugestão de médicos precisa retornar apenas dados públicos (nome, especialidade, próximo horário), nunca dados financeiros detalhados ou de prontuário

## H) Plano de ação em etapas (priorizado)

### Etapa 1 — Migration: Tabela de regras de transferência
- Criar tabela `ai_handoff_rules` (id, ai_settings_id FK, keyword, intent, level enum(urgente/moderado/baixo), action text, order int, active bool)
- RLS: Admin/Staff gerencia
- Remover dependência do campo `handoff_keywords` da tabela `ai_settings` (manter para fallback)

### Etapa 2 — Migration: Campos de sugestão de médicos
- Adicionar colunas em `ai_settings`: `sugestao_medicos_ativa` (bool), `sugestao_prioridade` (jsonb com pesos: avaliacao, disponibilidade, custo)

### Etapa 3 — Refatorar UI do IAAvatar.tsx
- Reorganizar em 6 cards conforme especificação
- Card "Transferência Inteligente": lista dinâmica de regras com CRUD inline, badges de nível, botão "+ Adicionar regra"
- Card "Sugestão de Médicos": toggle de ativação + config de prioridade
- Atualizar prompt base padrão com o novo texto

### Etapa 4 — Edge function `ai-respond`
- Criar `supabase/functions/ai-respond/index.ts`
- Lê `ai_settings` do banco
- Monta system prompt: base_prompt + knowledge_base + safety_rules + regras de transferência
- Se `sugestao_medicos_ativa`, inclui instrução de tool calling para buscar médicos
- Chama Lovable AI Gateway com streaming
- Retorna resposta SSE

### Etapa 5 — Simulação real
- Botão "Simular" no IAAvatar chama a edge function com a mensagem de teste
- Exibe resposta da IA em tempo real (streaming)

### Etapa 6 — Segurança e auditoria
- Separar políticas RLS de `ai_settings` (remover ALL, criar SELECT/UPDATE/INSERT específicas)
- Registrar alterações de configuração da IA no log de auditoria
- Revogar EXECUTE de funções sensíveis para `anon`

---

**Impactos em outros módulos**: Etapa 4 consulta tabelas de agenda (`agenda_slots`), ranking (`medico_ranking`), especialidades (`especialidades`, `medico_especialidades`) — somente leitura, sem alteração. Nenhuma tabela existente é modificada além de `ai_settings`.
