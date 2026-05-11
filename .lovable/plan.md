## Padronizar raio dos botões para 10px (global)

Aplicar `border-radius: 10px` em todos os botões da plataforma, conforme as imagens de referência (Cadastre-se, Agende agora!, Conheça a Lasmar).

### Mudanças

**1. `src/components/ui/button.tsx` (componente base)**
- Trocar `rounded-md` por `rounded-[10px]` na classe base do `cva`
- Trocar `rounded-md` por `rounded-[10px]` nas variantes `size.sm` e `size.lg`
- Resultado: todo `<Button />` da plataforma (paciente, médico, admin, colaborador, empresa, público) passa a ter 10px de raio por padrão

**2. Sobrescritas pontuais com `rounded-full` em CTAs**
Substituir por `rounded-[10px]` apenas nos botões/CTAs (não em avatares, badges, switches, sliders, progress, carousel, etc.):
- `src/layouts/PublicLayout.tsx` — botões "Entrar" e "Cadastre-se" do header + drawer mobile
- `src/pages/public/Home.tsx` — CTAs "Agende agora!", "Conheça a Lasmar", "Tirar dúvidas", etc.
- `src/pages/public/PublicPages.tsx` — CTAs públicos
- `src/pages/public/CadastroMedico.tsx` — botão de envio

### Fora de escopo (mantém `rounded-full`)
Elementos não-botão que dependem do círculo perfeito:
- `avatar.tsx`, `badge.tsx`, `progress.tsx`, `slider.tsx`, `radio-group.tsx`, `switch.tsx`, `scroll-area.tsx`, `drawer.tsx`, `carousel.tsx`
- Indicadores de status, dots de timeline, sino de notificações (NotificationsBell), FAB do WhatsApp flutuante (formato circular intencional)
- Badges/pills de status (`StatusBadge`, etc.)

### Validação
- Abrir Home (`/`) e conferir Cadastre-se, Agende agora, Conheça a Lasmar com cantos 10px
- Abrir uma rota interna (ex.: `/app/paciente`) e conferir botões padrão
- Confirmar que avatares e badges continuam circulares
