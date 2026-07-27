-- =====================================================================
-- HR Barber Shop - Schema completo do Supabase
--
-- Copie TODO este arquivo e execute de uma vez no SQL Editor de um
-- projeto novo do Supabase. O script e idempotente: pode ser executado
-- novamente sem quebrar nada.
--
-- Convencoes adotadas:
--   * Toda tabela de dados tem `owner_id` -> auth.users(id).
--   * Row Level Security ligada em todas as tabelas, com politicas
--     separadas para SELECT / INSERT / UPDATE / DELETE.
--   * Valores monetarios em numeric(10,2) (nunca float).
--   * Datas/horarios completos em timestamptz; a agenda usa
--     `date` + `time` porque a barbearia opera em um unico fuso
--     (America/Sao_Paulo) e o horario de parede e o que importa.
--   * Os status ficam em portugues, iguais aos do aplicativo:
--       agendado | confirmado | em_atendimento | concluido | cancelado
--     (equivalentes a scheduled | confirmed | in_progress | completed
--      | cancelled). A interface exibe: Agendado, Confirmado,
--      Em atendimento, Concluido, Cancelado.
-- =====================================================================

create extension if not exists "pgcrypto";
-- btree_gist permite combinar `=` (uuid) com `&&` (range) na constraint
-- de exclusao que impede dois atendimentos simultaneos do mesmo barbeiro.
create extension if not exists "btree_gist";

-- ---------------------------------------------------------------------
-- Funcoes auxiliares
-- ---------------------------------------------------------------------

-- Mantem `updated_at` sempre atualizado.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Converte (data, hora) do fuso da barbearia em timestamptz.
--
-- Marcada como IMMUTABLE de proposito: `at time zone` e apenas STABLE no
-- Postgres, mas colunas geradas e indices exigem IMMUTABLE. O Brasil nao
-- adota horario de verao desde 2019, entao o deslocamento de
-- America/Sao_Paulo e fixo (-03) e a conversao e deterministica.
create or replace function public.shop_timestamp(d date, t time)
returns timestamptz
language sql
immutable
parallel safe
as $$
  select (d + t) at time zone 'America/Sao_Paulo';
$$;

-- =====================================================================
-- PROFILES (1:1 com auth.users)
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'HR Barber Shop',
  email text,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- BARBERS
-- =====================================================================
create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  phone text not null default '',
  specialty text not null default '',
  active boolean not null default true,
  color text not null default '#c9a24b',
  work_start time not null default '09:00',
  work_end time not null default '19:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists barbers_owner_idx on public.barbers(owner_id);
create index if not exists barbers_owner_active_idx on public.barbers(owner_id, active);

-- =====================================================================
-- SERVICES
-- =====================================================================
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  description text,
  price numeric(10, 2) not null default 0 check (price >= 0),
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists services_owner_idx on public.services(owner_id);
create index if not exists services_owner_active_idx on public.services(owner_id, active);

-- =====================================================================
-- CLIENTS
-- =====================================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  whatsapp text not null default '',
  email text,
  birth_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clients_owner_idx on public.clients(owner_id);
create index if not exists clients_owner_name_idx on public.clients(owner_id, name);

-- =====================================================================
-- RECURRING_GROUPS (series de agendamento recorrente)
-- =====================================================================
create table if not exists public.recurring_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  barber_id uuid references public.barbers(id) on delete set null,
  frequency text not null default 'weekly'
    check (frequency in ('weekly', 'biweekly', 'monthly', 'custom')),
  interval_weeks integer not null default 1 check (interval_weeks > 0),
  selected_weekdays text[] not null default '{}',
  start_date date not null,
  end_date date,
  occurrences_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists recurring_groups_owner_idx on public.recurring_groups(owner_id);

