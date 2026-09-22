# Auditoria — Usuário / Paciente

## Rotas e funções

Entrada: `/app/paciente/dashboard`. São 18 declarações no grupo, incluindo confirmação em `/app/agendamento`, parâmetros de checkout, aliases e fallback. [Inventário completo](INVENTARIO-PACIENTE.md).

| Área | Funções encontradas |
|---|---|
| Dashboard | Próximas consultas, entrada em teleconsulta, pendências financeiras, vínculo particular/empresarial, plano e retornos |
| Agendamento | Lista, seleção/confirmação de horário, identificação do atendido e fluxo de pagamento |
| Pagamentos | Checkout, cupom, cancelamento, sucesso/cancelado e histórico financeiro |
| Plano | Plano atual, montagem, assinatura e retorno de checkout |
| Dados pessoais | Perfil e dependentes |
| Atendimento | Documentos, prescrições, notificações e componentes de avaliação/cancelamento |

Paciente empresarial é vínculo do mesmo dashboard, não um perfil de navegação separado. A rota antiga de mensagens vai para notificações; arquivos legados permanecem no inventário.

## Mecânica

`ProtectedRoute` exige sessão e [PacienteGuard](../../src/components/PacienteGuard.tsx) consulta cadastro/situação por [usePacienteAtual](../../src/lib/usePacienteAtual.ts). Contas pendentes, suspensas, bloqueadas e banidas recebem tela de bloqueio. Admin sem cadastro tem exceção no guard; isso não resolve automaticamente a identidade alvo para consultas.

Consultas e indicadores usam [queries do paciente](../../src/lib/paciente/queries.ts). Checkout lê pagamento, contexto de consulta/reserva, titular/dependente e cupom. [pagamentos.ts](../../src/lib/pagamentos.ts) seleciona provider em `app_settings`, oferece fluxo mock e Stripe, grava segredo de checkout na sessão com TTL e delega integrações. O retorno visual de sucesso não substitui confirmação financeira pelo servidor.

## Achados

### PAC-01 — Alta — Falha de configuração recai em pagamento simulado

**Confirmado no código; impacto em banco depende de RLS/configuração.** `getProviderAtual` ignora `error` ao ler `app_settings`: qualquer valor diferente de `stripe`, inclusive ausência/falha, seleciona `mock`. Nesse provider o próprio cliente atualiza `pagamentos.status` para `pago` e chama criação pós-pagamento. Não há restrição desse provider ao modo local nesse helper.

Correção: configuração inválida deve interromper checkout; separar sandbox por ambiente e confirmar pagamentos reais apenas com prova do provedor validada no servidor. Aceite: indisponibilidade de configuração não aprova pagamento nem cria atendimento.

### PAC-02 — Média — Checkout pode permanecer carregando após exceção

**Confirmado na estrutura de [PacienteCheckout](../../src/pages/app/paciente/PacienteCheckout.tsx).** `carregar` faz múltiplos awaits e termina com `setLoading(false)`, sem `try/finally` ou estado de erro abrangente. Uma rejeição antes do fim deixa a interface sem recuperação. As respostas com erro também precisam ser distinguidas de pagamento inexistente. Testar falha de rede e pagamento inacessível.

### PAC-03 — Média — Indicador mensal inclui meses seguintes

**Confirmado em [PacienteDashboard](../../src/pages/app/paciente/PacienteDashboard.tsx).** `statsConsultas` filtra apenas `inicio >= inicioMes`, sem limite superior. Se a consulta carregada inclui próximos meses, eles entram no indicador mensal. Correção: intervalo fechado no início e aberto no início do próximo mês, com fuso definido.

### PAC-04 — Alta — Documentos podem incluir conteúdo simulado persistido

**Risco de integridade demonstrado no fluxo médico.** O helper de emissão simulada insere em `prescricoes`, usado pelos fluxos clínicos. Ver MED-01. Distinguir ambiente e origem de documentos antes de permitir distribuição ao paciente.

### PAC-05 — Alta — Isolamento titular/dependente ainda precisa de prova em banco

**Risco a validar, não vulnerabilidade demonstrada.** Há vários identificadores controlados por rota/metadata: pagamento, slot, plano e paciente atendido. Os guards de formato não comprovam propriedade. Testar acesso cruzado entre titulares, dependentes, médicos e empresas; reserva concorrente do mesmo slot; retorno duplicado de pagamento e uso concorrente de cupom.

### PAC-06 — Alta — Confirmação compartilhada não aplica guard de situação

**Confirmado no roteador; possibilidade de reservar depende das RPCs.** `/app/agendamento/confirmar/:slotId` usa `PacienteParamGuard`, que verifica somente o formato do parâmetro, sem `PacienteGuard`. A página resolve paciente para montar o fluxo, mas a proteção de situação cadastral não é a mesma das demais páginas do paciente. Aplicar o contrato de status de forma consistente e testar paciente suspenso por acesso direto; isso não demonstra que o banco permita a reserva.

## Critérios de conclusão

Uma jornada deve comprovar cadastro ativo → agendamento sem duplicação → cobrança de sandbox confirmada pelo backend → teleconsulta autorizada → documento correto → histórico e notificações. Incluir cancelamento/reembolso e plano/dependente. Os cards locais apenas facilitam inspeção da interface; não executam essa jornada real.

Status: rotas e funções inventariadas; problemas registrados, sem correções de comportamento nesta etapa.
