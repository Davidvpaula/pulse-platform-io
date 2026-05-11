
# Serviços públicos dinâmicos — plano final (v2)

## 1. Banco (1 migration enxuta)

**`servicos_financeiros`** — 3 colunas novas, todas opcionais, sem default destrutivo:
- `imagem_url text` (nullable)
- `subtitulo text` (nullable, máx 120 chars validado no Admin)
- `destacar_na_home boolean not null default true` (retrocompatível: tudo que já existe entra no carrossel)

**View `servicos_publicos`** — `CREATE OR REPLACE` mantendo TODAS as colunas atuais e adicionando: `imagem_url, subtitulo, icone, destacar_na_home`.

**Bucket `servico-imagens`** (público para SELECT):
- `INSERT/UPDATE/DELETE` em `storage.objects` apenas para `has_role(auth.uid(),'admin')`.
- `SELECT` público (bucket é `public=true`).
- Sem trigger, sem função custom em `storage.*`.

## 2. Admin — uploader premium

Componente novo `src/components/admin/ServicoImagemUploader.tsx`:

- **Drag-and-drop** + click-to-pick (aceita `image/png, image/jpeg, image/webp`).
- **Validação client**: mime + tamanho bruto ≤ 8 MB (rejeita antes de processar).
- **Compressão + resize automáticos** via `<canvas>` puro (sem nova lib):
  - reduz para no máx **1600×1000 px**, mantendo aspect.
  - re-encode para `image/webp` qualidade 0.82 (fallback `image/jpeg` 0.85 se browser não suportar webp).
  - alvo final ≤ ~400 KB.
- **Padronização de proporção**: o uploader **força crop para 16:10** num overlay simples (centraliza + cobre); o canvas final sempre sai 16:10. Garante consistência total no carrossel/hero.
- **Preview instantâneo** com `URL.createObjectURL` antes do upload terminar.
- **Skeleton/loading** durante upload (barra + spinner).
- **Botão remover** (apaga objeto do bucket via `.remove()` se foi recém-enviado, e zera `imagem_url`).
- **Fallback visual** quando `imagem_url` é nulo: gradiente `from-primary/15 to-primary/5` + ícone lucide do campo `icone` (cinza-azulado, centralizado).
- Path no bucket: `${servico.id ?? 'tmp-'+crypto.randomUUID()}/${crypto.randomUUID()}.webp` (regrava com `upsert:true`).
- Salva no payload junto com o resto do drawer; nada bloqueante (tela de edição continua funcionando sem imagem).

**Drawer Admin** (`AdminServicos.tsx`, aba "Publicação"):
- Campo **Subtítulo** (input + contador 120 chars).
- Campo **Imagem do serviço** (uploader acima).
- Toggle **"Destacar na Home (carrossel)"** (default true). Tooltip: "Quando desligado, o serviço continua acessível em /servicos mas não aparece no carrossel da Home".
- Tipo `Servico` e `payload` do `save()` recebem os 3 campos.

## 3. Site público — carrossel da Home

Novo hook `src/hooks/useServicosPublicos.ts`:
- lê `servicos_publicos`, ordena `prioridade asc, nome asc`.
- retorna `{ servicos, loading, error }`.
- aceita filtro `{ destacarNaHomeOnly?: boolean }`.

Novo componente `src/components/public/ServicosCarousel.tsx` (Embla, já instalado):
- **Sem autoplay**. Apenas: swipe/drag, setas laterais, dots.
- Breakpoints: 1 card no mobile, 2 no md, 3 no lg+. `align: "start"`, `containScroll: "trimSnaps"`, `dragFree: false`.
- **Card** (todos com mesma altura via `grid-rows-[auto_1fr_auto]`):
  - Imagem topo `aspect-[16/10]` `object-cover`, `loading="lazy"` (a primeira `fetchpriority="high"`); fallback gradiente+ícone se sem imagem.
  - Chip discreto do tipo (ex.: `Pronto Atendimento` em verde suave; restante em primary/10).
  - Título `font-display`, `line-clamp-2`.
  - Subtítulo `text-sm text-muted-foreground line-clamp-1`.
  - Linha "A partir de R$ X" + duração com `Clock`.
  - CTA "Ver detalhes" (ou "Acessar atendimento" se for o serviço de PA) → `/servicos/:slug` ou `/atendimento-imediato`.
- **Sem descrição completa** no card.
- **Skeleton**: 3 cards placeholder (mesmas dimensões) enquanto `loading`.
- Inserido na **Home** entre "Especialidades" e "Reconhecimentos". Heading discreto + link "Ver todos os serviços" → `/servicos`. Não remove nem altera o card fixo "Pronto Atendimento" do Hero.

## 4. Página individual — `<ServicoHero />`

Novo `src/components/public/ServicoHero.tsx`. Substitui apenas o bloco header (linhas 188–212 de `ServicoDetalhe.tsx`). **Não toca em**: aviso, navegação de dias, calendário, RPC de slots, lógica de reserva.

