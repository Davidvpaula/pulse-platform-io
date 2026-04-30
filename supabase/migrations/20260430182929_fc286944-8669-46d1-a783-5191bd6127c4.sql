-- ENUMS
do $$ begin
  create type public.integracao_tipo as enum (
    'feegow','whatsapp','google','pagamentos','ia_provider','assinatura_digital','eventos_sistema'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.integracao_status as enum (
    'nao_configurado','aguardando_configuracao','conectado','erro','simulado','manutencao'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_status as enum ('pending','processing','completed','failed','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.pendencia_status as enum ('aberta','em_analise','resolvida','ignorada');
exception when duplicate_object then null; end $$;

-- integracoes_config
create table if not exists public.integracoes_config (
  id uuid primary key default gen_random_uuid(),
  tipo public.integracao_tipo not null,
  nome text not null,
  descricao text,
  status public.integracao_status not null default 'nao_configurado',
  ambiente text not null default 'sandbox' check (ambiente in ('sandbox','producao','teste')),
  modo_simulado boolean not null default true,
  ativo boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  secrets_keys text[] default '{}'::text[],
  ultimo_teste_at timestamptz,
  ultimo_teste_ok boolean,
  ultima_sincronizacao_at timestamptz,
  ultimo_erro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_integracoes_config_tipo on public.integracoes_config(tipo);
alter table public.integracoes_config enable row level security;
drop policy if exists "admin gerencia integracoes" on public.integracoes_config;
create policy "admin gerencia integracoes" on public.integracoes_config for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "supervisor pode ver integracoes" on public.integracoes_config;
create policy "supervisor pode ver integracoes" on public.integracoes_config for select to authenticated
  using (public.has_permission(auth.uid(),'integracoes.ver'));

-- integracoes_logs
create table if not exists public.integracoes_logs (
  id uuid primary key default gen_random_uuid(),
  integracao public.integracao_tipo not null,
  acao text not null,
  entidade_tipo text,
  entidade_id_interno text,
  entidade_id_externo text,
  payload_envio jsonb,
  payload_resposta jsonb,
  status text not null default 'success' check (status in ('success','error','warning','info')),
  erro text,
  origem text not null default 'sistema' check (origem in ('admin','sistema','automacao','webhook','edge_function','bot','ia')),
  user_id uuid references auth.users(id) on delete set null,
  duracao_ms integer,
  created_at timestamptz not null default now()
);
create index if not exists idx_integracoes_logs_integracao on public.integracoes_logs(integracao, created_at desc);
create index if not exists idx_integracoes_logs_status on public.integracoes_logs(status, created_at desc);
alter table public.integracoes_logs enable row level security;
drop policy if exists "admin ve todos logs" on public.integracoes_logs;
create policy "admin ve todos logs" on public.integracoes_logs for select to authenticated using (public.has_role(auth.uid(),'admin'));
drop policy if exists "supervisor ve logs" on public.integracoes_logs;
create policy "supervisor ve logs" on public.integracoes_logs for select to authenticated using (public.has_permission(auth.uid(),'integracoes.ver_logs'));
drop policy if exists "auth insere logs" on public.integracoes_logs;
create policy "auth insere logs" on public.integracoes_logs for insert to authenticated with check (true);

-- event_queue
create table if not exists public.event_queue (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  entity_type text,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  status public.event_status not null default 'pending',
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  scheduled_for timestamptz not null default now(),
  processed_at timestamptz,
  error_message text,
  origem text default 'sistema',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_event_queue_status on public.event_queue(status, scheduled_for);
create index if not exists idx_event_queue_type on public.event_queue(event_type, created_at desc);
create index if not exists idx_event_queue_entity on public.event_queue(entity_type, entity_id);
alter table public.event_queue enable row level security;
drop policy if exists "admin gerencia eventos" on public.event_queue;
create policy "admin gerencia eventos" on public.event_queue for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "supervisor reprocessa eventos" on public.event_queue;
create policy "supervisor reprocessa eventos" on public.event_queue for update to authenticated
  using (public.has_permission(auth.uid(),'integracoes.reprocessar_eventos'));
drop policy if exists "supervisor ve eventos" on public.event_queue;
create policy "supervisor ve eventos" on public.event_queue for select to authenticated
  using (public.has_permission(auth.uid(),'integracoes.ver'));

-- event_logs
create table if not exists public.event_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.event_queue(id) on delete cascade,
  event_type text not null,
  status text not null,
  message text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_event_logs_event on public.event_logs(event_id);
alter table public.event_logs enable row level security;
drop policy if exists "admin ve event_logs" on public.event_logs;
create policy "admin ve event_logs" on public.event_logs for select to authenticated using (public.has_role(auth.uid(),'admin'));
drop policy if exists "supervisor ve event_logs" on public.event_logs;
create policy "supervisor ve event_logs" on public.event_logs for select to authenticated using (public.has_permission(auth.uid(),'integracoes.ver'));

-- integracoes_pendencias
create table if not exists public.integracoes_pendencias (
  id uuid primary key default gen_random_uuid(),
  integracao public.integracao_tipo not null,
  tipo text not null,
  titulo text not null,
  descricao text,
  entidade_tipo text,
  entidade_id text,
  status public.pendencia_status not null default 'aberta',
  prioridade text not null default 'media' check (prioridade in ('baixa','media','alta','critica')),
  responsavel_id uuid references auth.users(id) on delete set null,
  motivo_resolucao text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolvido_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_pendencias_status on public.integracoes_pendencias(status, prioridade);
create index if not exists idx_pendencias_integracao on public.integracoes_pendencias(integracao);
alter table public.integracoes_pendencias enable row level security;
drop policy if exists "admin gerencia pendencias" on public.integracoes_pendencias;
create policy "admin gerencia pendencias" on public.integracoes_pendencias for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "supervisor ve pendencias" on public.integracoes_pendencias;
create policy "supervisor ve pendencias" on public.integracoes_pendencias for select to authenticated
  using (public.has_permission(auth.uid(),'integracoes.ver_pendencias'));
drop policy if exists "supervisor atualiza pendencias" on public.integracoes_pendencias;
create policy "supervisor atualiza pendencias" on public.integracoes_pendencias for update to authenticated
  using (public.has_permission(auth.uid(),'integracoes.ver_pendencias'));

-- integracoes_status_mapping
create table if not exists public.integracoes_status_mapping (
  id uuid primary key default gen_random_uuid(),
  sistema_origem text not null,
  status_interno text not null,
  status_externo text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sistema_origem, status_interno, status_externo)
);
alter table public.integracoes_status_mapping enable row level security;
drop policy if exists "admin gerencia mapping" on public.integracoes_status_mapping;
create policy "admin gerencia mapping" on public.integracoes_status_mapping for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
drop policy if exists "supervisor ve mapping" on public.integracoes_status_mapping;
create policy "supervisor ve mapping" on public.integracoes_status_mapping for select to authenticated
  using (public.has_permission(auth.uid(),'integracoes.ver'));

-- triggers
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_integracoes_config_touch on public.integracoes_config;
create trigger trg_integracoes_config_touch before update on public.integracoes_config
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_event_queue_touch on public.event_queue;
create trigger trg_event_queue_touch before update on public.event_queue
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_pendencias_touch on public.integracoes_pendencias;
create trigger trg_pendencias_touch before update on public.integracoes_pendencias
  for each row execute function public.touch_updated_at();
drop trigger if exists trg_mapping_touch on public.integracoes_status_mapping;
create trigger trg_mapping_touch before update on public.integracoes_status_mapping
  for each row execute function public.touch_updated_at();

-- RPC dashboard
create or replace function public.integracoes_dashboard()
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if not (public.has_role(auth.uid(),'admin') or public.has_permission(auth.uid(),'integracoes.ver')) then
    raise exception 'sem permissao';
  end if;
  select jsonb_build_object(
    'total_integracoes', (select count(*) from public.integracoes_config),
    'conectadas', (select count(*) from public.integracoes_config where status='conectado'),
    'erros', (select count(*) from public.integracoes_config where status='erro'),
    'simuladas', (select count(*) from public.integracoes_config where status='simulado'),
    'eventos_pendentes', (select count(*) from public.event_queue where status='pending'),
    'eventos_processando', (select count(*) from public.event_queue where status='processing'),
    'eventos_falhos', (select count(*) from public.event_queue where status='failed'),
    'pendencias_abertas', (select count(*) from public.integracoes_pendencias where status='aberta'),
    'pendencias_criticas', (select count(*) from public.integracoes_pendencias where status='aberta' and prioridade='critica'),
    'logs_24h_erro', (select count(*) from public.integracoes_logs where status='error' and created_at > now() - interval '24 hours')
  ) into result;
  return result;
end $$;

-- RPC reprocessar evento
create or replace function public.event_reprocessar(p_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.has_role(auth.uid(),'admin') or public.has_permission(auth.uid(),'integracoes.reprocessar_eventos')) then
    raise exception 'sem permissao';
  end if;
  update public.event_queue
    set status='pending', attempts=0, error_message=null, scheduled_for=now()
    where id=p_event_id;
  insert into public.event_logs(event_id, event_type, status, message)
    select id, event_type, 'requeued', 'Reprocessado manualmente' from public.event_queue where id=p_event_id;
end $$;

-- seed integrações
insert into public.integracoes_config (tipo, nome, descricao, status, modo_simulado) values
  ('feegow','Feegow','Prontuário, pacientes, profissionais e agendamentos','nao_configurado',true),
  ('whatsapp','WhatsApp Business API','Atendimento, automações, bot e IA via Meta','nao_configurado',true),
  ('google','Google Meet / Agenda','Salas dinâmicas e sincronização de agenda','nao_configurado',true),
  ('pagamentos','Pagamentos','Stripe, Pix e pagamento manual','simulado',true),
  ('ia_provider','IA Providers','Lovable AI Gateway (Gemini) e OpenAI futuro','conectado',false),
  ('assinatura_digital','Assinatura Digital','ICP-Brasil ou provider futuro','nao_configurado',true),
  ('eventos_sistema','Eventos do Sistema','Fila interna de eventos e webhooks','conectado',false)
on conflict do nothing;

-- seed mapeamento
insert into public.integracoes_status_mapping (sistema_origem, status_interno, status_externo, descricao) values
  ('feegow','agendada','Marcado não confirmado','Consulta criada aguardando confirmação'),
  ('feegow','confirmada','Marcado confirmado','Paciente confirmou presença'),
  ('feegow','em_andamento','Em atendimento','Consulta iniciada'),
  ('feegow','concluida','Atendido','Consulta finalizada'),
  ('feegow','no_show','Não compareceu','Paciente não compareceu'),
  ('feegow','cancelada','Desmarcado pelo paciente','Cancelamento pelo paciente'),
  ('feegow','cancelada','Desmarcado pelo profissional','Cancelamento pelo médico'),
  ('feegow','aguardando_pagamento','Marcado não confirmado','Aguardando pagamento')
on conflict do nothing;