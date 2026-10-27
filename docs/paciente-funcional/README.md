# Paciente — retomada funcional local

Atualizado em 27/10/2026. Continuidade da [auditoria](../auditoria-dashboards/PACIENTE.md). As alterações e migrações foram executadas no Docker local; nenhum banco remoto foi alterado.

## Acesso e reprodução

Execute `npm run plataforma:local` com o Docker Desktop aberto. Acesse <http://127.0.0.1:8082/auth> e escolha **Entrar como paciente**, ou use [ABRIR-PACIENTE-LOCAL.html](../../ABRIR-PACIENTE-LOCAL.html).

O cartão autentica uma conta fictícia no Supabase local. Exige desenvolvimento e frontend/backend em loopback. As credenciais locais permanecem em arquivos ignorados pelo Git; não devem ser usadas em produção.

- `npm run paciente:test`: banco, Storage e navegador com duas contas distintas; limpeza dos registros criados pelo teste.
- `npm run paciente:routes`: carregamento das rotas sem parâmetros; evidência limitada ao carregamento, não a todos os botões.
- `npm run typecheck`, `npm test`, `npm run build`: verificações do código.
- `npm run admin:test` e `npm run medico:test`: regressão dos fluxos anteriores.

## Fluxos corrigidos

| Área | Comportamento |
|---|---|
| Acesso | Consulta de cadastro e cache vinculados à identidade; suspensão/erro bloqueiam acesso; retry disponível. A confirmação compartilhada também exige paciente ativo. |
| Dashboard | Contagem limitada ao mês atual e total de documentos reais. Consultas financeiras pendentes não desaparecem por ainda não possuírem consulta vinculada. |
| Dependentes | Cadastro e consentimento em uma transação; validação de CPF e nascimento; titularidade protegida; edição e ativação/desativação preservadas. |
| Documentos | Upload para titular ou dependente, filtros reativos e atualização interna da lista. Prescrições e atestados anexados pelo médico têm categorias próprias. URLs temporárias respeitam o Storage. |
| Perfil | Validação de CPF, tratamento de falhas e abas adaptadas para celular. Consulta externa de CEP desativada no ambiente local. |
| Agendamento | Reserva com lock, paciente ativo, médico aprovado, horário futuro e preço configurado. Concorrência entre pacientes testada. |
| Checkout local | Preço calculado no servidor, vínculo do dependente validado, confirmação atômica e idempotente. O navegador não pode inserir ou marcar pagamentos como pagos diretamente. |
| Pagamentos | Configuração ausente/erro não ativa simulação. A simulação depende de habilitação numa tabela privada pelo preparador do Docker local. Nenhuma cobrança real é feita. |
| Cupons | Aplicação/remoção em cobrança ainda sem consulta; uso registrado na confirmação, com lock e limite de utilização. Corrigido incremento duplicado causado por dois triggers. |
| Cancelamentos | RPC valida titular, status e antecedência de quatro horas; libera o slot vinculado. Cancelar consulta não promete estorno financeiro. |
| Retornos | Preserva o dependente da consulta original, exige paciente ativo/médico aprovado e impede reutilização do voucher. |
| Resultados | Páginas de pagamento consultam o registro; URL isolada não prova pagamento ou cancelamento. Erros encerram carregamento e permitem recuperação. |

## Evidências

Validação de 27/10: 62 testes unitários, typecheck, build, regressões Admin/Médico e 12 rotas do Paciente sem erros capturados. Testes do build de produção executados com `PLAYWRIGHT_CHANNEL=chrome` (Chrome instalado); os cartões locais e editor permanecem indisponíveis nesse build.

[Testes de operações](testes-local.json) registram os cenários executados com dados fictícios, incluindo uma jornada pelo navegador de confirmação de agendamento até pagamento simulado aprovado. Também cobrem edição de dependente, envio de PDF para dependente, filtros e persistência de perfil.

[Varredura de rotas](rotas-local.json) registra páginas sem parâmetros. As rotas de checkout e confirmação são exercitadas pelo teste operacional com IDs reais do ambiente local.

## Limites para produção

Esta etapa entrega a base operacional local do Paciente, não uma certificação integral de produção.

1. Stripe, assinatura/renovação de planos, reembolsos reais, Feegow, Meta e outros provedores continuam fora desta etapa. O servidor deve manter a simulação desabilitada; somente o preparador local a habilita.
2. A migração restringe gravações diretas de pagamentos/consultas pelo paciente. Consumidores externos ou fluxos legados precisam usar operações autorizadas no servidor antes de publicar essas migrações remotamente.
3. Assinatura eletrônica e emissão clínica não foram implementadas. PDFs são arquivos fornecidos pelo profissional; não se atribui validade clínica automática.
4. Upload de arquivos e registro no banco continuam sendo operações separadas. Existe compensação em caso de falha, mas recuperação após interrupções e todas as permissões de exclusão de documentos clínicos exigem revisão adicional.
5. Planos empresariais, todas as notificações, entrega de documentos à Empresa e demais jornadas entre dashboards precisam da homologação conjunta das próximas etapas.
6. O ajuste do contador de cupons impede novas duplicações; não recalcula contadores históricos de um banco remoto.
7. As políticas revisadas e os testes negativos não substituem a auditoria integral de RPCs/RLS/Storage antes da publicação. O build também mantém avisos de chunks grandes.

Próxima etapa: dashboard único Colaborador/Secretário, com acesso, blocos e ações definidos pelo Admin, seguido de Empresa e homologação integrada.
