
# Reestruturar Área "Meu Plano" do Paciente

## Visao geral

Refatorar `/app/paciente/plano` para mostrar **todas** as assinaturas do paciente organizadas em 3 abas, com fluxo completo de gestao (visualizar, cancelar, consumir creditos, trocar plano).

---

## Estrutura

Rota unica: `/app/paciente/plano` com `Tabs` (shadcn).

| Aba | Filtro | CTA vazio |
|-----|--------|-----------|
| Plataforma | `planos.nivel = 'admin'` | "Ver planos disponiveis" -> `/planos` |
| Personalizado | `planos.nivel IN ('medico', 'paciente_custom')` | "Montar meu plano" -> `/app/paciente/montar-plano` |
| Empresa | `planos.empresa_id IS NOT NULL` | "Em breve" (placeholder) |

Cada aba mostra badge com contagem de planos ativos.

---

## Mudancas tecnicas

### 1. Refatorar `PacientePlano.tsx` (pagina principal)

- Substituir a query `limit(1)` por busca de **todas** assinaturas do paciente com join `planos(*)`
- Agrupar assinaturas por tipo (plataforma / personalizado / empresa)
- Renderizar componente `Tabs` com 3 abas
- Suporte a query param `?tab=personalizado` para deep-linking
- Manter loading skeleton e estado vazio global (sem nenhum plano)

### 2. Criar `PlanoCard.tsx` (componente reutilizavel)

Extrair do codigo atual o card de plano + beneficios + pagamento + cancelamento.
Props: `assinatura`, `plano`, `beneficios`, `onCancelado`.

Cada card mostra:
- Nome e descricao do plano
- Status (badge colorido)
- Categoria, ciclo, inicio, fim de acesso
- Botoes: carteirinha (em breve), contrato (em breve), historico financeiro
- Beneficios inclusos com icones
- Info de pagamento (mensalidade, proxima cobranca, forma)
- Botao "Cancelar" (sempre ativo, dialog com motivo obrigatorio)
- Para planos personalizados: mostrar medicos vinculados e creditos restantes (reutilizar logica de `MeusProfissionaisPlano.tsx`)

### 3. Criar `PlanoPlataformaTab.tsx`

- Filtra assinaturas onde `plano.nivel === 'admin'`
- Lista cada uma como `PlanoCard`
- Se vazio: CTA para `/planos`
- Mostra secao "Planos disponiveis" (planos publicados no site que o paciente ainda nao assinou)

### 4. Criar `PlanoPersonalizadoTab.tsx`

- Filtra assinaturas onde `plano.nivel IN ('medico', 'paciente_custom')`
- Lista cada uma como `PlanoCard`
- Dentro de cada card: sub-secao "Meus Profissionais" com medicos do plano, creditos restantes/totais, botao "Agendar" -> `/medicos/:slug`
- Se vazio: CTA para `/app/paciente/montar-plano`

### 5. Criar `PlanoEmpresaTab.tsx`

- Filtra assinaturas onde `plano.empresa_id IS NOT NULL`
- Lista cada uma como `PlanoCard` (quando houver)
- Se vazio: mensagem "Em breve - planos empresariais"
- Estrutura pronta para quando a feature empresa for implementada

### 6. Mover helpers para arquivo compartilhado

Extrair `Info`, `Row`, `KpiCard`, `ResumoFinanceiro`, `PlanosDisponiveisSection`, `ConfirmacaoDialog` e constantes de status para `src/components/paciente/plano-helpers.tsx` para reutilizacao entre abas.

---

## Arquivos

| Arquivo | Acao |
|---------|------|
| `src/pages/app/paciente/PacientePlano.tsx` | Reescrever (Tabs + carregamento unificado) |
| `src/components/paciente/PlanoCard.tsx` | Criar |
| `src/components/paciente/PlanoPlataformaTab.tsx` | Criar |
| `src/components/paciente/PlanoPersonalizadoTab.tsx` | Criar |
| `src/components/paciente/PlanoEmpresaTab.tsx` | Criar |
| `src/components/paciente/plano-helpers.tsx` | Criar (helpers extraidos) |

Sem migracoes necessarias. A tabela `planos` ja possui `nivel` e `empresa_id`. A tabela `assinaturas` ja suporta multiplas por paciente.
