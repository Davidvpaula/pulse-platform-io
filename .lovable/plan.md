## Objetivo

Trazer mais "vida" ao site público (sem mexer nos dashboards) usando a paleta oficial Lasmar Telemed com mais presença de **azul escuro / petrol** em fundos, faixas e botões, mantendo coerência cromática e melhorando UX/UI página por página.

## Escopo

✅ Inclui: Header, Footer, Home, Médicos, Serviços, Detalhe do Serviço, Planos, Empresas, Sobre, FAQ, Cadastro Médico, Atendimento Imediato, Auth, páginas públicas auxiliares (`PublicPages.tsx`).
❌ Não inclui: nada dentro de `/app/*` (paciente, médico, colaborador, admin, empresa).

## Paleta consolidada (já existe no `index.css`)

```
Cor 1  #FDFBF6  off-white     → background
Cor 8  #96DFFF  azul soft     → primary-soft
Cor 4  #198BBC  azul Lasmar   → primary
Cor 6  #0376BC  azul escuro   → secondary
Cor 7  #094BCC  azul royal    → accent
Cor 12 #0088FF  azul vibrante → primary-glow
Cor 10 #0C4B6A  petrol        → "deep" (NOVO token)
Cor 5  #000000  preto         → texto extremo
```

Vou adicionar 2 tokens semânticos novos no `index.css` para compor as faixas escuras sem hardcode:

- `--deep` `200 80% 23%` (#0C4B6A petrol)
- `--deep-foreground` `40 50% 98%`
- `--gradient-deep` `linear-gradient(135deg, hsl(var(--deep)), hsl(var(--primary)))` para faixas hero / CTA / bandas separadoras
- nova sombra `--shadow-deep` para cards sobre fundo escuro

E adiciono no `tailwind.config.ts` as classes `bg-deep`, `text-deep`, `bg-gradient-deep`.

## Princípios de design (aplicados em todas as páginas)

1. **Ritmo de cor alternado**: faixas claras (off-white) ↔ faixas profundas (petrol/azul) ao longo da página, evitando "tudo branco" ou "tudo azul".
2. **CTA primário** sempre azul Lasmar (#198BBC) com hover para azul vibrante (#0088FF) e glow sutil.
3. **CTA secundário** outline branco em fundo escuro / outline petrol em fundo claro.
4. **Cards sobre fundo escuro**: usar `bg-card` com leve borda `border-white/10` e `shadow-deep`.
5. **Acentos pontuais**: badges, ícones e linhas decorativas em `primary-soft (#96DFFF)` para "respiro".
6. **Microanimações**: hover lift suave em cards, underline animado em links de navegação (já existe no header), fade-in em seções via classes utilitárias do Tailwind (já temos `tailwindcss-animate`).

## Checklist página por página

### 1. `index.css` + `tailwind.config.ts` — fundação
- [ ] Adicionar tokens `--deep`, `--deep-foreground`, `--gradient-deep`, `--shadow-deep` (light + dark).
- [ ] Estender `tailwind.config.ts` com `colors.deep`, `backgroundImage.gradient-deep`, `boxShadow.deep`.
- [ ] Garantir variantes consistentes do `Button` (criar variant `deep` para CTAs sobre fundos escuros).

### 2. `PublicLayout.tsx`
- [ ] Footer: trocar `bg-foreground` por `bg-deep` (petrol oficial, não preto-azulado genérico).
- [ ] Adicionar faixa de transição com `bg-gradient-deep` no topo do footer.
- [ ] Header: manter sólido off-white, mas adicionar barra fina superior de 3px com `bg-gradient-primary` para criar identidade visual contínua.

### 3. `Home.tsx`
- [ ] Hero: fundo `bg-gradient-deep` (petrol → azul Lasmar) com pattern sutil de pontos/grade, headline em branco, badge de destaque em `primary-soft`.
- [ ] Seção "Como funciona" (passos): fundo claro com cards elevados.
- [ ] Seção de números/social proof: faixa `bg-deep` com números grandes em `primary-soft` (#96DFFF).
- [ ] Seção CTA final: faixa `bg-gradient-primary` (azul Lasmar → azul vibrante) com botão branco.

### 4. `Servicos.tsx`
- [ ] Já está em fundo azul — refinar usando `bg-gradient-deep` no topo e transição para `bg-background` na seção de boas práticas (ritmo cromático).
- [ ] CTA "Acessar calendário" recebe estilo mais forte (azul vibrante).

### 5. `ServicoDetalhe.tsx`
- [ ] Hero do serviço com faixa petrol; corpo claro; barra lateral de preço/agenda fixa em card branco com sombra elegante.

### 6. `Sobre.tsx`
- [ ] Hero `bg-gradient-deep` com headline grande.
- [ ] Bloco de missão/visão/valores em 3 cards alternando fundo (claro / petrol / claro).
- [ ] Timeline ou bloco "nosso jeito" com acentos `primary-soft`.

### 7. `PublicPages.tsx` (Médicos, Planos, Empresas, FAQ, Termos, Privacidade, LGPD)
- [ ] **Médicos**: hero petrol; grid de médicos em cards brancos com badge azul vibrante em destaques.
- [ ] **Planos**: comparativo de planos — plano "destaque" em `bg-gradient-deep`, demais em branco; preços em azul Lasmar.
- [ ] **Empresas**: hero petrol + faixa CTA em `bg-gradient-primary`.
- [ ] **FAQ**: manter accordions claros, mas adicionar hero petrol e separar a seção de formulários (já criada) com faixa off-white para destacar.
- [ ] **Termos / Privacidade / LGPD**: header da página com faixa petrol curta + corpo claro tipográfico (legibilidade).

### 8. `Auth.tsx`
- [ ] Lateral esquerda em `bg-gradient-deep` com logo branco e tagline; formulário direito permanece claro. Aumenta percepção premium.

### 9. `CadastroMedico.tsx`
- [ ] Hero petrol curto; formulário em card branco com sombra elegante; barra de progresso em azul vibrante.

### 10. `AtendimentoImediato.tsx`
- [ ] Faixa superior `bg-gradient-deep` com badge "24/7" em `primary-soft`; botão CTA em azul vibrante grande e destacado.

## Detalhes técnicos

- Toda cor via tokens semânticos HSL — nada de classes `bg-blue-900` ou hex direto em componentes.
- Reaproveitar componentes shadcn existentes; criar 1 nova variant de `Button` chamada `deep` para CTAs em faixas escuras.
- Adicionar utilitário `.bg-grid-soft` (pattern SVG inline) no `index.css` para texturizar heros sem peso.
- Animações: `motion.div` + `framer-motion` já presente; usar `whileInView` para fade/slide em entradas de seção.
- Garantir contraste AA em todos os textos sobre fundos petrol/azul.
- Mobile: faixas escuras com padding vertical reduzido e tipografia escalada (`clamp()` nos heros).

## Entrega esperada

Site público com identidade visual mais forte, alternância de fundos claro/petrol/azul, CTAs vibrantes consistentes, e melhor hierarquia visual em todas as páginas listadas — sem alterar nenhuma rota `/app/*`.