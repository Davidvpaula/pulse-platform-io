
ALTER TYPE public.consulta_financeiro_status ADD VALUE IF NOT EXISTS 'estornado';
ALTER TYPE public.fechamento_status ADD VALUE IF NOT EXISTS 'em_processamento';
ALTER TYPE public.fechamento_status ADD VALUE IF NOT EXISTS 'bloqueado';
ALTER TYPE public.fechamento_status ADD VALUE IF NOT EXISTS 'contestado';
