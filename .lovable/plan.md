## Teste mecânico — Dashboard Médico (`/app/medico`)

Vou rodar um **teste mecânico não-destrutivo** percorrendo todos os componentes visíveis do dashboard do médico via browser automation, validando renderização, dados carregados e navegação dos botões/links. Nenhuma ação destrutiva (iniciar consulta, mudar status, salvar configurações) será executada — apenas leitura e clique em links de navegação.

### Pré-requisito
Você precisa estar logado como **médico** no preview. Se aparecer tela de login, eu paro e te aviso.

### Escopo dos componentes a testar

1. **Header / Saudação** — nome, tratamento, badge de modo leitura (se aplicável).
2. **Lembrete de link de sala** (`LembreteTrocarLinkSala`) — renderização e CTA.
3. **Onboarding checklist** — itens, barra de progresso, links de cada pendência.
4. **Próxima consulta (destaque)** — dados, botão "Iniciar"/"Abrir sala" (apenas verifico habilitação, **não clico**).
5. **Lista "Próximas consultas"** — renderização, link "Ver todas".
6. **StatCards (KPIs)** — Hoje, Online, Semana, Pacientes únicos, Receita mês, Pendentes, Documentos.
7. **Card de Receita / Financeiro** — particular vs serviços, link para `/app/medico/financeiro`.
8. **Card de Gamificação / Ranking** — score, nível, saldo de crescimento, link Premium.
9. **Card de Propostas** — contador e link para `/app/medico/propostas`.
10. **Atalhos rápidos** — todos os links de navegação (Agenda, Pacientes, Configurações, Treinamento, etc.).
11. **TermsAcceptanceDialog** — verificar se aparece quando aplicável (sem aceitar).

### Método

- `navigate_to_sandbox` em `/app/medico`.
- `screenshot` inicial para snapshot.
- `observe` para mapear seções e botões.
- Para cada link de navegação: clico, verifico rota destino, volto para `/app/medico`.
- Para botões mutativos (iniciar consulta, salvar): apenas verifico se estão visíveis/habilitados, **sem clicar**.
- Coleto `read_console_logs` no final para erros.

### Entrega

Relatório final com tabela:

```text
Componente                  | Status | Observação
----------------------------|--------|------------------------
Header / saudação           | OK     | ...
Onboarding checklist        | OK     | 2 pendências detectadas
Próxima consulta            | OK     | botão Iniciar habilitado
StatCard "Receita mês"      | WARN   | valor R$ 0,00
Link → /app/medico/agenda   | OK     | navegou corretamente
...
```

Erros, dados faltantes ou botões quebrados aparecem destacados. Se encontrar bug crítico, paro e te aviso antes de continuar.

### Não inclui

- Testes destrutivos (criar/editar/excluir).
- Testes em outras rotas além do dashboard (cada link é apenas verificado quanto a destino correto, não auditado a fundo).
- Testes responsivos em múltiplos viewports (uso o atual 1423×873).
