## Diagnóstico

A página **/app/admin/auditoria** mostra o toast vermelho **"Falha no painel — column 'funcao' does not exist"**.

As RPCs `auditoria_eventos` e `auditoria_dashboard` (migration `20260503141020_…sql`, linhas 109 e 163) checam autorização lendo `colaboradores.funcao IN ('admin','supervisor')`, mas a coluna real da tabela `colaboradores` é **`funcao_interna`** — e mesmo assim o único valor existente hoje é `gestor_operacional`. O usuário admin nem está em `colaboradores`, está em `user_roles` via `has_role(uid,'admin')` (padrão usado em todo o resto do projeto).

Resultado: a RPC quebra com erro de coluna inexistente antes de qualquer linha ser retornada.

## Correção (apenas backend, 1 migration)

Recriar as duas funções trocando o gate de autorização para o padrão do projeto:

```sql
IF NOT (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'supervisor'::app_role)
) THEN
  RAISE EXCEPTION 'Acesso negado';
END IF;
```

- `public.auditoria_eventos(...)` — mesmo corpo, só troca o `IF NOT EXISTS (... colaboradores ... funcao ...)` pelo `has_role`.
- `public.auditoria_dashboard(...)` — idem.

Sem mudança de assinatura, sem mudança de retorno, sem mexer em frontend.

## Validação

1. Recarregar `/app/admin/auditoria` — KPIs, "Painel Analítico" e tabela de eventos devem carregar sem o toast de erro.
2. Exportar CSV/PDF do mesmo período para confirmar que `auditoria_eventos` também responde.

## Observação

Se em algum momento existir o perfil "supervisor" como colaborador (e não como `app_role`), avaliamos depois trocar para `has_permission(uid, 'auditoria.ver')`. Por ora, `has_role` resolve o bug e mantém consistência com o resto das RPCs administrativas.
