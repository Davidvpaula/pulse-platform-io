
# Checkup Completo: Modulo de Comunicacao

## Diagnostico

Apos auditoria completa, identifiquei os seguintes problemas:

**Problemas criticos:**
1. `PacienteMensagens.tsx` (573 linhas) e um chat bidirecional completo - paciente envia mensagens, faz upload, tem realtime. Deveria ser apenas notificacoes read-only.
2. Rota `/app/medico/mensagens` aponta para `Conversas` (componente 100% mock com dados hardcoded). Deveria mostrar conversas vinculadas as consultas do medico.
3. Botoes WhatsApp em `MedicoConsultas.tsx`, `MedicoPacientes.tsx`, `SecretariaAgenda.tsx`, `SecretariaDashboard.tsx` abrem link externo `wa.me` em vez do Inbox interno.
4. `Conversas.tsx` tem array vazio `conversasWpp: ConversaWpp[] = []` e `histMock` hardcoded - componente nao funciona.
5. `ComunicacaoDashboard.tsx` tem estatisticas mock hardcoded.
6. Nao existe distincao entre colaborador limitado e ilimitado nas permissoes do Inbox.

**O que esta funcionando bem:**
- Inbox Admin (`/app/comunicacao/inbox`) - 689 linhas, dados reais, realtime, auditoria, permissoes
- RLS nas tabelas `conversations` e `messages` - bem configurado com funcoes `is_medico_da_conversa`, `is_paciente_da_conversa`, `user_can_view_conversation`
- `InboxConfiguracoes.tsx` - configuracoes de janela medica funcional (app_settings)
- Menu Admin com submenu Comunicacao completo (Inbox, Bot, IA Avatar, Templates, Automacoes, Metricas, Configuracoes)
- Tabela `conversations` com 6 registros reais vinculados a consultas
- 14 permission keys de comunicacao no `permissions_catalog`
- Edge functions `whatsapp-webhook` e `whatsapp-send` preparadas

---

## Plano de Correcoes

### 1. Refatorar PacienteMensagens para Notificacoes (read-only)

**Arquivo:** `src/pages/app/paciente/PacienteMensagens.tsx`

Reescrever completamente:
- Remover input de mensagem, upload de anexos, funcao `enviarMensagemPaciente`, logica de envio
- Manter listagem de conversas (lado esquerdo) e mensagens (lado direito) mas **somente leitura**
- Remover todos os controles de "paciente como remetente"
- Adicionar CTA "Falar pelo WhatsApp" apontando para o WhatsApp oficial da plataforma
- Empty state informativo quando nao ha notificacoes
- Manter realtime para novas notificacoes do sistema

**Arquivo:** `src/lib/profiles.ts` (linha 54)
- Renomear "Mensagens" para "Notificacoes"

**Arquivo:** `src/lib/pacienteConversas.ts`
- Remover funcao `enviarMensagemPaciente` e `uploadAnexoMensagem` (nao devem existir)

### 2. Criar MedicoMensagensConsultas

**Novo arquivo:** `src/pages/app/medico/MedicoMensagensConsultas.tsx`

Componente que mostra:
- Lista de consultas recentes do medico com status das conversas vinculadas
- Ao clicar, abre as mensagens da conversa vinculada (read-only ou com escrita se dentro da janela)
- Verifica janela temporal via `app_settings` (inbox.janela_pos_consulta_dias)
- Bloqueio visual claro quando fora da janela configurada
- Botao "Abrir conversa" que navega para a conversa no contexto do medico (nao para o Inbox geral)

**Arquivo:** `src/App.tsx` (linha 258)
- Trocar `<Conversas />` por `<MedicoMensagensConsultas />`

**Arquivo:** `src/lib/profiles.ts` (linha 72)
- Manter label "Mensagens das consultas" mas remover `requiresCapability: "medico.comunicacao"` (essa permissao nao existe no catalog)

### 3. Redirecionar botoes WhatsApp para Inbox interno

Todos os botoes que hoje abrem `wa.me` ou `whatsappUrl()` em contexto de **medico/colaborador/admin** devem abrir a conversa no Inbox interno.

**Arquivos a corrigir:**

| Arquivo | Linha | Acao |
|---------|-------|------|
| `MedicoConsultas.tsx` | 245-253 | Trocar link `wa.me` por navegacao `/app/medico/mensagens?conv={consulta_id}` |
| `MedicoPacientes.tsx` | 209-217 | Trocar link `wa.me` por navegacao para conversa do paciente |
| `SecretariaAgenda.tsx` | 160-164 | Trocar link `wa.me` por navegacao `/app/comunicacao/inbox?conv={id}` |
| `SecretariaDashboard.tsx` | 301-303 | Idem |

**Manter como esta (correto):**
- `PacienteDashboard.tsx` - FloatingWhatsApp e botoes wa.me no paciente estao corretos (paciente fala pelo WhatsApp externo)
- `PacienteAgendamentos.tsx` - idem