-- =====================================================================
-- APPOINTMENTS
--
-- `date` + `start_time` + `end_time` sao a fonte da verdade usada pela
-- agenda. `starts_at` / `ends_at` sao colunas geradas em timestamptz,
-- usadas pela constraint que impede sobreposicao de horarios.
-- =====================================================================
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  barber_id uuid references public.barbers(id) on delete set null,
  recurring_group_id uuid references public.recurring_groups(id) on delete set null,
  -- Copias do nome no momento do agendamento: o historico continua
  -- legivel mesmo se o cadastro for alterado ou removido.
  client_name text not null check (length(btrim(client_name)) > 0),
  client_whatsapp text not null default '',
  service_name text not null default '',
  barber_name text not null default '',
  date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  price numeric(10, 2) not null default 0 check (price >= 0),
  status text not null default 'agendado'
    check (status in ('agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado')),
  payment_method text
    check (payment_method is null or payment_method in ('dinheiro', 'pix', 'debito', 'credito', 'outro')),
  notes text,
  is_recurring boolean not null default false,
  starts_at timestamptz generated always as (public.shop_timestamp(date, start_time)) stored,
  ends_at timestamptz generated always as (public.shop_timestamp(date, end_time)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_order check (end_time > start_time)
);
create index if not exists appointments_owner_idx on public.appointments(owner_id);
create index if not exists appointments_owner_date_idx on public.appointments(owner_id, date);
create index if not exists appointments_barber_date_idx on public.appointments(barber_id, date);
create index if not exists appointments_client_idx on public.appointments(client_id);
create index if not exists appointments_group_idx on public.appointments(recurring_group_id);

-- ---------------------------------------------------------------------
-- CONFLITO DE HORARIO (protecao no banco)
--
-- Impede que o mesmo barbeiro tenha dois atendimentos sobrepostos, mesmo
-- que dois usuarios tentem gravar no mesmo instante (condicao de corrida).
-- Agendamentos cancelados nao ocupam a agenda. O range e [inicio, fim):
-- um atendimento que termina 10:00 nao conflita com outro que comeca 10:00.
-- Violacao retorna SQLSTATE 23P01, traduzido pelo app para
-- "Este barbeiro ja possui um atendimento nesse horario."
-- ---------------------------------------------------------------------
alter table public.appointments
  drop constraint if exists appointments_no_barber_overlap;
alter table public.appointments
  add constraint appointments_no_barber_overlap
  exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (barber_id is not null and status <> 'cancelado');

-- =====================================================================
-- FINANCIAL_ENTRIES (lancamentos manuais de receita/despesa)
--
-- O faturamento dos atendimentos vem de `appointments` com status
-- 'concluido'. Esta tabela guarda o que nao passa pela agenda:
-- venda de produtos, aluguel, produtos de barbearia, etc.
-- =====================================================================
create table if not exists public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  category text not null default 'outros',
  description text not null default '',
  amount numeric(10, 2) not null check (amount >= 0),
  payment_method text
    check (payment_method is null or payment_method in ('dinheiro', 'pix', 'debito', 'credito', 'outro')),
  occurred_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists financial_entries_owner_idx on public.financial_entries(owner_id);
create index if not exists financial_entries_owner_date_idx
  on public.financial_entries(owner_id, occurred_at);
create index if not exists financial_entries_appointment_idx
  on public.financial_entries(appointment_id);

-- =====================================================================
-- SETTINGS (1 linha por usuario)
-- =====================================================================
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null default 'HR Barber Shop',
  owner_name text not null default '',
  whatsapp text not null default '',
  address text not null default '',
  interval_minutes integer not null default 10 check (interval_minutes >= 0),
  -- O app tem um unico tema (claro). 'dark'/'gold' seguem aceitos para nao
  -- invalidar linhas gravadas por versoes anteriores.
  theme text not null default 'light' check (theme in ('light', 'dark', 'gold')),
  currency text not null default 'BRL',
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- WORKING_HOURS (horario de funcionamento da barbearia, por dia da semana)
--
-- Os horarios sao da barbearia (nao por barbeiro): cada barbeiro tem o
-- proprio expediente em `barbers.work_start` / `barbers.work_end`.
-- =====================================================================
create table if not exists public.working_hours (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6), -- 0 = domingo
  is_open boolean not null default true,
  start_time time not null default '09:00',
  end_time time not null default '19:00',
  break_start time,
  break_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, weekday)
);
create index if not exists working_hours_owner_idx on public.working_hours(owner_id);

