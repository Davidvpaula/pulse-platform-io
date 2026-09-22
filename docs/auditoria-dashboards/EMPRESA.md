# Auditoria — Empresa

## Rotas e funções

Entrada: `/app/empresa/dashboard`; nove rotas: dashboard, funcionários, agendamentos, relatórios, financeiro, documentos, termos, propostas e perfil. [Mapa completo com funções e fontes](INVENTARIO-EMPRESA.md).

| Área | Funções encontradas |
|---|---|
| Visão geral | Funcionários ativos, consultas, faturas, custo, propostas e documentos compartilhados |
| Funcionários | Cadastro/gestão de vínculos empresariais |
| Agendamentos | Consulta de atendimentos da empresa |
| Relatórios | Consumo por funcionário/setor, custo, faltas, faturas e exportação CSV |
| Financeiro | Faturas e situação financeira |
| Documentos | Documentos com visibilidade empresarial |
| Gestão | Termos, propostas comerciais e perfil |

## Mecânica

Todas usam [EmpresaGuard](../../src/components/empresa/EmpresaGuard.tsx). Ele verifica a existência de empresa resolvida por [useEmpresaAtual](../../src/lib/useEmpresaAtual.ts), não um papel explícito de gestor empresarial. A RPC `get_empresa_id_do_usuario`, na [definição consultada](../../supabase/migrations/20260506114106_54c93fa0-62be-40ff-bd73-46c74b028f80.sql), encontra vínculo por paciente/funcionário e retorna um ID com `LIMIT 1`.

As páginas filtram diversas consultas por `empresa_id`. O preview usa uma empresa demonstrativa. Em produção, RLS precisa garantir tanto a separação de empresas quanto a distinção entre beneficiário e gestor; o filtro do cliente não substitui essa autorização.

## Achados

### EMP-01 — Alta — Vínculo de funcionário pode satisfazer guard de gestor

**Confirmado na composição do frontend/SQL; acesso a dados adicionais depende de RLS.** A resolução encontra empresa de paciente/funcionário, e o guard aceita qualquer empresa resolvida. Não exige papel empresa, capacidade de RH ou vínculo específico de gestor. Um beneficiário pode passar no guard por URL direta.

Correção: separar vínculo de beneficiário e vínculo de gestão; autorização no servidor por capacidade e empresa ativa. Aceite: funcionário comum não abre ferramentas de RH nem consulta dados de colegas por chamadas diretas.

### EMP-02 — Média — Indicador mensal está truncado e inclui futuro

**Confirmado em [EmpresaDashboard](../../src/pages/app/empresa/EmpresaDashboard.tsx).** Busca consultas a partir do primeiro dia do mês, sem limite final, com `limit(100)`; usa o tamanho da lista como consultas do mês. Consultas futuras entram no total e mais de 100 ficam truncadas. O mesmo subconjunto fornece as próximas consultas, que podem desaparecer depois de 100 registros passados. Separar agregados mensais de lista futura paginada.

### EMP-03 — Alta — Contagem de documentos depende integralmente de RLS

**Risco a validar.** A contagem no dashboard filtra `visibilidade_empresa = true`, sem empresa no cliente. O resultado pode estar correto com RLS adequada, mas não há evidência nesta etapa de isolamento do banco implantado. Testar duas empresas com documentos compartilhados e confirmar contagens independentes.

### EMP-04 — Média — Erros podem aparecer como indicadores zerados

**Confirmado.** Dashboard e relatórios obtêm respostas Supabase em `Promise.all`, mas não verificam `error` de cada resultado. O catch só captura rejeições; respostas com erro seguem como arrays vazios/zero. Correção: validar todos os resultados e distinguir ausência de dados de acesso negado/indisponibilidade.

### EMP-05 — Alta — Promessa de agregação diverge da apresentação

**Confirmado em [EmpresaRelatorios](../../src/pages/app/empresa/EmpresaRelatorios.tsx).** O aviso diz que os relatórios são agregados por setor, porém uma aba e o CSV identificam funcionário, consultas, valor e faltas. Não foi encontrada exposição de diagnóstico nesse componente; a inconsistência é sobre identificação individual do consumo. Definir a visibilidade pretendida e alinhar consulta, exportação e texto.

### EMP-06 — Média — Filtros e exportação do relatório são inconsistentes

**Confirmado.** Consultas usam período com limite de 1.000; faturas usam limite de 100 sem o filtro do período escolhido. Data final selecionada no calendário pode representar início do dia, excluindo o restante desse dia. CSV não duplica aspas internas nem neutraliza conteúdo iniciado por fórmula; nomes/setores vindos de cadastro precisam de serialização segura para planilhas. Esses problemas são independentes da existência de registros na produção.

### EMP-07 — Média — Recursos ainda incompletos

**Incompleto.** [EmpresaFinanceiro](../../src/pages/app/empresa/EmpresaFinanceiro.tsx) usa toast informando download de boleto/NF futuro; [EmpresaPropostas](../../src/pages/app/empresa/EmpresaPropostas.tsx) informa termos comerciais ainda indisponíveis. Não tratar como fluxo empresarial pronto para aceite/fechamento.

## Validação necessária

Criar duas empresas isoladas, gestores e beneficiários distintos; conferir URL direta/RPC/Storage; testar funcionário desligado, múltiplos vínculos, competência financeira, mais de 100/1.000 consultas, seleção do último dia e CSV com aspas/fórmulas. Validar compartilhamento por documento com o fluxo médico.

Status: auditoria estática concluída neste escopo; isolamento de dados e fluxos comerciais não homologados.
