# Médico — retomada funcional local

Atualizado em 29/09/2026. Continuidade da [auditoria médica](../auditoria-dashboards/MEDICO.md), usando o mesmo banco local preparado para o Admin. Nenhuma migração foi aplicada ao banco remoto e nenhuma integração externa foi adicionada.

## Abrir e retomar

Acesse <http://127.0.0.1:8082/auth> e escolha **Entrar como médico**. O cartão autentica uma conta fictícia real do Supabase local; não usa o bypass do preview. O acesso do Admin permanece disponível na mesma página.

- Atalho: [ABRIR-MEDICO-LOCAL.html](../../ABRIR-MEDICO-LOCAL.html).
- Inicialização: abra o Docker Desktop e execute [INICIAR-PLATAFORMA-LOCAL.cmd](../../INICIAR-PLATAFORMA-LOCAL.cmd), ou `npm run plataforma:local`.
- Operações e navegador: `npm run medico:test`.
- Varredura de telas: `npm run medico:routes`.
- Contas fictícias `medico@pulse.local` e `medico2@pulse.local`: senhas geradas nos arquivos locais ignorados pelo Git. A segunda conta verifica isolamento. Os testes criam e removem seus próprios pacientes, consultas, documentos, horários e retornos; preservam o perfil e as formações anteriores.

## Alterações

| Fluxo | Comportamento corrigido | Validação |
|---|---|---|
| Acesso | Cadastro médico consultado por identidade, com cache compartilhado, atualização periódica e erro recuperável. Admin sem cadastro médico não entra como se fosse médico. | Testes de troca de identidade, suspensão e falha de rede |
| Dashboard | Médico pode visualizar sua receita sem receber a permissão administrativa `financeiro.ver`; removida comparação com papel antigo de secretaria. | Navegador |
| Agenda e consultas | Iniciar/concluir/cancelar usa RPC com lock, propriedade, aprovação e transições permitidas. Repetição da mesma transição é idempotente. | API concorrente e interface |
| Integridade da consulta | Removido UPDATE irrestrito concedido ao médico; não pode modificar valor financeiro diretamente. | Tentativa de alteração e conferência do valor persistido |
| Finalização | Removido pagamento simulado. PDFs escolhidos são obrigatórios antes de enviar; documento de dependente usa o paciente atendido. | Finalização e envio de PDF no banco local |
| Documentos | Removida prescrição automática com medicamentos fixos. PDFs anexados na finalização aparecem na lista e podem ser abertos por URL temporária. | API, Storage e interface |
| Visibilidade de anexos | Cada arquivo tem seu próprio controle e registro de autoria/data; não altera os demais anexos da consulta. | Dois anexos com estados distintos; segundo médico sem acesso |
| Retorno gratuito | Tratamento de erro libera o formulário; dados reiniciados a cada consulta; evita duplo envio enquanto salva. | Fluxo após finalizar consulta, com voucher persistido |
| Perfil | Erro de upload não vira sucesso de salvamento; nome obrigatório; abas adaptadas para celular. | Perfil persistido e largura de 390 px |
| Formações | Substituição em transação; entrada inválida preserva o conjunto anterior. Botão permanece disponível ao remover a última formação. | Sucesso, rollback e exclusão de todas |
| Google Calendar | Callback limpa timers e ignora resultados após sair da página; ambiente local não inicia OAuth. | Código e carregamento de rota; provedor externo não acionado |

O link **Ver consulta** em documentos passa a abrir o histórico da consulta selecionada na agenda, respeitando as consultas acessíveis ao médico.

## Evidências e alcance

- [Operações locais](operacoes-local.json): cenários de API, Storage e navegador com dados fictícios. Confere restrição entre dois médicos, transições, edição de perfil, upload, retorno e atomicidade de formações.
- [Rotas locais](rotas-local.json): captura carregamento, erros HTTP e exceções de página. As 24 declarações do inventário incluem um redirecionamento e uma rota parametrizada; a varredura visita 22 rotas sem parâmetros. A tela de aprovação pode redirecionar um médico já aprovado.
- `npm run typecheck` e 54 testes unitários aprovados após as correções de acesso.
- Dois testes do build de produção aprovados, incluindo ausência do cartão Médico local; regressão `npm run admin:test` aprovada.
- [Build](build.txt): saída da compilação. Os avisos de tamanho de chunks/imports mistos devem ser tratados numa etapa de desempenho.

Abrir uma tela sem erros não certifica todas as suas ações. O isolamento testado cobre os pacientes, consultas, anexos e PDFs do cenário; não equivale a revisão integral de todas as políticas do sistema.

## Limites e sequência de produção

1. **Prescrição eletrônica/assinatura:** não implementadas nesta etapa. A função demonstrativa foi removida; o fluxo disponível anexa um PDF preparado pelo profissional. Não se atribui assinatura ou validade clínica ao arquivo automaticamente.
2. **Compartilhamento empresarial:** esta etapa valida a autorização individual e o log no lado médico. A entrega e a revogação de acesso no dashboard Empresa/Storage ainda precisam ser homologadas; o dashboard Empresa consulta outra tabela de documentos. A marcação isolada não comprova que a empresa recebeu o arquivo.
3. **Upload e finalização:** Storage e banco são operações separadas. Existe tentativa de limpeza se o registro falhar; permissões de limpeza e recuperação após falhas parciais ainda exigem ampliação. Não há garantia de transação única abrangendo arquivos e conclusão.
4. **Dependentes:** corrigida a associação do documento ao paciente atendido; ampliar cenário completo de upload e leitura do titular/dependente.
5. **Demais operações:** financeiro/saques, contratos, propostas corporativas, planos, campanhas, notificações e serviços tiveram carregamento verificado; precisam de cenários representativos de gravação e cálculo para declarar homologação integral. Não foram efetuadas operações financeiras reais.
6. **Provedores:** Google, Meta, Feegow, pagamentos e webhooks continuam fora do escopo de integração. Os testes de navegador bloqueiam destinos externos.
7. **Implantação:** revisar/aplicar as migrações novas em homologação remota, ampliar testes por papel e só depois promover para produção. Esta entrega deixa a continuidade versionada; não certifica o produto como 100% pronto para operação clínica.

Migrações desta etapa: `20260928110000_medico_documentos.sql`, `20260929100000_medico_formacoes.sql` e `20260929101000_medico_consultas_writes.sql`. A última substitui a escrita direta do médico em consultas pela RPC; clientes antigos que ainda usem UPDATE direto precisam ser atualizados junto com o frontend.
