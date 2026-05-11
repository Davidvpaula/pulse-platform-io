## Contadores em tempo real no Hero (com fallback mínimo)

### O que muda

1. **Remover** a seção atual `STATS / MILESTONES` (faixa azul gigante com "+10 / +2.600 / +3.500", linhas 199–211) e o subcomponente `Milestone` se não for mais usado.

2. **Adicionar** uma linha compacta de 3 contadores no **próprio Hero**, logo abaixo dos botões "Agendar consulta / Atendimento imediato":
   - Layout horizontal: ícone pequeno + número + rótulo abaixo, separados por divisores verticais sutis (`border-white/20`).
   - Texto branco/translúcido, números em destaque (`text-3xl font-extrabold`), rótulos em `text-xs uppercase tracking-wider text-white/70`.
   - Animação de "count up" suave ao entrar em viewport (de 0 até o valor final, ~1,5s) — implementação leve com `requestAnimationFrame`, sem libs novas.
   - Esconde no mobile só se ficar apertado; tenta manter visível em coluna se necessário.

3. **Itens e fontes de dados** (mínimos garantidos por regra de negócio):
   - **Médicos cadastrados** — `count(*)` de `medicos` ativos (real, sem floor mínimo).
   - **Pacientes cadastrados** — `max(3000, count(*) de pacientes)` — começa em 3.000+.
   - **Consultas realizadas** — `max(5000, count(*) de consultas onde status='concluida')` — começa em 5.000+.

### Backend (Lovable Cloud)

Criar **RPC pública `public_home_stats()`** (`SECURITY DEFINER`, `STABLE`, `search_path = public`) que retorna JSON:
```json
{ "medicos": <int>, "pacientes": <int>, "consultas": <int> }
```
- Lê apenas counts agregados — não expõe linhas.
- Aplica os pisos (3000 / 5000) já no SQL.
- `GRANT EXECUTE ... TO anon, authenticated;`

Atualização **a cada ~60s** via `setInterval` no hook (não precisa Realtime — é só contador agregado e Realtime em count consumiria recursos sem benefício real). Cache em memória para evitar refetch entre re-renders.

### Frontend

- Novo hook `src/hooks/usePublicHomeStats.ts`:
  - `supabase.rpc('public_home_stats')` no mount + intervalo de 60s.
  - Retorna `{ medicos, pacientes, consultas, loading }`.
  - Valores iniciais (antes do fetch): `{ 0, 3000, 5000 }` para evitar pulo visual.
- Novo subcomponente em `Home.tsx`: `HeroCounters` que recebe os valores e renderiza ícone + número (com count-up) + rótulo.
- Ícones: `Stethoscope` / `Users` / `CalendarDays` (mesmos atuais).

### Fora do escopo
- Não mexer nos demais blocos do Home (Especialidades, Reconhecimentos, Diferenciais, Dúvidas).
- Não criar tabelas novas, não criar edge function (RPC já basta).

### Validação
- `/` mostra Hero com 3 contadores animando do início até o valor real.
- Faixa azul gigante de stats sumiu.
- Trocar manualmente o status de uma consulta para `concluida` aumenta o número após ~60s (ou refresh).
- Lighthouse/console sem erros, sem queries pesadas — RPC retorna em <100ms.
