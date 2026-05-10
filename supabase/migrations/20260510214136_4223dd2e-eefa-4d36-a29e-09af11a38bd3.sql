
-- =========================================================
-- E2E SEED USERS (idempotente)
-- Senha fixa para todos: E2eTest!2026
-- =========================================================

DO $$
DECLARE
  v_admin_uid uuid;
  v_medico_uid uuid;
  v_paciente_uid uuid;
  v_colab_uid uuid;
  v_password_hash text := crypt('E2eTest!2026', gen_salt('bf'));
BEGIN
  -- ---------- ADMIN ----------
  SELECT id INTO v_admin_uid FROM auth.users WHERE email = 'e2e_admin@pulse.test';
  IF v_admin_uid IS NULL THEN
    v_admin_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      v_admin_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'e2e_admin@pulse.test', v_password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nome":"E2E Admin"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_admin_uid,
      jsonb_build_object('sub', v_admin_uid::text, 'email', 'e2e_admin@pulse.test', 'email_verified', true),
      'email', v_admin_uid::text, now(), now(), now());
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_admin_uid, 'admin') ON CONFLICT DO NOTHING;

  -- ---------- MÉDICO ----------
  SELECT id INTO v_medico_uid FROM auth.users WHERE email = 'e2e_medico@pulse.test';
  IF v_medico_uid IS NULL THEN
    v_medico_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      v_medico_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'e2e_medico@pulse.test', v_password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nome":"E2E Medico"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_medico_uid,
      jsonb_build_object('sub', v_medico_uid::text, 'email', 'e2e_medico@pulse.test', 'email_verified', true),
      'email', v_medico_uid::text, now(), now(), now());
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_medico_uid, 'medico') ON CONFLICT DO NOTHING;
  INSERT INTO public.medicos (
    user_id, nome, email, crm, crm_estado, especialidade, status
  ) VALUES (
    v_medico_uid, 'E2E Medico', 'e2e_medico@pulse.test',
    'E2E0001', 'SP', 'Clínica Médica', 'aprovado'
  ) ON CONFLICT (user_id) DO NOTHING;

  -- ---------- PACIENTE ----------
  SELECT id INTO v_paciente_uid FROM auth.users WHERE email = 'e2e_paciente@pulse.test';
  IF v_paciente_uid IS NULL THEN
    v_paciente_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      v_paciente_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'e2e_paciente@pulse.test', v_password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nome_completo":"E2E Paciente"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_paciente_uid,
      jsonb_build_object('sub', v_paciente_uid::text, 'email', 'e2e_paciente@pulse.test', 'email_verified', true),
      'email', v_paciente_uid::text, now(), now(), now());
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_paciente_uid, 'paciente') ON CONFLICT DO NOTHING;
  INSERT INTO public.pacientes (user_id, nome_completo)
  VALUES (v_paciente_uid, 'E2E Paciente')
  ON CONFLICT (user_id) DO NOTHING;

  -- ---------- COLABORADOR ----------
  SELECT id INTO v_colab_uid FROM auth.users WHERE email = 'e2e_colaborador@pulse.test';
  IF v_colab_uid IS NULL THEN
    v_colab_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      v_colab_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'e2e_colaborador@pulse.test', v_password_hash, now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"nome_completo":"E2E Colaborador"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_colab_uid,
      jsonb_build_object('sub', v_colab_uid::text, 'email', 'e2e_colaborador@pulse.test', 'email_verified', true),
      'email', v_colab_uid::text, now(), now(), now());
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_colab_uid, 'secretaria') ON CONFLICT DO NOTHING;
  INSERT INTO public.colaboradores (user_id, nome_completo, email, funcao_interna, status_conta, obrigar_troca_senha)
  VALUES (v_colab_uid, 'E2E Colaborador', 'e2e_colaborador@pulse.test', 'secretaria', 'ativo', false)
  ON CONFLICT (user_id) DO NOTHING;
END $$;
