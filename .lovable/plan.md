## Página "Sobre nós" — `/sobre`

Criar uma página pública institucional baseada no conteúdo oficial de telemedlasmar.com/sobre-nós, adaptada ao design system do projeto (PageShell, semantic tokens, sem cores hardcoded).

### Conteúdo (puxado do site oficial)

1. **Hero** — "O que é a Lasmar TeleMed?"
   > "A Telemed Lasmar é uma plataforma inovadora de telemedicina que conecta pacientes a médicos e profissionais de saúde especializados. Oferecemos consultas online com praticidade, segurança e conforto."

2. **Por que escolher a Lasmar?** — Subtítulo: "Há 2 anos transformando o acesso à saúde no Brasil com 99,9% de aprovação."
   - Parágrafo introdutório sobre tecnologia a serviço do cuidado humano + +4.000 pacientes desde 2024.
   - Grid de 4 cards com diferenciais (cada um com ícone Lucide):
     - ⭐ **Referência em Satisfação** — +600 avaliações 5 estrelas no Google.
     - ⏱️ **Pontualidade de 90%** — assiduidade médica garantida.
     - 🛡️ **Transparência e Ética** — corpo clínico verificado, CRM público conforme CFM.
     - 👨‍⚕️ **Atendimento Humanizado** — atestados, receitas e exames em poucos cliques.

3. **Números** (3 stats em destaque):
   - +10 Médicos credenciados
   - +3.900 Pacientes cadastrados
   - +5.800 Consultas realizadas

4. **Reconhecimentos e Certificações** — selo Reclame Aqui + nota Google (texto curto + 2 badges visuais simples).

5. **CTA final** — botões "Agendar consulta" (`/medicos`) e "Falar conosco" (`/faq`).

Sem depoimentos detalhados (são feed dinâmico do Google no site original — fora do escopo deste passo).

### Implementação

- Novo arquivo: `src/pages/public/Sobre.tsx` usando `PageShell` (mesmo padrão de Empresas/Faq).
- Rota em `src/App.tsx`: `<Route path="/sobre" element={<Sobre />} />` dentro do `PublicLayout`.
- Menu superior em `src/layouts/PublicLayout.tsx`: adicionar `{ to: "/sobre", label: "Sobre" }` (entre "Empresas" e "FAQ", ou logo após Médicos — escolho entre Empresas e FAQ por ordem natural).
- Footer em `PublicLayout.tsx`: adicionar `<FooterLink to="/sobre">Sobre nós</FooterLink>` na coluna "Plataforma".

Sem mudanças de backend.
