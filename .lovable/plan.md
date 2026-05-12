# Relatório de alinhamento — Termos & Contrato do Médico

Antes de implementar, confirmo o entendimento e mapeio cada peça contra o código atual.

## 1. Princípio (não negociável)

- **Aprovação do cadastro do médico ≠ aprovação do contrato.** São camadas separadas.
- O contrato **NÃO bloqueia** login, dashboard, agenda, consultas, perfil ou pagamentos.
- É uma **camada documental paralela**, puramente informativa/administrativa.
- Tudo que existe hoje continua intocado.

## 2. O que NÃO será alterado

| Item | Status |
|---|---|
| Rota `/app/medico/perfil` | mantida |
| Componente `MeusAceites` | mantido sem alteração |
| `TermsAcceptanceDialog`, `TermosPendentesBanner` | mantidos |
| Tabelas `termos_condicoes` e `user_terms_acceptance` | inalteradas |
| RLS de termos e aceites | inalterada |
| Bucket `medico-docs` e suas policies | inalterado (já permite `<user_id>/...` p/ médico e tudo p/ admin) |
| Enum `termo_tipo.contrato_medico` | já existe, será reutilizado |
| Rota `/app/admin/termos-condicoes` | mantida |
| `MedicosAprovacao` em `/app/admin/medicos` | inalterado (continua sendo aprovação de cadastro) |
| `medicos.status` / `aprovado_em` / `aprovado_por` | inalterados |

## 3. Fase 1 — Médico

### 3.1 Mudança mínima em `MedicoPerfil.tsx`
- Renomear apenas o label da aba: `"Termos"` → `"Termos & Contrato"`.
- Dentro do `TabsContent value="termos"`:
  - **Seção 1**: `<MeusAceites />` (igual hoje).
  - **Seção 2**: `<MedicoContratoPlataforma medicoId={medico.id} />` (novo).

### 3.2 Novo componente `src/components/medico/MedicoContratoPlataforma.tsx`
Funções:
- Mostra status atual (`nao_enviado | pendente | em_analise | aprovado | reprovado`) com badge.
- Botão **"Baixar contrato (PDF)"** → chama `gerarContratoMedicoPdf()`.
- Botão **"Enviar contrato assinado"** → upload PDF para `medico-docs/<user_id>/contratos/<uuid>.pdf`, grava registro em `medicos_contratos` (status = `pendente`).
- Mostra: versão do termo aceito, data de envio, data de revisão, motivo de reprovação (se houver).
- Se status = `reprovado`, libera novo upload (cria nova linha, mantém histórico).
- Se status = `aprovado`, somente leitura + botão de baixar o assinado.

### 3.3 Novo `src/lib/gerarContratoMedicoPdf.ts`
- Reutiliza padrão de `src/lib/gerarFaturaPdf.ts` (jsPDF/pdfmake já no projeto).
- Busca `termos_condicoes` ativo do tipo `contrato_medico` + dados do médico (nome, CRM/UF, especialidade, data atual).
- Renderiza HTML do termo (sanitizado) + bloco de assinatura no final.
- Download direto no navegador (não persiste no Storage).

## 4. Fase 2 — Admin

### 4.1 Nova rota `/app/admin/medicos/contratos`
Componente novo: `src/pages/app/admin/AdminMedicosContratos.tsx`.

Funções:
- Lista médicos com contratos pendentes / em análise / aprovados / reprovados (filtros).
- Para cada linha: nome, CRM, status, versão do termo, data de envio.
- Ações: **Baixar PDF assinado**, **Aprovar**, **Reprovar com motivo**.
- Ao aprovar/reprovar: atualiza `medicos_contratos.status`, grava `revisado_por`, `revisado_em`, `motivo_reprovacao`.
- Notificação opcional via tabela `notificacoes` existente (médico recebe sino).

### 4.2 Menu admin
Em `src/lib/profiles.ts`, transformar a entrada atual em submenu:

