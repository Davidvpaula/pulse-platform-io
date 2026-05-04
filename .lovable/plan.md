
# Reformulação dos Formulários de Cadastro

## Visão geral

Unificar o cadastro em um formulário completo na página `/auth` (aba "Criar conta"), com campos diferentes dependendo do perfil selecionado (Paciente ou Médico). Para médico, após criar a conta, redirecionar para `/cadastro/medico` apenas para upload de documentos (CRM, RQE, etc.), já que os dados profissionais serão coletados no signup.

---

## 1. Migração de banco de dados

Adicionar colunas faltantes em `profiles` e `medicos`:

```sql
-- profiles: novos campos para paciente
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sexo_biologico text; -- 'feminino','masculino', NULL

-- medicos: novos campos
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE public.medicos ADD COLUMN IF NOT EXISTS sexo_biologico text;
```

## 2. Formulário de cadastro PACIENTE (`Auth.tsx`)

Campos obrigatórios:
- Nome completo
- E-mail
- Senha
- Confirmar senha (validação client-side, senhas precisam bater)
- Telefone (obrigatório agora)
- CPF (com máscara e validação)

Campos opcionais:
- Sexo biológico (Feminino / Masculino / Prefiro nao especificar)
- CEP

Os dados extras (cpf, telefone, cep, sexo_biologico) serão salvos em `user_metadata` no signup e o trigger `handle_new_user` os persiste na tabela `profiles`.

## 3. Formulário de cadastro MEDICO (`Auth.tsx`)

Campos obrigatórios:
- Nome completo
- E-mail
- Senha
- Confirmar senha
- Telefone
- CPF
- CRM (número)
- CEP

Campos opcionais:
- Sexo biológico
- RQE
- Especialidade inicial (pode alterar depois)

Após criar conta, redireciona para `/cadastro/medico` que agora serve apenas para upload de documentos obrigatórios (CRM, doc pessoal). Os dados profissionais (CRM, especialidade, CPF, telefone) já são pré-preenchidos vindos do signup.

## 4. Atualizar `CadastroMedico.tsx`

- Pré-preencher todos os campos que vieram do signup (nome, cpf, crm, telefone, email, especialidade, cep)
- Campos já preenchidos ficam readonly (editáveis no perfil depois)
- Foco fica nos uploads de documentos

## 5. Atualizar trigger `handle_new_user`

- Salvar `cpf`, `cep`, `sexo_biologico` em `profiles` quando vierem no `raw_user_meta_data`
- Para role `medico`: criar registro em `medicos` automaticamente com os dados do signup (nome, email, telefone, cpf, crm, crm_estado, especialidade, cep, rqe, sexo_biologico, documentos: '[]')

## 6. Corrigir redirects

- `Auth.tsx` linha 41 e 91: trocar `/app/paciente/dashboard` por `/app` (SmartRedirect)
- `Auth.tsx` linha 163: trocar `/app/paciente/dashboard` por `/app`
- `MedicoDashboard.tsx` linha 268: trocar `/app/medico/perfil` por `/cadastro/medico`
- `MedicoPerfil.tsx` linhas 58-63: remover mock "Dr. Rafael Lasmar"

## 7. Schema de validação

Paciente:
```typescript
const pacienteSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  senha: z.string().min(8).max(72),
  confirmarSenha: z.string(),
  telefone: z.string().trim().min(10).max(20),
  cpf: cpfSchema(),
  sexo_biologico: z.enum(["feminino","masculino","nao_especificar"]).optional(),
  cep: z.string().trim().max(9).optional(),
}).refine(d => d.senha === d.confirmarSenha, { message: "Senhas não conferem", path: ["confirmarSenha"] });
```

Medico:
```typescript
const medicoSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  senha: z.string().min(8).max(72),
  confirmarSenha: z.string(),
  telefone: z.string().trim().min(10).max(20),
  cpf: cpfSchema(),
  crm: z.string().trim().min(3).max(20),
  cep: z.string().trim().min(8).max(9),
  sexo_biologico: z.enum(["feminino","masculino","nao_especificar"]).optional(),
  rqe: z.string().trim().max(20).optional(),
  especialidade: z.string().optional(),
}).refine(d => d.senha === d.confirmarSenha, { message: "Senhas não conferem", path: ["confirmarSenha"] });
```

## Impactos em outros módulos

- **Trigger `handle_new_user`**: precisa ser atualizado para salvar campos extras e criar registro `medicos` automaticamente
- **`CadastroMedico.tsx`**: simplifica para foco em documentos
- **Admin/médicos**: sem impacto -- o registro aparecerá automaticamente na lista de aprovação
- **Financeiro/Planos/Empresa**: sem impacto

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| Migration SQL | +colunas profiles/medicos, atualizar trigger |
| `src/pages/auth/Auth.tsx` | Reformular form cadastro, campos dinâmicos por role |
| `src/pages/public/CadastroMedico.tsx` | Simplificar para upload-only |
| `src/pages/app/medico/MedicoDashboard.tsx` | Fix link cadastro |
| `src/pages/app/medico/MedicoPerfil.tsx` | Remover mock |
