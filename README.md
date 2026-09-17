# Lasmar Care Hub

Crie a estrutura inicial de uma plataforma SaaS de saúde digital chamada Lasmar Telemed.

Objetivo:

Construir a base lógica e visual de uma plataforma com múltiplos dashboards conectados por permissões, voltada para telemedicina, gestão de pacientes, médicos, secretaria, administração e empresas.

Importante:

Neste MVP, o prontuário eletrônico completo NÃO será construído internamente. Ele deverá ser tratado como integração futura com a Feegow via API. Porém, a arquitetura visual e lógica deve reservar espaço para um futuro módulo interno de prontuário eletrônico próprio.

Estrutura principal do sistema:

1. Site público

2. Dashboard do Paciente

3. Dashboard do Médico

4. Dashboard da Secretaria

5. Dashboard Admin

6. Dashboard Empresarial

7. Central de Comunicação / WhatsApp

8. Módulo de Agenda e Google Meet

9. Módulo de Integrações Futuras

Perfis de usuário:

- Paciente

- Paciente empresarial

- Médico

- Secretário comum

- Secretário supervisor

- Admin

- Superadmin

- Empresa / RH

Regras gerais:

- Cada perfil deve ter seu próprio dashboard.

- O menu lateral deve mudar conforme o perfil do usuário.

- Deve existir controle visual de permissões.

- A plataforma deve ser responsiva.

- O layout deve ser limpo, moderno, profissional, com visual de sistema médico.

- Usar cards, tabelas, filtros, badges de status, ícones e ações rápidas.

- Não implementar backend real complexo ainda; criar estrutura visual e lógica inicial preparada para integração.

- Criar dados mockados para simular funcionamento.

Rotas principais:

Site público:

- /

- /especialidades

- /medicos

- /medicos/:slug

- /agendar

- /planos

- /empresas

- /para-medicos

- /faq

- /login

Paciente:

- /app/paciente/dashboard

- /app/paciente/agendamentos

- /app/paciente/documentos

- /app/paciente/plano

- /app/paciente/financeiro

- /app/paciente/perfil

- /app/paciente/mensagens

Médico:

- /app/medico/dashboard

- /app/medico/agenda

- /app/medico/consultas

- /app/medico/pacientes

- /app/medico/documentos

- /app/medico/financeiro

- /app/medico/perfil

- /app/medico/configuracoes

- /app/medico/integracoes

Secretaria:

- /app/secretaria/dashboard

- /app/secretaria/pacientes

- /app/secretaria/agenda

- /app/secretaria/agendamentos

- /app/secretaria/comunicacao

- /app/secretaria/financeiro

- /app/secretaria/tarefas

Admin:

- /app/admin/dashboard

- /app/admin/usuarios

- /app/admin/medicos

- /app/admin/secretaria

- /app/admin/empresas

- /app/admin/agendamentos

- /app/admin/financeiro

- /app/admin/planos

- /app/admin/comunicacao

- /app/admin/whatsapp

- /app/admin/integracoes

- /app/admin/configuracoes

- /app/admin/permissoes

- /app/admin/relatorios

Empresa:

- /app/empresa/dashboard

- /app/empresa/funcionarios

- /app/empresa/agendamentos

- /app/empresa/relatorios

- /app/empresa/financeiro

- /app/empresa/perfil

Central de Comunicação:

- /app/comunicacao/dashboard

- /app/comunicacao/conversas

- /app/comunicacao/whatsapp

- /app/comunicacao/bot

- /app/comunicacao/templates

- /app/comunicacao/metricas

Dashboard do Paciente:

Criar tela com:

- Card da próxima consulta

- Botão “Entrar na consulta”

- Lista de agendamentos

- Status da consulta: confirmado, aguardando pagamento, concluído, cancelado

- Carteira documental: receitas, atestados, relatórios, exames

- Plano ativo

- Pagamentos

- Mensagens e suporte

- Área para documentos vindos da Feegow futuramente

Dashboard do Médico:

Criar tela com:

- Agenda do dia

- Próximos pacientes

- Consultas pendentes

- Link do Google Meet cadastrado

- Campo para configurar link fixo de atendimento

- Área futura para sincronizar com Google Agenda

- Botão “Iniciar consulta”

