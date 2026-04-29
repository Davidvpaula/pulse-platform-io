
# Mapa de rotas + próximos passos

## Parte 1 — Mapa completo das rotas atuais

Legenda: **OK** = funcional com dados reais · **Parcial** = funciona com mock/placeholder leve · **Placeholder** = só título · **Mock** = UI pronta sem persistência

### Públicas (`/`)
| Rota | Status | Observação |
|---|---|---|
| `/` Home | OK | Landing |
| `/especialidades` | Mock | Lista estática |
| `/medicos` | Mock | Lista estática |
| `/medicos/:slug` | Mock | Detalhe estático |
| `/agendar` | Mock | Fluxo público de agendar |
| `/planos` | Mock | |
| `/empresas` | Mock | |
| `/para-medicos` | Mock | |
| `/faq` | Mock | |
| `/login` | Redireciona p/ `/auth` | |
| `/auth` | OK | Email+senha + Google |
| `/cadastro/medico` | OK | Cria registro `medicos` pendente |

### Paciente (`/app/paciente`)
| Rota | Status |
|---|---|
| `/dashboard` | OK (lista consultas reais) |
| `/agendar/confirmar/:slotId` | OK (cria consulta + Stripe) |
| `/checkout/:sessionId` | OK |
| `/pagamento/sucesso` | OK |
| `/pagamento/cancelado` | OK |
| `/agendamentos` | **Placeholder** |
| `/documentos` | **Placeholder** |
| `/plano` | **Placeholder** |
| `/financeiro` | **Placeholder** |
| `/mensagens` | **Placeholder** |
| `/perfil` | **Placeholder** |

### Médico (`/app/medico`) — protegidas por `MedicoGuard`
| Rota | Status |
|---|---|
| `/aguardando-aprovacao` | OK |
| `/dashboard` | Parcial |
| `/agenda` | OK (lista slots) |
| `/horarios` | OK (CRUD slots) |
| `/perfil` | OK |
| `/configuracoes` | OK |
| `/pacientes` | Mock |
| `/treinamento` | Mock |
| `/mensagens` | Mock (Conversas) |
| `/comunicacao-interna` | Mock |
| `/consultas` | **Placeholder** |
| `/documentos` | **Placeholder** |
| `/financeiro` | **Placeholder** |

### Secretaria (`/app/secretaria`)
| Rota | Status |
|---|---|
| `/dashboard` | Mock |
| `/pacientes` + `/pacientes/:id` | Mock |
| `/agenda` | Mock |
| `/tarefas` | Mock |
| `/equipe` | Mock |
| `/comunicacao-interna` | Mock |
| `/pendencias-integracao` | Mock |
| `/agendamentos` | **Placeholder** |
| `/comunicacao` | Mock (Conversas) |
| `/financeiro` | **Placeholder** |
| `/relatorios` | **Placeholder** |

### Admin (`/app/admin`)
| Rota | Status |
|---|---|
| `/dashboard` | Mock |
| `/medicos` (aprovação) | OK |
| `/fluxo` | Mock |
| `/permissoes` | Mock |
| `/whatsapp` | Mock |
| `/integracoes` | Mock |
| `/configuracoes` | OK |
| `/feegow` + `/mapeamento` + `/schema` | Mock |
| `/pendencias-integracao` | Mock |
| `/comunicacao-interna` | Mock |
| `/pacientes/:id` | Mock |
| `/usuarios` `/secretaria` `/empresas` `/agendamentos` `/financeiro` `/planos` `/relatorios` `/auditoria` | **Placeholder** |

### Empresa (`/app/empresa`)
Todas as 6 rotas (`dashboard`, `funcionarios`, `agendamentos`, `relatorios`, `financeiro`, `perfil`) → **Mock**

### Comunicação (`/app/comunicacao`)
Todas as 7 rotas (`dashboard`, `conversas`, `whatsapp`, `bot`, `templates`, `automacoes`, `metricas`) → **Mock**

---

