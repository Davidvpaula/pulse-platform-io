## Objetivo

1. Criar 2 novos tipos de termo: **Termos de uso da plataforma** (versão completa) e **LGPD**.
2. Criar 3 páginas públicas de leitura — `/termos`, `/privacidade`, `/lgpd` — que renderizam o conteúdo ativo do termo correspondente (rodapé já aponta para elas e hoje dão 404).
3. Manter os termos fragmentados existentes (compra de consulta, política de privacidade etc.) intactos para uso nos formulários de aceite.
4. Garantir que conteúdo do termo não tem limite de caracteres (já é `TEXT` no banco e o textarea não tem `maxLength` — apenas confirmar e ampliar a área de edição para conforto).

## Mudanças

### 1. Banco — novo enum + categoria
Migration adicionando dois valores ao enum `termo_tipo`:
- `termos_uso_plataforma` — termo geral completo da plataforma (mostrado em `/termos`).
- `lgpd` — termo de tratamento de dados (mostrado em `/lgpd`).

Sem mudança em RLS, tabelas ou dados existentes.

### 2. `src/lib/termos.ts`
- Adicionar labels:
  - `termos_uso_plataforma: "Termos de uso da plataforma (geral)"`
  - `lgpd: "LGPD — Lei Geral de Proteção de Dados"`
- Incluir os dois novos tipos em `TERMO_CATEGORIAS.paciente` para aparecerem na aba **Paciente** do admin (conforme pedido — LGPD na sessão paciente).

### 3. Páginas públicas de leitura
Criar componente compartilhado `src/pages/public/TermoPublico.tsx` que recebe `tipo: TermoTipo` + título e:
- Busca o termo ativo via `buscarTermoAtivo(tipo)`.
- Renderiza dentro de `PageShell` o conteúdo HTML sanitizado (`prose`).
- Mostra estado vazio amigável ("Termo ainda não publicado") quando não há versão ativa, em vez de 404.

Wrappers exportados na mesma página (ou em `PublicPages.tsx`):
- `TermosPublico` → tipo `termos_uso_plataforma`
- `PrivacidadePublica` → tipo `privacidade` (mesmo termo já usado no aceite do paciente — duas fontes de leitura, uma só fonte de dados)
- `LgpdPublico` → tipo `lgpd`

### 4. Rotas em `src/App.tsx`
Dentro do bloco `<PublicLayout>` adicionar:
```
<Route path="termos" element={<TermosPublico />} />
<Route path="privacidade" element={<PrivacidadePublica />} />
<Route path="lgpd" element={<LgpdPublico />} />
```
Os links existentes no rodapé (`PublicLayout.tsx`) já apontam para esses caminhos — nada muda lá.

### 5. Admin — UX de edição de termos longos
Em `AdminTermosCondicoes.tsx`, apenas aumentar `rows` do Textarea de conteúdo (12 → 20) nos diálogos **Criar** e **Editar**, deixando claro que não há limite. O campo `conteudo` já é `TEXT` ilimitado e nunca teve `maxLength`. **Nenhuma** outra mudança de validação.

## O que NÃO muda
- Política de privacidade (`privacidade`) continua sendo aceita no cadastro do paciente — exatamente como hoje. A página `/privacidade` apenas oferece leitura pública do mesmo conteúdo.
- Termos fragmentados existentes (compra de consulta, planos, cancelamento etc.) ficam intactos.
- Fluxos de aceite, banner de pendentes, RLS, e a página `EmpresaTermos` não são tocados.

## Detalhes técnicos
- Enum extension via `ALTER TYPE ... ADD VALUE IF NOT EXISTS` (idempotente).
- Após a migration, os types da Supabase serão regenerados; `TermoTipo` passa a aceitar os novos valores automaticamente.
- Sanitização do HTML reutiliza `sanitizeHtml` já usado nos diálogos de aceite.