```text
Cadastros
 └── Médicos
      ├── Aprovação de cadastro     → /app/admin/medicos          (atual)
      └── Contratos médicos          → /app/admin/medicos/contratos (novo)
 └── Colaboradores                   (atual)
```

> Observação: hoje só existem `Médicos` e `Colaboradores` em "Cadastros". Sub-itens "Especialidades" e "Escalas" mencionados no seu texto **não existem** como rota — não vamos inventá-los agora; ficam fora do escopo. Se quiser, criamos depois.

## 5. Banco de dados (1 migration nova, isolada)

```sql
create type public.medico_contrato_status as enum
  ('nao_enviado','pendente','em_analise','aprovado','reprovado');

create table public.medicos_contratos (
  id uuid primary key default gen_random_uuid(),
  medico_id uuid not null references public.medicos(id) on delete cascade,
  termo_id  uuid not null references public.termos_condicoes(id),
  arquivo_path text not null,        -- ex: <user_id>/contratos/<uuid>.pdf
  arquivo_nome text not null,
  status public.medico_contrato_status not null default 'pendente',
  enviado_em timestamptz not null default now(),
  revisado_em timestamptz,
  revisado_por uuid references auth.users(id),
  motivo_reprovacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_medicos_contratos_medico on public.medicos_contratos(medico_id);
create index idx_medicos_contratos_status on public.medicos_contratos(status);
```

### RLS (apenas na tabela nova)
- `medico_select_own` — médico vê linhas onde `medico_id` corresponde ao seu `medicos.id` (via `medicos.user_id = auth.uid()`).
- `medico_insert_own` — médico insere apenas para si.
- `admin_all` — `has_role(auth.uid(),'admin')` para SELECT/UPDATE/DELETE.
- Bucket `medico-docs`: **nenhuma alteração** (path `<user_id>/contratos/...` já cai na policy existente do bucket).

## 6. Status semântica

- **`nao_enviado`** = não há linha em `medicos_contratos` (estado virtual, calculado no front).
- **`pendente`** = médico enviou, aguardando admin pegar.
- **`em_analise`** = admin abriu / marcou para análise (opcional — pode ser dispensado e ir direto para aprovado/reprovado).
- **`aprovado`** = final positivo.
- **`reprovado`** = médico pode reenviar (cria nova linha; a antiga fica como histórico).

## 7. O que será entregue (etapas)

1. Migration: enum + tabela `medicos_contratos` + RLS.
2. `gerarContratoMedicoPdf.ts`.
3. `MedicoContratoPlataforma.tsx`.
4. Ajuste mínimo em `MedicoPerfil.tsx` (label da aba + render do novo componente).
5. `AdminMedicosContratos.tsx` + rota em `App.tsx`.
6. Submenu em `profiles.ts` (Cadastros → Médicos → submenu).
7. (Opcional) gatilho que insere `notificacoes` para o médico ao aprovar/reprovar.

## 8. Pontos a confirmar antes de começar

1. **Tipo de contrato (versão)**: o termo `contrato_medico` ativo é a referência. Se Admin publicar nova versão, **médicos com contrato já `aprovado` continuam válidos** (não invalidamos automaticamente). OK?
2. **Status `em_analise`**: incluir ou simplificar para só `pendente → aprovado/reprovado`? Sugiro **manter os 5** conforme você pediu.
3. **Notificação** ao médico (sino) na aprovação/reprovação: incluir já na fase 2 ou deixar para depois? Sugiro **incluir** — é barato e usa a infra já pronta.
4. **Permissão admin** para a nova rota: reuso `medicos.aprovar` ou crio `medicos.contratos`? Sugiro **reusar `medicos.aprovar`** para não inflar a matriz agora.

Confirma esses 4 pontos (ou aceita as sugestões) que eu sigo a implementação na ordem da seção 7, sem tocar em nada do que está funcionando.