## Parte 2 — Resumo do que falta para "fluxo end-to-end real"

**Pronto e real:** Auth, cadastro médico + aprovação, slots, agendamento, Stripe checkout, e-mail (em modo log).

**Buracos no caminho crítico (paciente → consulta acontece):**
1. **Paciente `/agendamentos`** — placeholder. Precisa listar consultas + ações (cancelar, ver detalhes, link da sala).
2. **Paciente `/perfil`** — placeholder. Precisa formulário básico (nome, CPF, telefone, alergias).
3. **Médico `/consultas`** — placeholder. Lista de consultas confirmadas + entrar na sala.
4. **Sala da consulta** — não existe rota. Hoje `consultas.link_sala` é nullable e nunca preenchido.
5. **Médico `/dashboard`** — só esqueleto, sem KPIs reais.
6. **Paciente `/financeiro`** — placeholder. Histórico de pagamentos.

**Não-críticos (podem esperar):** Documentos/prontuário, mensagens, dashboards admin/empresa/secretaria, comunicação WhatsApp.

---

## Parte 3 — Decisão Google Meet (Cenário A confirmado)

Cada médico autoriza própria conta Google. Regra de negócio escolhida:

> **Médico só pode publicar slots se: (a) tiver Google conectado OU (b) tiver cadastrado um link fixo de sala (Meet/Zoom/Jitsi pessoal).**

Sem nenhum dos dois → bloqueio na criação de slots + aviso no dashboard.

---

## Parte 4 — Roadmap proposto (ordem)

### Fase E.1 — Fechar o caminho crítico paciente↔consulta (PRÓXIMO)
1. Página **Paciente / Agendamentos** real (lista + cancelar + ver link sala).
2. Página **Paciente / Perfil** real (form + persistir em `pacientes`).
3. Página **Médico / Consultas** real (lista + entrar sala + marcar como realizada).
4. Página **Paciente / Financeiro** real (lista `pagamentos`).
5. **Médico / Dashboard** com KPIs reais (próxima consulta, total semana, faturamento mês).

### Fase E.2 — Sala da consulta (link genérico, sem Google ainda)
6. Adicionar campo `medicos.link_sala_padrao` (texto livre).
7. UI no perfil do médico para configurar link padrão.
8. Trigger/edge function: ao confirmar consulta, preencher `consultas.link_sala` com o link padrão.
9. Botão "Entrar na consulta" para paciente e médico.
10. Bloqueio: médico não consegue criar slots se não tiver link padrão (preparação para Fase G).

### Fase F — WhatsApp Cloud API (depende de Meta)
Quando você liberar credenciais Meta: edge function de envio + templates aprovados + webhook.

### Fase G — Google Meet por médico (Cenário A)
11. Configurar OAuth Google (Calendar scope) no Google Cloud.
12. Tabela `medico_google_tokens` (user_id, access_token, refresh_token, expires_at) — RLS só dono lê.
13. Página **Médico / Configurações → Integrações** com botão "Conectar Google Calendar".
14. Edge function `criar-evento-meet`: ao confirmar consulta, se médico tem Google → cria evento com Meet, salva link em `consultas.link_sala`. Se não → usa `link_sala_padrao`.
15. Regra na criação de slot: exige Google conectado **OU** link padrão.
16. Aviso visual no dashboard do médico se token Google expirou.

### Fase H — Refino dos mocks restantes
Empresas, Admin (financeiro, relatórios, auditoria), Secretaria (financeiro, relatórios), Comunicação interna real.

---

## Próximo passo concreto

Começar **Fase E.1** — implementar as 5 páginas do caminho crítico, na ordem listada. Depois disso o app fica testável end-to-end (paciente cadastra → agenda → paga → médico vê → consulta acontece → paciente vê histórico).

**Quer que eu inicie pela Fase E.1 (Paciente/Agendamentos primeiro) ou prefere fazer a Fase E.2 (sala da consulta + link padrão) antes para já testar o fluxo completo com link manual?**