### 4. Remover mocks do modulo de comunicacao

**Arquivo:** `src/pages/app/comunicacao/Conversas.tsx`
- Este componente e 100% mock e nao sera mais usado (medico vai para MedicoMensagensConsultas, admin vai para Inbox)
- Manter arquivo mas simplificar: redirecionar para Inbox (`Navigate to="/app/comunicacao/inbox"`)

**Arquivo:** `src/pages/app/comunicacao/ComunicacaoDashboard.tsx`
- Substituir estatisticas hardcoded por dados reais do banco (COUNT de conversations por status)
- Substituir grafico mock por empty state ou dados reais
- Manter cards de linhas WhatsApp mas com dados do `whatsapp_instances`

### 5. Permissoes: Colaborador limitado vs ilimitado

**Arquivo:** `src/lib/permissions/roleTemplates.ts`

Adicionar novo template:
```
{
  key: "atendimento_ilimitado",
  label: "Atendimento Ilimitado",
  description: "Ve e gerencia todas as conversas. Nao acessa configuracoes sensiveis.",
  permissions: [
    "pacientes.ver",
    "agenda.ver_todas",
    "comunicacao.ver_inbox",
    "comunicacao.ver_todas",
    "comunicacao.ver_atribuidas",
    "comunicacao.responder",
    "comunicacao.transferir",
    "comunicacao.finalizar",
    "comunicacao.inbox.assumir",
    "comunicacao.inbox.encerrar",
    "comunicacao.usar_templates",
    "comunicacao.ver_metricas",
  ],
}
```

Note: as permissoes sensiveis (`comunicacao.configurar_bot`, `comunicacao.configurar_ia`, `comunicacao.configurar_automacoes`, `comunicacao.configurar_templates`) ficam de fora - so Admin acessa.

O Inbox.tsx ja respeita permissoes via `usePermission(INBOX_PERMISSIONS)` - colaborador limitado (sem `comunicacao.ver_todas`) so vera conversas atribuidas a ele.

### 6. Validar e limpar WhatsAppCentral vs Inbox

**Arquivo:** `src/pages/app/admin/WhatsAppCentral.tsx`
- Manter como painel de status das caixas WhatsApp (configuracao de integracao)
- Nao duplica o Inbox - sao funcoes diferentes (WhatsAppCentral = config das caixas, Inbox = atendimento)

### 7. Correcoes menores

- **Console warning**: `InboxConfiguracoes` tem warning de ref em componente funcional - verificar e corrigir
- **Rota `comunicacao/conversas`** (App.tsx linha 385): ja redireciona para inbox - correto
- **Rota `admin/comunicacao`** (App.tsx linha 331): ja redireciona para inbox - correto

---

## Detalhes Tecnicos

### Arquivos criados:
- `src/pages/app/medico/MedicoMensagensConsultas.tsx`

### Arquivos modificados:
- `src/pages/app/paciente/PacienteMensagens.tsx` (reescrita completa)
- `src/lib/pacienteConversas.ts` (remover envio)
- `src/lib/profiles.ts` (renomear menu paciente + limpar requiresCapability medico)
- `src/App.tsx` (trocar componente rota medico/mensagens)
- `src/pages/app/medico/MedicoConsultas.tsx` (botao WhatsApp -> Inbox)
- `src/pages/app/medico/MedicoPacientes.tsx` (botao WhatsApp -> Inbox)
- `src/pages/app/secretaria/SecretariaAgenda.tsx` (botao WhatsApp -> Inbox)
- `src/pages/app/secretaria/SecretariaDashboard.tsx` (botao WhatsApp -> Inbox)
- `src/pages/app/comunicacao/ComunicacaoDashboard.tsx` (remover mocks)
- `src/pages/app/comunicacao/Conversas.tsx` (redirect para Inbox)
- `src/lib/permissions/roleTemplates.ts` (template atendimento ilimitado)

### Arquivos NAO alterados (ja funcionais):
- `src/pages/app/comunicacao/Inbox.tsx` - central real, dados do banco, realtime, auditoria
- `src/pages/app/comunicacao/InboxConfiguracoes.tsx` - configuracoes de janela
- `src/pages/app/comunicacao/BotConfig.tsx` - configuracao do bot
- `src/pages/app/comunicacao/IAAvatar.tsx` - configuracao da IA
- `src/pages/app/comunicacao/Templates.tsx` - templates
- `src/pages/app/comunicacao/Automacoes.tsx` - automacoes
- `src/pages/app/comunicacao/Metricas.tsx` - metricas
- `supabase/functions/whatsapp-webhook/index.ts` - preparado
- `src/pages/app/admin/IntegracaoWhatsApp.tsx` - config das caixas
- RLS policies (ja corretas)

### Sem migracao de banco necessaria
As tabelas e RLS ja estao corretos. As permissoes de comunicacao ja existem no `permissions_catalog`.