- Botão “Abrir prontuário na Feegow”

- Área de documentos emitidos

- Financeiro simples com ganhos por atendimento

- Perfil profissional com dados que podem aparecer no site

- Campo de modalidades: consulta particular, pronto atendimento online, retorno, empresarial

Dashboard da Secretaria:

Criar tela com:

- Fila de atendimentos do dia

- Lista de pacientes

- Agenda por médico

- Agendamentos pendentes

- Pagamentos pendentes

- Comunicação por WhatsApp e e-mail

- Tarefas internas

- Atribuição de atendimento

- Botões: novo agendamento, remarcar, cancelar, enviar WhatsApp, enviar link da consulta

Dashboard Admin:

Criar tela com:

- Visão geral da operação

- Total de pacientes

- Total de médicos

- Total de empresas

- Total de agendamentos

- Faturamento

- Consultas do dia

- Gestão de usuários

- Gestão de médicos

- Gestão de empresas

- Gestão financeira

- Gestão de planos

- Gestão de agenda

- Gestão de comunicação

- Gestão de permissões

- Integrações futuras: Feegow, WhatsApp API, Google Meet/Google Agenda, pagamentos, assinatura digital

Dashboard Empresarial:

Criar tela com:

- Funcionários cadastrados

- Agendamentos de funcionários

- Relatórios liberados

- Indicadores de uso

- Financeiro empresarial

- Controle por unidade/setor

- Observação importante: a empresa não deve acessar prontuário completo, apenas relatórios/documentos liberados com permissão.

Central de WhatsApp:

Criar estrutura visual para futura integração com WhatsApp Business API.

Deve conter:

- Duas caixas de WhatsApp possíveis:

  1. WhatsApp Comercial

  2. WhatsApp Operacional/Suporte

- Lista de conversas

- Status da conversa

- Responsável atribuído

- Tags

- Histórico

- Campo de resposta

- Templates rápidos

- Botão para transferir para humano

- Botão para vincular conversa a paciente

- Botão para criar agendamento a partir da conversa

Bot de atendimento:

Criar tela visual simples para configurar fluxos:

- Saudação inicial

- Quero agendar

- Quero remarcar

- Quero falar com suporte

- Sou empresa

- Sou médico

- Financeiro

- Falar com atendente

- Reservar espaço para futura integração com API de IA

Google Meet / Agenda:

Criar lógica visual para:

- Cada médico poder cadastrar um link fixo do Google Meet

- Cada agendamento exibir o link correto do médico

- Permitir futuramente integração com Google Agenda para gerar link dinâmico

- Mostrar status: link fixo, link dinâmico futuro, link pendente

- Secretaria/Admin deve conseguir reenviar link para o paciente

Feegow:

Criar tela de integração futura com Feegow:

- Status da integração

- ID do paciente na Feegow

- ID do agendamento na Feegow

- Botão “Enviar paciente para Feegow”

- Botão “Enviar agendamento para Feegow”

- Botão “Abrir prontuário na Feegow”

- Área futura para sincronizar documentos

- Não construir prontuário interno completo agora

Design:

- Layout moderno, limpo e institucional

- Visual médico/healthtech

- Sidebar fixa

- Header com busca global, notificações e perfil

- Cards com indicadores

- Tabelas com filtros

- Badges de status

- Ícones em todos os menus

- Cores suaves e profissionais

- Evitar excesso de texto nas telas

- Criar navegação fluida

(Futura integração com figma para visual desejado do site)

Ícones sugeridos:

- Home

- Calendário

- Usuários

- Médico/estetoscópio

- Empresa

- Mensagens

- WhatsApp

- Financeiro

- Documento

- Relatórios

- Configurações

- Integrações

- Permissões

- Bot

- Videochamada

Resultado esperado:

Gerar a primeira versão visual e navegável da plataforma, com rotas, dashboards, menus por perfil, dados mockados e estrutura preparada para futuras integrações com Feegow, WhatsApp Business API, Google Meet/Google Agenda, pagamentos e assinatura digital.

Não implementar integrações reais neste primeiro momento. Apenas criar a estrutura visual, lógica e escalável do produto.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pulse-platform-io.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b6c04fb5-2cf8-44b2-bf02-5a0643a7439d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
