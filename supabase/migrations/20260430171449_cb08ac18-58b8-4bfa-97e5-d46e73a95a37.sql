
-- Adiciona valores de status e método compatíveis com a tabela existente
ALTER TYPE public.pagamento_metodo ADD VALUE IF NOT EXISTS 'manual';
ALTER TYPE public.pagamento_metodo ADD VALUE IF NOT EXISTS 'transferencia';
ALTER TYPE public.pagamento_metodo ADD VALUE IF NOT EXISTS 'outro';
ALTER TYPE public.pagamento_status ADD VALUE IF NOT EXISTS 'aprovado';
ALTER TYPE public.pagamento_status ADD VALUE IF NOT EXISTS 'recusado';
ALTER TYPE public.pagamento_status ADD VALUE IF NOT EXISTS 'reembolsado_parcial';
ALTER TYPE public.pagamento_status ADD VALUE IF NOT EXISTS 'expirado';

DO $$ BEGIN CREATE TYPE public.reembolso_status AS ENUM ('solicitado','em_analise','aprovado','recusado','concluido'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.reembolso_tipo AS ENUM ('total','parcial'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.cobranca_link_status AS ENUM ('ativo','pago','cancelado','expirado'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.gateway_tipo AS ENUM ('stripe','pix','asaas','mercadopago','manual','outro'); EXCEPTION WHEN duplicate_object THEN null; END $$;
