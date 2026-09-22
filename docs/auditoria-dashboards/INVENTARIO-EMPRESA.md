# Inventário técnico — empresa

Gerado por `node scripts/audit-dashboards.mjs`. Consulte o relatório principal para interpretação e achados. Funções nomeadas e chamadas diretas são extraídas por AST; callbacks anônimos não são enumerados como funções independentes. Um símbolo presente não comprova funcionalidade concluída.

## Rotas (9)

Todas herdam autenticação do layout /app. O preview local dispensa os guards e não serve para testar permissões reais.

| Rota | Página / destino | Controle adicional no roteador | Fonte |
|---|---|---|---|
| `/app/empresa/dashboard` | [src/pages/app/empresa/EmpresaDashboard.tsx](../../src/pages/app/empresa/EmpresaDashboard.tsx) | EmpresaGuard | [src/App.tsx:434](../../src/App.tsx#L434) |
| `/app/empresa/funcionarios` | [src/pages/app/empresa/EmpresaFuncionarios.tsx](../../src/pages/app/empresa/EmpresaFuncionarios.tsx) | EmpresaGuard | [src/App.tsx:435](../../src/App.tsx#L435) |
| `/app/empresa/agendamentos` | [src/pages/app/empresa/EmpresaAgendamentos.tsx](../../src/pages/app/empresa/EmpresaAgendamentos.tsx) | EmpresaGuard | [src/App.tsx:436](../../src/App.tsx#L436) |
| `/app/empresa/relatorios` | [src/pages/app/empresa/EmpresaRelatorios.tsx](../../src/pages/app/empresa/EmpresaRelatorios.tsx) | EmpresaGuard | [src/App.tsx:437](../../src/App.tsx#L437) |
| `/app/empresa/financeiro` | [src/pages/app/empresa/EmpresaFinanceiro.tsx](../../src/pages/app/empresa/EmpresaFinanceiro.tsx) | EmpresaGuard | [src/App.tsx:438](../../src/App.tsx#L438) |
| `/app/empresa/documentos` | [src/pages/app/empresa/EmpresaDocumentos.tsx](../../src/pages/app/empresa/EmpresaDocumentos.tsx) | EmpresaGuard | [src/App.tsx:439](../../src/App.tsx#L439) |
| `/app/empresa/termos` | [src/pages/app/empresa/EmpresaTermos.tsx](../../src/pages/app/empresa/EmpresaTermos.tsx) | EmpresaGuard | [src/App.tsx:440](../../src/App.tsx#L440) |
| `/app/empresa/propostas` | [src/pages/app/empresa/EmpresaPropostas.tsx](../../src/pages/app/empresa/EmpresaPropostas.tsx) | EmpresaGuard | [src/App.tsx:441](../../src/App.tsx#L441) |
| `/app/empresa/perfil` | [src/pages/app/empresa/EmpresaPerfilPage.tsx](../../src/pages/app/empresa/EmpresaPerfilPage.tsx) | EmpresaGuard | [src/App.tsx:442](../../src/App.tsx#L442) |

## Páginas e funções encontradas

“Sem rota direta” significa apenas ausência de associação direta no App.tsx; o arquivo pode ser importado por outra página. As tabelas/fontes em `.from()` podem incluir buckets de Storage.

### EmpresaAgendamentos.tsx

Fonte: [src/pages/app/empresa/EmpresaAgendamentos.tsx](../../src/pages/app/empresa/EmpresaAgendamentos.tsx) (201 linhas). Rotas: `/app/empresa/agendamentos`.

Funções nomeadas: [src/pages/app/empresa/EmpresaAgendamentos.tsx:27](../../src/pages/app/empresa/EmpresaAgendamentos.tsx#L27) `EmpresaAgendamentos`.

Dados e integrações diretas: `from(consultas)` [src/pages/app/empresa/EmpresaAgendamentos.tsx:40](../../src/pages/app/empresa/EmpresaAgendamentos.tsx#L40).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/StatusBadge.tsx](../../src/components/StatusBadge.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/relatorios/utils.ts](../../src/lib/relatorios/utils.ts); [src/lib/useEmpresaAtual.ts](../../src/lib/useEmpresaAtual.ts).

### EmpresaDashboard.tsx

Fonte: [src/pages/app/empresa/EmpresaDashboard.tsx](../../src/pages/app/empresa/EmpresaDashboard.tsx) (250 linhas). Rotas: `/app/empresa/dashboard`.

Funções nomeadas: [src/pages/app/empresa/EmpresaDashboard.tsx:12](../../src/pages/app/empresa/EmpresaDashboard.tsx#L12) `brl`; [src/pages/app/empresa/EmpresaDashboard.tsx:45](../../src/pages/app/empresa/EmpresaDashboard.tsx#L45) `EmpresaDashboard`; [src/pages/app/empresa/EmpresaDashboard.tsx:235](../../src/pages/app/empresa/EmpresaDashboard.tsx#L235) `Kpi`.

Dados e integrações diretas: `from(empresas_funcionarios)` [src/pages/app/empresa/EmpresaDashboard.tsx:63](../../src/pages/app/empresa/EmpresaDashboard.tsx#L63); `from(consultas)` [src/pages/app/empresa/EmpresaDashboard.tsx:64](../../src/pages/app/empresa/EmpresaDashboard.tsx#L64); `from(empresas_faturas)` [src/pages/app/empresa/EmpresaDashboard.tsx:66](../../src/pages/app/empresa/EmpresaDashboard.tsx#L66); `from(documentos_paciente)` [src/pages/app/empresa/EmpresaDashboard.tsx:67](../../src/pages/app/empresa/EmpresaDashboard.tsx#L67); `from(propostas_empresa_medico)` [src/pages/app/empresa/EmpresaDashboard.tsx:68](../../src/pages/app/empresa/EmpresaDashboard.tsx#L68); `from(empresas)` [src/pages/app/empresa/EmpresaDashboard.tsx:78](../../src/pages/app/empresa/EmpresaDashboard.tsx#L78); `from((dinâmico))` [src/pages/app/empresa/EmpresaDashboard.tsx:113](../../src/pages/app/empresa/EmpresaDashboard.tsx#L113); `from((dinâmico))` [src/pages/app/empresa/EmpresaDashboard.tsx:129](../../src/pages/app/empresa/EmpresaDashboard.tsx#L129).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/useEmpresaAtual.ts](../../src/lib/useEmpresaAtual.ts).

### EmpresaDocumentos.tsx

Fonte: [src/pages/app/empresa/EmpresaDocumentos.tsx](../../src/pages/app/empresa/EmpresaDocumentos.tsx) (226 linhas). Rotas: `/app/empresa/documentos`.

Funções nomeadas: [src/pages/app/empresa/EmpresaDocumentos.tsx:26](../../src/pages/app/empresa/EmpresaDocumentos.tsx#L26) `EmpresaDocumentos`.

Dados e integrações diretas: `from(empresas_funcionarios)` [src/pages/app/empresa/EmpresaDocumentos.tsx:40](../../src/pages/app/empresa/EmpresaDocumentos.tsx#L40); `from(documentos_paciente)` [src/pages/app/empresa/EmpresaDocumentos.tsx:57](../../src/pages/app/empresa/EmpresaDocumentos.tsx#L57).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/useEmpresaAtual.ts](../../src/lib/useEmpresaAtual.ts).

### EmpresaFinanceiro.tsx

Fonte: [src/pages/app/empresa/EmpresaFinanceiro.tsx](../../src/pages/app/empresa/EmpresaFinanceiro.tsx) (172 linhas). Rotas: `/app/empresa/financeiro`.

Funções nomeadas: [src/pages/app/empresa/EmpresaFinanceiro.tsx:38](../../src/pages/app/empresa/EmpresaFinanceiro.tsx#L38) `EmpresaFinanceiro`.

Dados e integrações diretas: `from(empresas_faturas)` [src/pages/app/empresa/EmpresaFinanceiro.tsx:47](../../src/pages/app/empresa/EmpresaFinanceiro.tsx#L47).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/relatorios/utils.ts](../../src/lib/relatorios/utils.ts); [src/lib/useEmpresaAtual.ts](../../src/lib/useEmpresaAtual.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/empresa/EmpresaFinanceiro.tsx:158](../../src/pages/app/empresa/EmpresaFinanceiro.tsx#L158): <Button size="sm" variant="ghost" onClick={() => toast.info("Download de boleto/NF será habilitado em breve.")}>

### EmpresaFuncionarios.tsx

Fonte: [src/pages/app/empresa/EmpresaFuncionarios.tsx](../../src/pages/app/empresa/EmpresaFuncionarios.tsx) (297 linhas). Rotas: `/app/empresa/funcionarios`.

Funções nomeadas: [src/pages/app/empresa/EmpresaFuncionarios.tsx:31](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L31) `EmpresaFuncionarios`; [src/pages/app/empresa/EmpresaFuncionarios.tsx:76](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L76) `toggleStatus`; [src/pages/app/empresa/EmpresaFuncionarios.tsx:90](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L90) `handleImport`; [src/pages/app/empresa/EmpresaFuncionarios.tsx:223](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L223) `ModalAdd`; [src/pages/app/empresa/EmpresaFuncionarios.tsx:229](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L229) `set`; [src/pages/app/empresa/EmpresaFuncionarios.tsx:231](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L231) `submit`; [src/pages/app/empresa/EmpresaFuncionarios.tsx:294](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L294) `Field`.

Dados e integrações diretas: `from(empresas_funcionarios)` [src/pages/app/empresa/EmpresaFuncionarios.tsx:48](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L48); `from((dinâmico))` [src/pages/app/empresa/EmpresaFuncionarios.tsx:65](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L65); `from(empresas_funcionarios)` [src/pages/app/empresa/EmpresaFuncionarios.tsx:78](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L78); `from(empresas_funcionarios)` [src/pages/app/empresa/EmpresaFuncionarios.tsx:100](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L100); `from(empresas_funcionarios)` [src/pages/app/empresa/EmpresaFuncionarios.tsx:242](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L242).

Operações diretas detectadas: update, insert.

Dependências locais diretas: [src/hooks/use-toast.ts](../../src/hooks/use-toast.ts); [src/lib/validation/cpf.ts](../../src/lib/validation/cpf.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/useEmpresaAtual.ts](../../src/lib/useEmpresaAtual.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/empresa/EmpresaFuncionarios.tsx:37](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L37): const [filtroStatus, setFiltroStatus] = useState<FuncionarioStatus \| "todos">("todos");
- [src/pages/app/empresa/EmpresaFuncionarios.tsx:38](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L38): const [filtroSetor, setFiltroSetor] = useState<string>("todos");
- [src/pages/app/empresa/EmpresaFuncionarios.tsx:67](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L67): if (filtroStatus !== "todos" && f.status !== filtroStatus) return false;
- [src/pages/app/empresa/EmpresaFuncionarios.tsx:68](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L68): if (filtroSetor !== "todos" && f.setor !== filtroSetor) return false;
- [src/pages/app/empresa/EmpresaFuncionarios.tsx:165](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L165): <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as FuncionarioStatus \| "todos")} className="rounded-md border border-input bg-background px-2 py-2 text-sm">
- [src/pages/app/empresa/EmpresaFuncionarios.tsx:166](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L166): <option value="todos">Todos os status</option>
- [src/pages/app/empresa/EmpresaFuncionarios.tsx:171](../../src/pages/app/empresa/EmpresaFuncionarios.tsx#L171): <option value="todos">Todos os setores</option>

### EmpresaPerfilPage.tsx

Fonte: [src/pages/app/empresa/EmpresaPerfilPage.tsx](../../src/pages/app/empresa/EmpresaPerfilPage.tsx) (237 linhas). Rotas: `/app/empresa/perfil`.

Funções da interface, conforme títulos e descrições: Perfil corporativo; Dados cadastrais e plano contratado.

Funções nomeadas: [src/pages/app/empresa/EmpresaPerfilPage.tsx:29](../../src/pages/app/empresa/EmpresaPerfilPage.tsx#L29) `EmpresaPerfilPage`; [src/pages/app/empresa/EmpresaPerfilPage.tsx:88](../../src/pages/app/empresa/EmpresaPerfilPage.tsx#L88) `salvar`; [src/pages/app/empresa/EmpresaPerfilPage.tsx:229](../../src/pages/app/empresa/EmpresaPerfilPage.tsx#L229) `Field`.

Dados e integrações diretas: `from(empresas)` [src/pages/app/empresa/EmpresaPerfilPage.tsx:55](../../src/pages/app/empresa/EmpresaPerfilPage.tsx#L55); `from(empresas_funcionarios)` [src/pages/app/empresa/EmpresaPerfilPage.tsx:74](../../src/pages/app/empresa/EmpresaPerfilPage.tsx#L74); `from(empresas)` [src/pages/app/empresa/EmpresaPerfilPage.tsx:93](../../src/pages/app/empresa/EmpresaPerfilPage.tsx#L93).

Operações diretas detectadas: update.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/relatorios/utils.ts](../../src/lib/relatorios/utils.ts); [src/components/shared/ContaSeguranca.tsx](../../src/components/shared/ContaSeguranca.tsx); [src/lib/useEmpresaAtual.ts](../../src/lib/useEmpresaAtual.ts).

### EmpresaPropostas.tsx

Fonte: [src/pages/app/empresa/EmpresaPropostas.tsx](../../src/pages/app/empresa/EmpresaPropostas.tsx) (514 linhas). Rotas: `/app/empresa/propostas`.

Funções da interface, conforme títulos e descrições: Nova Proposta Personalizada; Descreva seus interesses e objetivos, selecione o médico e faça sua oferta.; Planos Personalizados; Monte propostas de atendimento diretamente para médicos da plataforma..

Funções nomeadas: [src/pages/app/empresa/EmpresaPropostas.tsx:30](../../src/pages/app/empresa/EmpresaPropostas.tsx#L30) `brl`; [src/pages/app/empresa/EmpresaPropostas.tsx:31](../../src/pages/app/empresa/EmpresaPropostas.tsx#L31) `fmtDate`; [src/pages/app/empresa/EmpresaPropostas.tsx:54](../../src/pages/app/empresa/EmpresaPropostas.tsx#L54) `EmpresaPropostas`; [src/pages/app/empresa/EmpresaPropostas.tsx:86](../../src/pages/app/empresa/EmpresaPropostas.tsx#L86) `carregarDados`; [src/pages/app/empresa/EmpresaPropostas.tsx:136](../../src/pages/app/empresa/EmpresaPropostas.tsx#L136) `enviarProposta`; [src/pages/app/empresa/EmpresaPropostas.tsx:184](../../src/pages/app/empresa/EmpresaPropostas.tsx#L184) `resetForm`.

Dados e integrações diretas: `from(propostas_empresa_medico)` [src/pages/app/empresa/EmpresaPropostas.tsx:92](../../src/pages/app/empresa/EmpresaPropostas.tsx#L92); `from(medicos)` [src/pages/app/empresa/EmpresaPropostas.tsx:97](../../src/pages/app/empresa/EmpresaPropostas.tsx#L97); `from(especialidades)` [src/pages/app/empresa/EmpresaPropostas.tsx:102](../../src/pages/app/empresa/EmpresaPropostas.tsx#L102); `from(termos_condicoes)` [src/pages/app/empresa/EmpresaPropostas.tsx:108](../../src/pages/app/empresa/EmpresaPropostas.tsx#L108); `from(propostas_empresa_medico)` [src/pages/app/empresa/EmpresaPropostas.tsx:161](../../src/pages/app/empresa/EmpresaPropostas.tsx#L161).

Operações diretas detectadas: insert.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/session.tsx](../../src/lib/session.tsx); [src/integrations/supabase/types.ts](../../src/integrations/supabase/types.ts); [src/hooks/useTermsCheck.ts](../../src/hooks/useTermsCheck.ts); [src/components/shared/TermsAcceptanceDialog.tsx](../../src/components/shared/TermsAcceptanceDialog.tsx); [src/lib/useEmpresaAtual.ts](../../src/lib/useEmpresaAtual.ts).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/empresa/EmpresaPropostas.tsx:349](../../src/pages/app/empresa/EmpresaPropostas.tsx#L349): Os termos de proposta comercial serão disponibilizados em breve.

### EmpresaRelatorios.tsx

Fonte: [src/pages/app/empresa/EmpresaRelatorios.tsx](../../src/pages/app/empresa/EmpresaRelatorios.tsx) (356 linhas). Rotas: `/app/empresa/relatorios`.

Funções da interface, conforme títulos e descrições: Relatórios corporativos.

Funções nomeadas: [src/pages/app/empresa/EmpresaRelatorios.tsx:22](../../src/pages/app/empresa/EmpresaRelatorios.tsx#L22) `brl`; [src/pages/app/empresa/EmpresaRelatorios.tsx:23](../../src/pages/app/empresa/EmpresaRelatorios.tsx#L23) `fmtDate`; [src/pages/app/empresa/EmpresaRelatorios.tsx:25](../../src/pages/app/empresa/EmpresaRelatorios.tsx#L25) `EmpresaRelatorios`; [src/pages/app/empresa/EmpresaRelatorios.tsx:41](../../src/pages/app/empresa/EmpresaRelatorios.tsx#L41) `carregarDados`; [src/pages/app/empresa/EmpresaRelatorios.tsx:134](../../src/pages/app/empresa/EmpresaRelatorios.tsx#L134) `exportCsv`; [src/pages/app/empresa/EmpresaRelatorios.tsx:335](../../src/pages/app/empresa/EmpresaRelatorios.tsx#L335) `DatePick`.

Dados e integrações diretas: `from(consultas)` [src/pages/app/empresa/EmpresaRelatorios.tsx:50](../../src/pages/app/empresa/EmpresaRelatorios.tsx#L50); `from(empresas_funcionarios)` [src/pages/app/empresa/EmpresaRelatorios.tsx:56](../../src/pages/app/empresa/EmpresaRelatorios.tsx#L56); `from(empresas_faturas)` [src/pages/app/empresa/EmpresaRelatorios.tsx:59](../../src/pages/app/empresa/EmpresaRelatorios.tsx#L59).

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/components/PageHeader.tsx](../../src/components/PageHeader.tsx); [src/components/StatCard.tsx](../../src/components/StatCard.tsx); [src/lib/utils.ts](../../src/lib/utils.ts); [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/useEmpresaAtual.ts](../../src/lib/useEmpresaAtual.ts).

### EmpresaTermos.tsx

Fonte: [src/pages/app/empresa/EmpresaTermos.tsx](../../src/pages/app/empresa/EmpresaTermos.tsx) (132 linhas). Rotas: `/app/empresa/termos`.

Funções nomeadas: [src/pages/app/empresa/EmpresaTermos.tsx:17](../../src/pages/app/empresa/EmpresaTermos.tsx#L17) `EmpresaTermos`; [src/pages/app/empresa/EmpresaTermos.tsx:27](../../src/pages/app/empresa/EmpresaTermos.tsx#L27) `carregar`; [src/pages/app/empresa/EmpresaTermos.tsx:40](../../src/pages/app/empresa/EmpresaTermos.tsx#L40) `handleAceitar`.

Dados e integrações diretas: sem chamada direta identificada; consultar componentes/helpers importados.

Operações diretas detectadas: nenhuma.

Dependências locais diretas: [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts); [src/lib/termos.ts](../../src/lib/termos.ts); [src/components/shared/MeusAceites.tsx](../../src/components/shared/MeusAceites.tsx).

Marcadores para revisão (podem ser comentários ou avisos legítimos, não bugs confirmados):

- [src/pages/app/empresa/EmpresaTermos.tsx:31](../../src/pages/app/empresa/EmpresaTermos.tsx#L31): const todos = await buscarTermosPendentes("empresa");
- [src/pages/app/empresa/EmpresaTermos.tsx:32](../../src/pages/app/empresa/EmpresaTermos.tsx#L32): setPendentes(todos);
- [src/pages/app/empresa/EmpresaTermos.tsx:99](../../src/pages/app/empresa/EmpresaTermos.tsx#L99): <p className="text-sm font-medium">Todos os termos obrigatórios foram aceitos.</p>

## Integrações alcançáveis por imports locais

Este mapa inclui helpers/componentes importados e pode conter funções não executadas por esta tela. Não é uma prova de fluxo em execução. Definições SQL são candidatas presentes no histórico; não certificam o schema implantado, grants nem políticas resultantes.

| Tipo | Nome | Chamada | Implementação no repositório |
|---|---|---|---|
| rpc | `get_empresa_id_do_usuario` | [src/lib/useEmpresaAtual.ts:44](../../src/lib/useEmpresaAtual.ts#L44) | [supabase/migrations/20260504142602_0236effd-6ffa-4c26-a3df-373524e71f6c.sql:3](../../supabase/migrations/20260504142602_0236effd-6ffa-4c26-a3df-373524e71f6c.sql#L3); [supabase/migrations/20260506114106_54c93fa0-62be-40ff-bd73-46c74b028f80.sql:38](../../supabase/migrations/20260506114106_54c93fa0-62be-40ff-bd73-46c74b028f80.sql#L38) |
