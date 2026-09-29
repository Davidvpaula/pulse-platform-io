# Auditoria dos dashboards — Pulse Platform

> Retomada em 28/09/2026: consulte [correções e validação funcional do Admin](../admin-funcional/README.md). Os relatórios abaixo preservam o retrato da auditoria original.

> Continuidade em 29/09/2026: [correções, testes e limites do dashboard Médico](../medico-funcional/README.md).

Data: 22/09/2026. Escopo: código local em `pulse-platform-git`, rotas React, páginas, dependências, controles de acesso e definições SQL relacionadas. Esta entrega é documental: não modifica comportamento, dados, credenciais ou serviços.

## Relatórios separados

| Dashboard | Relatório | Inventário de rotas, funções e integrações |
|---|---|---|
| Administrador | [ADMIN.md](ADMIN.md) | [75 rotas](INVENTARIO-ADMIN.md) |
| Usuário / paciente | [PACIENTE.md](PACIENTE.md) | [18 rotas, incluindo confirmação compartilhada](INVENTARIO-PACIENTE.md) |
| Médico | [MEDICO.md](MEDICO.md) | [24 rotas](INVENTARIO-MEDICO.md) |
| Secretaria / colaborador, dashboard único configurável pelo admin | [COLABORADOR.md](COLABORADOR.md) | [34 rotas, incluindo aliases de secretaria e supervisor](INVENTARIO-COLABORADOR.md) |
| Empresa | [EMPRESA.md](EMPRESA.md) | [9 rotas](INVENTARIO-EMPRESA.md) |
| Comunicação, módulo compartilhado com dashboard próprio | [COMUNICACAO.md](COMUNICACAO.md) | [10 rotas](INVENTARIO-COMUNICACAO.md) |

Secretaria e supervisor não são produtos ou dashboards independentes: o perfil efetivo é `colaborador`; supervisão é uma capacidade. O relatório de comunicação existe porque há uma rota `comunicacao/dashboard` e ferramentas compartilhadas, não porque exista um novo papel de usuário.

## Cobertura e limites

O extrator percorre os arquivos TypeScript/JavaScript de `src`, identifica 191 declarações de rota com `path` e inventaria 137 arquivos em `src/pages/app`. As seis famílias acima somam 170 declarações, incluindo redirecionamentos e curingas; as outras 21 são públicas, autenticação, editor local e fallback. A rota index `/app` não entra na contagem de declarações com `path`. Uma declaração de rota não corresponde necessariamente a uma funcionalidade diferente.

Os inventários enumeram todas as rotas dessas famílias, arquivos de página, funções nomeadas, títulos, chamadas diretas a dados, operações de escrita, dependências e referências a RPCs/Edge Functions alcançáveis por imports. Callbacks anônimos, chamadas com nomes dinâmicos e comportamento condicional exigem leitura contextual. Arquivos sem rota direta são identificados, sem afirmar automaticamente que estejam mortos.

A análise manual aprofundou guards, sessões/perfis, permissão de colaborador, dashboard inicial de cada perfil, pagamento, prescrições, relatórios empresariais, impersonação e comunicação. O inventário completo não equivale a revisão manual linha a linha de todos os componentes ou a teste funcional completo de cada botão.

**Confirmado no código** significa que existe uma evidência estática do comportamento. **Risco a validar** significa que o impacto depende de dados, configuração, RLS, grants ou execução. **Incompleto** identifica recursos explicitamente simulados/desativados. Prioridade alta indica correção antes de operação real; média indica inconsistência funcional ou experiência comprometida.

Não foram executados pagamentos, emissão de documentos, chamadas a provedores, alterações de permissão ou consultas ao banco remoto. As migrações consultadas não certificam o estado do banco implantado. O preview local dispensa guards e bloqueia gravações; ele não demonstra isolamento entre usuários ou empresas.

## Ordem recomendada para construção

1. Corrigir o contrato de acesso: colaborador único, suspensão global, guards de comunicação, coerência menu/rota/ação e atualização de permissões.
2. Corrigir impersonação e separar operações simuladas de pagamentos e documentos dos fluxos reais.
3. Preparar banco isolado com usuários de cada papel, duas empresas, médicos e pacientes distintos; validar RLS, RPCs e Storage com casos positivos e negativos.
4. Completar botões pendentes e corrigir indicadores truncados, erros silenciosos e filtros de período.
5. Executar jornadas completas de agendamento, atendimento, documento, cobrança, proposta empresarial e comunicação; então fazer acabamento visual.

## Reprodução

Executar na raiz do repositório:

```text
node scripts/audit-dashboards.mjs
node scripts/validate-routes.mjs
node scripts/verify-dashboard-audit.mjs
```

O primeiro comando atualiza somente os arquivos `INVENTARIO-*.md` e [inventario.json](inventario.json). Os relatórios interpretativos são mantidos manualmente. [VALIDACAO.md](VALIDACAO.md) registra os resultados desta entrega.
