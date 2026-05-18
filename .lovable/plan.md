# Corrigir erro ao confirmar aceite do contrato

## Causa raiz
Ao aceitar um termo, o insert em `user_terms_acceptance` dispara o trigger `trg_acceptance_audit`, que grava em `audit_log` com `action = 'aceite_termo'`. Mas a CHECK constraint `audit_log_action_check` só permite: `INSERT`, `UPDATE`, `DELETE`, `FORCE_TRANSITION`, `SNAPSHOT_BYPASS`. Resultado: toda tentativa de aceite falha.

## Correção (1 migration, mínima e cirúrgica)
Recriar a função `trg_acceptance_audit` para:
- usar `action = 'INSERT'` (compatível com a constraint),
- preservar a semântica de "aceite de termo" dentro de `after_data` (`event: 'aceite_termo'`, `termo_id`, `ip`),
- manter `actor_role` correto buscando o perfil real do usuário (paciente/medico/empresa/colaborador/admin) em vez do fixo `'paciente'`.

Sem alterar: RLS, tabela `user_terms_acceptance`, fluxo do médico, rotas, código frontend, nem o trigger de notificação de contrato criado anteriormente.

## Verificação
1. Médico clica em "Confirmar aceite" no modal do Contrato de Cadastro → toast de sucesso, sem erro.
2. Linha aparece em `user_terms_acceptance` e em `audit_log` com `action='INSERT'` e `after_data.event='aceite_termo'`.
3. `useTermsCheck` deixa de pedir aceite na próxima navegação.

## Detalhes técnicos
```sql
CREATE OR REPLACE FUNCTION public.trg_acceptance_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role text;
BEGIN
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM medicos WHERE user_id = NEW.user_id) THEN 'medico'
    WHEN EXISTS (SELECT 1 FROM empresas WHERE user_id = NEW.user_id) THEN 'empresa'
    WHEN EXISTS (SELECT 1 FROM colaboradores WHERE user_id = NEW.user_id) THEN 'colaborador'
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.user_id AND role = 'admin') THEN 'admin'
    ELSE 'paciente'
  END INTO v_role;

  INSERT INTO public.audit_log (
    occurred_at, actor_id, actor_role, table_name, record_id, action, after_data
  ) VALUES (
    now(), NEW.user_id, v_role, 'user_terms_acceptance', NEW.id::text,
    'INSERT',
    jsonb_build_object('event','aceite_termo','termo_id',NEW.termo_id,'ip',NEW.ip_address)
  );
  RETURN NEW;
END $$;
```
