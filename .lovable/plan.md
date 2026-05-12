
# Plano — Contrato Médico em PDF (modelo enviado pelo Admin)

## Contexto e diagnóstico

Hoje temos 3 camadas de "termos" para o médico, e elas estão misturadas conceitualmente. Proponho separá-las de forma explícita:

| Camada | O que é | Onde vive hoje | Formato |
|---|---|---|---|
| **1. Termo de Adesão (cadastro)** | Texto curto de ciência/aceite inicial no cadastro do médico (autonomia, regularidade, ausência de vínculo, etc.) | `termos_condicoes` tipo `cadastro_medico` (texto rico) | Texto exibido em modal, aceite registrado em `user_terms_acceptance` |
| **2. Contrato Formal** | PDF completo de parceria, assinado pelo médico e reenviado | Hoje gerado dinamicamente via `gerarContratoMedicoPdf.ts` (jsPDF) a partir do texto `contrato_medico` | **PRECISA virar PDF modelo enviado pelo Admin** |
| **3. Termos de extensão** | Gamificação, Planos, Feegow, LGPD, Premium etc. — aceites adicionais que estendem o contrato | `termos_condicoes` em vários `termo_tipo` | Texto + aceite em `user_terms_acceptance` |

A camada 1 e a 3 já funcionam bem (texto + aceite). O problema é a **camada 2**: o admin não consegue anexar o PDF oficial do contrato; o sistema gera um PDF improvisado. É isso que o plano corrige.

## Sugestão de arquitetura (recomendada)

**Decoupling**: tratar "Contrato Formal" como um documento próprio, não mais como um `termo_tipo`. Isso evita poluir a tela de Termos & Condições (que é editor de texto) com upload de PDF.

### Nova entidade: `contratos_modelo`

Tabela dedicada para versões do PDF oficial do contrato, gerenciada pelo Admin.

```text
contratos_modelo
├── id
├── versao              (ex: "v1.0", "v2.0")
├── titulo              ("Contrato de Parceria — Médico Pessoa Física")
├── arquivo_path        (storage: contratos-modelo/<uuid>.pdf)
├── arquivo_nome
├── ativo               (apenas 1 ativo por vez)
├── publicado_em
├── publicado_por
└── observacoes
```

Quando o Admin marca uma nova versão como `ativa`, ela passa a ser o modelo que o médico baixa. Versões antigas continuam acessíveis para auditoria (médicos que já assinaram a v1 não são forçados a re-assinar a v2 — opcional).

### Fluxo final do médico

```text
Cadastro
   └── aceita Termo de Adesão (texto curto)         ← já existe
        └── cria perfil
             └── em /app/medico/perfil → aba "Termos & Contrato"
                  ├── Bloco "Contrato da Plataforma"
                  │    ├── Baixar contrato modelo (PDF do Admin)  ← NOVO
                  │    ├── Assinar fora do sistema
                  │    ├── Anexar PDF assinado                    ← já existe
                  │    └── Status: pendente / em_analise / aprovado / reprovado
                  └── Bloco "Outros aceites" (gamificação, planos, feegow, lgpd)
```

### Fluxo final do admin

```text
/app/admin/medicos/contratos-modelo   ← NOVA tela
   ├── Lista de versões do contrato
   ├── Upload de novo PDF modelo + versão + título
   ├── Marcar como ativo
   └── Histórico

/app/admin/medicos/contratos          ← já existe
   ├── Lista de contratos enviados pelos médicos
   ├── Visualizar PDF assinado
   ├── Aprovar / reprovar com motivo
   └── Mostra qual versão do modelo foi baixada (rastreabilidade)
```

## Mudanças concretas

### Backend
1. **Novo bucket** `contratos-modelo` (privado; admin escreve, médicos leem via signed URL).
2. **Nova tabela** `contratos_modelo` (campos acima) + RLS (admin full, médico select dos ativos).
3. **Coluna nova** em `medicos_contratos`: `modelo_id` (referência à versão baixada — rastreabilidade).
4. **Trigger** garantindo no máximo 1 modelo `ativo=true`.

### Frontend
5. **Nova rota** `/app/admin/medicos/contratos-modelo` (`AdminContratosModelo.tsx`): upload, lista, ativar.
6. **Item de menu** Admin → Cadastros → Médicos → "Contrato modelo" (acima de "Contratos").
7. **Editar** `MedicoContratoPlataforma.tsx`: botão "Baixar contrato" passa a baixar do bucket `contratos-modelo` (modelo ativo). Se nenhum modelo ativo existir, fallback para o `gerarContratoMedicoPdf.ts` atual (mantém retrocompatibilidade).
8. **Editar** `AdminMedicosContratos.tsx`: exibir badge "Modelo v1.0" ao lado de cada contrato enviado.

### O que NÃO muda
- Tela `/app/admin/termos-condicoes` continua só com **texto** (Termo de Adesão, gamificação, planos, feegow, lgpd, etc.).
- `MeusAceites` do médico continua igual.
- `gerarContratoMedicoPdf.ts` permanece como fallback (não removemos).
- Permissões existentes intactas.

## Por que essa separação é melhor

- **Conceitualmente correto**: termo de aceite (texto) ≠ contrato formal (PDF jurídico).
- **Admin não precisa abrir editor de texto rico** para gerenciar contrato — só sobe o PDF que o jurídico produziu.
- **Versionamento limpo**: cada PDF é uma versão imutável; texto dos termos pode evoluir sem afetar contratos já assinados.
- **Rastreabilidade**: sabemos exatamente qual versão o médico baixou e assinou.
- **Não quebra nada**: tudo é aditivo; fallback mantém compatibilidade enquanto o admin não sobe nenhum modelo.

## Alternativa mais simples (se preferir)

Adicionar apenas um campo `arquivo_modelo_path` na tabela `termos_condicoes` para o tipo `contrato_medico`. Mais rápido, menos limpo (mistura PDF dentro do editor de texto), sem versionamento dedicado.

---

**Pergunta antes de implementar**: vai com a **arquitetura recomendada** (`contratos_modelo` dedicada, com versionamento) ou com a **alternativa simples** (campo no `termos_condicoes`)?