-- =====================================================================
-- TRIGGERS DE updated_at
-- =====================================================================
do $$
declare
  t text;
  tables text[] := array[
    'profiles', 'barbers', 'services', 'clients', 'recurring_groups',
    'appointments', 'financial_entries', 'settings', 'working_hours'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end $$;

-- =====================================================================
-- ROW LEVEL SECURITY
--
-- Sem politicas para `anon`: apenas usuarios autenticados enxergam dados,
-- e cada um enxerga somente os proprios registros.
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.barbers           enable row level security;
alter table public.services          enable row level security;
alter table public.clients           enable row level security;
alter table public.recurring_groups  enable row level security;
alter table public.appointments      enable row level security;
alter table public.financial_entries enable row level security;
alter table public.settings          enable row level security;
alter table public.working_hours     enable row level security;

-- PROFILES: a chave e o proprio id do usuario.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles
  for delete to authenticated using (auth.uid() = id);

-- Demais tabelas: auth.uid() = owner_id, uma politica por operacao.
do $$
declare
  t text;
  tables text[] := array[
    'barbers', 'services', 'clients', 'recurring_groups',
    'appointments', 'financial_entries', 'settings', 'working_hours'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "%1$s_select" on public.%1$I;', t);
    execute format(
      'create policy "%1$s_select" on public.%1$I
         for select to authenticated using (auth.uid() = owner_id);', t);

    execute format('drop policy if exists "%1$s_insert" on public.%1$I;', t);
    execute format(
      'create policy "%1$s_insert" on public.%1$I
         for insert to authenticated with check (auth.uid() = owner_id);', t);

    execute format('drop policy if exists "%1$s_update" on public.%1$I;', t);
    execute format(
      'create policy "%1$s_update" on public.%1$I
         for update to authenticated using (auth.uid() = owner_id)
         with check (auth.uid() = owner_id);', t);

    execute format('drop policy if exists "%1$s_delete" on public.%1$I;', t);
    execute format(
      'create policy "%1$s_delete" on public.%1$I
         for delete to authenticated using (auth.uid() = owner_id);', t);
  end loop;
end $$;

-- =====================================================================
-- NOVO USUARIO: cria profile, settings e horario de funcionamento padrao
--
-- Nao cadastra servicos/barbeiros de exemplo: use supabase/seed.sql se
-- quiser dados de teste.
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), 'HR Barber Shop'),
    new.email
  )
  on conflict (id) do nothing;

  insert into public.settings (owner_id, business_name, owner_name)
  values (
    new.id,
    'HR Barber Shop',
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), '')
  )
  on conflict (owner_id) do nothing;

  -- Segunda a sexta 09-19, sabado 08-17, domingo fechado.
  insert into public.working_hours (owner_id, weekday, is_open, start_time, end_time)
  values
    (new.id, 0, false, '09:00', '19:00'),
    (new.id, 1, true,  '09:00', '19:00'),
    (new.id, 2, true,  '09:00', '19:00'),
    (new.id, 3, true,  '09:00', '19:00'),
    (new.id, 4, true,  '09:00', '19:00'),
    (new.id, 5, true,  '09:00', '19:00'),
    (new.id, 6, true,  '08:00', '17:00')
  on conflict (owner_id, weekday) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- REALTIME
--
-- Publica as tabelas que a interface acompanha ao vivo. `replica identity
-- full` faz o Supabase enviar a linha completa tambem em UPDATE/DELETE.
-- =====================================================================
alter table public.appointments      replica identity full;
alter table public.financial_entries replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'financial_entries'
  ) then
    alter publication supabase_realtime add table public.financial_entries;
  end if;
end $$;
