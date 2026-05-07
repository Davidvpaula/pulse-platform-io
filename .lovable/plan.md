
## Problema atual

1. **Sino no header** (NotificationsBell) — mostra 4 itens hardcoded/simulados (falsos)
2. **Página /app/medico/mensagens** — mostra conversas de consulta (messages/conversations), mas chama de "Notificações" e confunde com a funcionalidade de mensagens

## Solução

### 1. Tabela `notificacoes`

Nova tabela centralizada para eventos do sistema:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| user_id | UUID | Destinatário (auth.users) |
| tipo | TEXT | Categoria: `agendamento`, `pagamento`, `cancelamento`, `integracao`, `sistema`, `pendencia` |
| titulo | TEXT | Título curto |
| descricao | TEXT | Descrição do evento |
| lida | BOOLEAN | Se foi lida |
| referencia_tipo | TEXT | Tipo do objeto relacionado (consulta, pagamento, etc.) |
| referencia_id | UUID | ID do objeto relacionado |
| perfil | TEXT | Para qual perfil é a notificação (medico, admin, paciente, colaborador) |

RLS: cada usuário vê apenas suas próprias notificações.

### 2. Triggers automáticos (banco)

Triggers que criam notificações automaticamente quando:
- **Nova consulta** é criada → notifica médico e admin
- **Consulta cancelada** → notifica médico
- **Pagamento confirmado** → notifica médico

### 3. Sino conectado a dados reais (NotificationsBell)

- Buscar as últimas notificações não-lidas do usuário logado
- Mostrar badge com contagem real de não-lidas
- Marcar como lida ao clicar
- Botão "Ver todas" leva à página de notificações do perfil

### 4. Página de notificações do médico (/app/medico/mensagens → /app/medico/notificacoes)

- Transformar em feed de notificações reais (da tabela `notificacoes`)
- Lista cronológica com ícone por tipo, título, descrição, horário
- Filtros por tipo (agendamento, pagamento, etc.)
- Marcar como lida/todas lidas
- Link para o objeto relacionado (ex: clicar numa notificação de consulta abre a consulta)
- A rota antiga `/app/medico/mensagens` redireciona para a nova

### 5. Menu e breadcrumb

- Atualizar label no menu lateral e breadcrumb

### Detalhes técnicos

- Migration: criar tabela `notificacoes` + RLS + triggers para consultas
- Componentes: refatorar NotificationsBell, reescrever MedicoMensagensConsultas
- Rotas: adicionar `/app/medico/notificacoes`, redirect de `/app/medico/mensagens`
- Mesmo padrão será reutilizável para paciente e admin futuramente