Layout institucional (não banner):
- Container respirado, `gradient-soft` muito sutil, sem cores berrantes.
- Grid 2 colunas md+: imagem à esquerda `aspect-[16/10] rounded-2xl ring-1 ring-black/5` (não dominante, ocupa 5/12); conteúdo à direita (7/12).
- Conteúdo:
  - Eyebrow pequeno: "Lasmar Telemed" + chip do tipo.
  - Título `font-display` (não gigante — `text-3xl md:text-4xl`).
  - Subtítulo em `text-lg text-muted-foreground`.
  - Descrição completa em `prose-sm` com `line-clamp-6` em mobile e expansível ("Ler mais") se ultrapassar; em md+ sem clamp mas com `max-w-prose` para legibilidade.
  - Faixa info: `R$ X · 15 min` em tabular-nums.
  - 1 CTA primário "Ver horários" — `<a href="#calendario">` que faz scroll suave para o bloco do calendário (id adicionado ao container existente).
- **Skeleton**: bloco esquerdo (imagem) + linhas de texto à direita.
- Sem imagem → mesmo fallback elegante (gradiente + ícone).
- Mobile: imagem em cima, texto embaixo, sem alturas exageradas.

## 5. Grid `/servicos` — refino leve

Em `Servicos.tsx`:
- Adiciona `imagem_url, subtitulo` ao select.
- No card existente, adiciona uma faixa de imagem `aspect-[16/10]` no topo, `rounded-t-2xl`. Resto do card mantém o layout atual.
- Sem imagem → fallback (gradiente + ícone) — mesma identidade dos outros componentes.
- Subtítulo (se existir) substitui o `descricao_publica line-clamp-2` no card.

## 6. Proteção de descrições/textos longos

- Subtítulo: limite 120 chars no Admin (validado), `line-clamp-1` no card / `line-clamp-2` na Hero.
- Descrição pública: sem limite no banco, mas:
  - Card carrossel/grid: nunca aparece (carrossel) ou usa subtítulo/`line-clamp-2` (grid).
  - Hero: `max-w-prose` + clamp em mobile + "Ler mais".
- Títulos longos: `line-clamp-2` em cards.
- `min-h` nos cards para evitar saltos quando títulos têm tamanhos diferentes.

## 7. Skeletons

- Carrossel: `<ServicosCarouselSkeleton />` com 3 cards-fantasma (imagem + 2 linhas + footer).
- Hero serviço: skeleton bloco-imagem + 4 linhas de texto + botão.
- Imagens individuais: blur-up via `bg-muted` placeholder enquanto `<img onLoad>` não dispara.

## 8. Riscos e mitigação (atualizado)

| Risco | Mitigação |
|---|---|
| Imagens pesadas degradando LCP | Compressão+resize obrigatórios (≤400 KB, ≤1600px); `loading=lazy` exceto 1ª; `decoding=async`. |
| Cards desalinhados no carrossel | Crop forçado 16:10 no upload + `aspect-[16/10]` fixo no front. |
| Quebra visual com textos longos | `line-clamp` + `max-w-prose` + "Ler mais" no Hero. |
| Bucket público vazar uploads indevidos | `INSERT/UPDATE/DELETE` restrito a admin via RLS em `storage.objects`. |
| Recriar view quebrar consumidores | `CREATE OR REPLACE` mantendo todas as colunas atuais; só adicionando. |
| Tipos do Supabase desatualizados | Cast `(supabase as any)` nos novos campos, padrão já adotado em `Servicos.tsx`. |
| Nova seção empurrar layout da Home | Inserida entre Especialidades e Reconhecimentos; com `loading` skeleton mantém altura mínima. |
| Crop forçado cortar info importante da imagem | Overlay de crop simples no Admin permite ajustar posição (centro por padrão). |
| Compressão WebP em browser antigo | Fallback automático para JPEG 0.85. |

## 9. UX/UI (recap)

- Sem autoplay. Sem cores berrantes. Sem badges agressivos.
- Tipografia `font-display` já existente; tokens semânticos (`primary`, `muted-foreground`, etc.) — nada de cores hardcoded.
- Sombras suaves (`shadow-card`, `shadow-elegant`), cantos `rounded-2xl/3xl` consistentes.
- Tom "premium clínico", coerente com o resto da Home.

## 10. Arquivos

**Migration**: `supabase/migrations/<ts>_servicos_imagem_subtitulo_destaque.sql`.

**Editados**:
- `src/pages/app/admin/AdminServicos.tsx`
- `src/pages/public/Home.tsx`
- `src/pages/public/ServicoDetalhe.tsx`
- `src/pages/public/Servicos.tsx`

**Criados**:
- `src/hooks/useServicosPublicos.ts`
- `src/components/public/ServicosCarousel.tsx` (+ skeleton interno)
- `src/components/public/ServicoHero.tsx` (+ skeleton interno)
- `src/components/admin/ServicoImagemUploader.tsx`
- `src/lib/imageProcessing.ts` (helper canvas: resize/crop 16:10/encode webp)

**Não tocados**: rotas, auth, permissões, lógica financeira, dashboards internos, calendário/RPCs de slots, fluxo de agendamento, qualquer coisa em `/app/*` fora do drawer de serviços.

---

Pronto para aprovar e iniciar a implementação.
