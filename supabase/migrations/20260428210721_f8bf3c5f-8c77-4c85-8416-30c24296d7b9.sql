-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.app_role AS ENUM ('paciente', 'medico', 'secretaria', 'empresa', 'admin');
CREATE TYPE public.medico_status AS ENUM ('pendente', 'em_analise', 'aprovado', 'reprovado');

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  telefone TEXT,
  cpf TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================
-- USER ROLES (separada — segurança)
-- =========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função security definer (evita recursão em RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================================
-- MEDICOS
-- =========================================
CREATE TABLE public.medicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  crm TEXT NOT NULL,
  crm_estado TEXT NOT NULL,
  especialidade TEXT NOT NULL,
  rqe TEXT,
  bio TEXT,
  documentos JSONB NOT NULL DEFAULT '[]'::jsonb,
  status public.medico_status NOT NULL DEFAULT 'pendente',
  motivo_reprovacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;

-- =========================================
-- AUDITORIA MEDICOS
-- =========================================
CREATE TABLE public.medicos_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id UUID NOT NULL REFERENCES public.medicos(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  status_anterior public.medico_status,
  status_novo public.medico_status,
  motivo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medicos_auditoria ENABLE ROW LEVEL SECURITY;

-- =========================================
-- TRIGGER updated_at
-- =========================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER medicos_updated_at BEFORE UPDATE ON public.medicos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================
-- TRIGGER: criar profile + role automaticamente no signup
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  -- Cria profile
  INSERT INTO public.profiles (id, nome, email, telefone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone'
  );

  -- Atribui role (default = paciente)
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'paciente');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================
-- RLS POLICIES — PROFILES
-- =========================================
CREATE POLICY "Users see own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins see all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- =========================================
-- RLS POLICIES — USER_ROLES
-- =========================================
CREATE POLICY "Users see own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins see all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- RLS POLICIES — MEDICOS
-- =========================================
CREATE POLICY "Medico sees own record" ON public.medicos
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin/secretaria see all medicos" ON public.medicos
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'secretaria')
  );
CREATE POLICY "Medico inserts own record" ON public.medicos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Medico updates own pending record" ON public.medicos
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('pendente','reprovado'));
CREATE POLICY "Admin manages all medicos" ON public.medicos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- RLS POLICIES — AUDITORIA
-- =========================================
CREATE POLICY "Admins see auditoria" ON public.medicos_auditoria
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Medico sees own auditoria" ON public.medicos_auditoria
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.medicos m WHERE m.id = medico_id AND m.user_id = auth.uid())
  );
CREATE POLICY "Admins insert auditoria" ON public.medicos_auditoria
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));