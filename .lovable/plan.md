## Objetivo

Reescrever a Home pública (`/`) com base no design do Figma `1007-3082`, mantendo as rotas, integrações e o header em cápsula creme — apenas ajustando o header para casar visualmente com o novo banner.

## Estrutura visual da nova Home (de cima para baixo)

1. **Banner / Hero** — fundo com foto do casal idoso no sofá (já temos asset similar `image-436` / `945739…png`), com:
   - H1 grande: "Saúde a distância, cuidado próximo." (azul claro + branco, peso bold display)
   - Subtítulo: "Medicina acessível para quem você se importa, com médicos que se importam com você"
   - Ícones flutuantes em bolha azul (saúde / nutrição / bem-estar) + linha curva azul decorativa
   - Card flutuante "Pronto Atendimento" com foto + preço "A partir de R$ 49,90" + botão "Agende agora"
2. **Especialidades** — manter o componente atual (`Especialidades Desktop` no Figma é um carrossel — usar o que já existe na Home).
3. **Stats / Milestones** — faixa azul com 3 blocos centralizados:
   - `+10` Médicos credenciados
   - `+2.600` Pacientes cadastrados
   - `+3.500` Consultas realizadas
   (ícones de estetoscópio / pessoas / agenda; bloco central destacado)
4. **Reconhecimentos e Certificações** — fundo azul escuro:
   - Título + botão secundário "Ver todas"
   - 2 cards brancos: "Somos 5 estrelas no Google!" (logo Google + estrelas + "+200 avaliações") e "Certificado RA1000 Reclame Aqui"
5. **3 cards diferenciais** (layout image-left/right alternado, fundo azul escuro):
   - Atendimento Humanizado
   - Em qualquer lugar
   - A qualquer momento
6. **Bloco Dúvidas** (faixa clara): chamada + botão "Tirar dúvidas" (link `/faq`)
7. **Footer** — manter o existente do `PublicLayout`.

## Ajustes no Header (`PublicLayout.tsx`)

- Manter cápsula creme atual (`#f5efe4`), 8 itens, "Cadastre-se" + "Login".
- Garantir que o hero comece imediatamente atrás do header (já está com `-mt-[76px]`); confirmar que o fundo da seção 1 cobre toda a área atrás da cápsula sem faixa branca visível.

## Arquivos afetados

- **Reescrever**: `src/pages/public/Home.tsx` (única página) — usar componentes locais para Hero, Stats, Reconhecimentos, Diferenciais, Dúvidas. Sem novos arquivos.
- **Ajuste mínimo**: `src/layouts/PublicLayout.tsx` — só se a transição header↔hero precisar de tweak (ex.: remover `border-b` que não existe).
- **Assets**: usar imagens já presentes em `src/assets/` (hero do casal, foto Pronto Atendimento, fotos dos 3 cards). Se faltar uma imagem específica, geramos via `imagegen` no momento da implementação (sinalizo antes).
- **Sem mudanças** em: rotas, backend, auth, edge functions, banco, componentes do `app/`.

## Tokens / cores

- Azul primário e azul-glow já existentes em `index.css`.
- Adicionar (se necessário) tokens: `--hero-cream` (`#f5efe4`) e `--surface-deep-blue` para as faixas de Reconhecimentos / Diferenciais. Tudo em HSL via `index.css` + `tailwind.config.ts`.

## Dados / lógica

- Tudo estático nesta etapa (textos e números do Figma). CTAs apontam para rotas existentes:
  - "Agende agora" → `/agendar`
  - "Tirar dúvidas" → `/faq`
  - Botão "Ver todas" certificações → `/sobre` (placeholder, ajustável depois)

## Reversibilidade

Mudança isolada em **Home.tsx + PublicLayout.tsx**. Se não gostar:

```xml
<lov-actions>
  <lov-open-history>Ver Histórico</lov-open-history>
</lov-actions>
```

Basta reverter pelo botão da minha mensagem de implementação ou pela aba History.

## Fora de escopo

- Páginas internas (`/atendimento-imediato`, `/especialidades` etc.) ficam intocadas.
- Footer atual permanece.
- Carrossel de especialidades reaproveita o componente atual; não vou redesenhá-lo agora.
