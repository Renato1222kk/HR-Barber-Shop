-- =====================================================================
-- HR Barber Shop — Schema completo do Supabase
-- Copie e cole ESTE ARQUIVO INTEIRO no SQL Editor de um projeto novo e execute.
-- Cria tabelas, índices, triggers, RLS, proteção de conflito e Realtime.
-- Fuso padrão do aplicativo: America/Sao_Paulo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensões
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists btree_gist;  -- exclusion constraint (uuid + range)

-- ---------------------------------------------------------------------
-- Função utilitária: mantém updated_at sempre atualizado
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- PROFILES (1:1 com auth.users)
-- =====================================================================
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  email      text,
  role       text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria automaticamente o profile quando um usuário é criado no Auth.
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
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- BARBERS
-- =====================================================================
create table if not exists public.barbers (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  phone      text not null default '',
  specialty  text not null default '',
  active     boolean not null default true,
  work_start time not null default '09:00',
  work_end   time not null default '19:00',
  color      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists barbers_owner_idx on public.barbers(owner_id);

alter table public.barbers enable row level security;
drop policy if exists "barbers_select_own" on public.barbers;
drop policy if exists "barbers_insert_own" on public.barbers;
drop policy if exists "barbers_update_own" on public.barbers;
drop policy if exists "barbers_delete_own" on public.barbers;
create policy "barbers_select_own" on public.barbers for select using (auth.uid() = owner_id);
create policy "barbers_insert_own" on public.barbers for insert with check (auth.uid() = owner_id);
create policy "barbers_update_own" on public.barbers for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "barbers_delete_own" on public.barbers for delete using (auth.uid() = owner_id);

drop trigger if exists trg_barbers_updated_at on public.barbers;
create trigger trg_barbers_updated_at before update on public.barbers
  for each row execute function public.set_updated_at();

-- =====================================================================
-- SERVICES
-- =====================================================================
create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name             text not null,
  description      text,
  price            numeric(10,2) not null default 0,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists services_owner_idx on public.services(owner_id);

alter table public.services enable row level security;
drop policy if exists "services_select_own" on public.services;
drop policy if exists "services_insert_own" on public.services;
drop policy if exists "services_update_own" on public.services;
drop policy if exists "services_delete_own" on public.services;
create policy "services_select_own" on public.services for select using (auth.uid() = owner_id);
create policy "services_insert_own" on public.services for insert with check (auth.uid() = owner_id);
create policy "services_update_own" on public.services for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "services_delete_own" on public.services for delete using (auth.uid() = owner_id);

drop trigger if exists trg_services_updated_at on public.services;
create trigger trg_services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

-- =====================================================================
-- CLIENTS
-- =====================================================================
create table if not exists public.clients (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  whatsapp   text not null default '',
  email      text,
  birth_date date,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_owner_idx on public.clients(owner_id);

alter table public.clients enable row level security;
drop policy if exists "clients_select_own" on public.clients;
drop policy if exists "clients_insert_own" on public.clients;
drop policy if exists "clients_update_own" on public.clients;
drop policy if exists "clients_delete_own" on public.clients;
create policy "clients_select_own" on public.clients for select using (auth.uid() = owner_id);
create policy "clients_insert_own" on public.clients for insert with check (auth.uid() = owner_id);
create policy "clients_update_own" on public.clients for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "clients_delete_own" on public.clients for delete using (auth.uid() = owner_id);

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

-- =====================================================================
-- RECURRING_GROUPS (séries de agendamentos)
-- =====================================================================
create table if not exists public.recurring_groups (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id         uuid references public.clients(id) on delete set null,
  service_id        uuid references public.services(id) on delete set null,
  barber_id         uuid references public.barbers(id) on delete set null,
  frequency         text not null,
  interval_weeks    integer not null default 1,
  selected_weekdays text[] not null default '{}',
  start_date        date not null,
  end_date          date,
  occurrences_count integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists recurring_groups_owner_idx on public.recurring_groups(owner_id);

alter table public.recurring_groups enable row level security;
drop policy if exists "recurring_groups_select_own" on public.recurring_groups;
drop policy if exists "recurring_groups_insert_own" on public.recurring_groups;
drop policy if exists "recurring_groups_update_own" on public.recurring_groups;
drop policy if exists "recurring_groups_delete_own" on public.recurring_groups;
create policy "recurring_groups_select_own" on public.recurring_groups for select using (auth.uid() = owner_id);
create policy "recurring_groups_insert_own" on public.recurring_groups for insert with check (auth.uid() = owner_id);
create policy "recurring_groups_update_own" on public.recurring_groups for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "recurring_groups_delete_own" on public.recurring_groups for delete using (auth.uid() = owner_id);

drop trigger if exists trg_recurring_groups_updated_at on public.recurring_groups;
create trigger trg_recurring_groups_updated_at before update on public.recurring_groups
  for each row execute function public.set_updated_at();

-- =====================================================================
-- APPOINTMENTS
-- Guarda também os campos denormalizados (nomes) usados pela UI/relatórios.
-- starts_at/ends_at são GERADOS a partir de date + horário no fuso local,
-- e alimentam a proteção de conflito no banco.
-- =====================================================================
create table if not exists public.appointments (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id           uuid references public.clients(id) on delete set null,
  service_id          uuid references public.services(id) on delete set null,
  barber_id           uuid references public.barbers(id) on delete set null,
  client_name         text not null,
  client_whatsapp     text not null default '',
  service_name        text not null default '',
  barber_name         text not null default '',
  date                date not null,
  start_time          time not null,
  end_time            time not null,
  duration_minutes    integer not null default 30,
  price               numeric(10,2) not null default 0,
  status              text not null default 'agendado'
                        check (status in ('agendado','confirmado','em_atendimento','concluido','cancelado')),
  payment_method      text,
  notes               text,
  recurring_group_id  uuid references public.recurring_groups(id) on delete set null,
  is_recurring        boolean not null default false,
  starts_at timestamptz generated always as ((date + start_time) at time zone 'America/Sao_Paulo') stored,
  ends_at   timestamptz generated always as ((date + end_time)   at time zone 'America/Sao_Paulo') stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_order check (end_time > start_time)
);

create index if not exists appointments_owner_date_idx  on public.appointments(owner_id, date);
create index if not exists appointments_barber_date_idx on public.appointments(barber_id, date);
create index if not exists appointments_client_idx      on public.appointments(client_id);
create index if not exists appointments_group_idx       on public.appointments(recurring_group_id);

-- Impede, no banco, dois atendimentos do mesmo barbeiro em horários que se
-- sobrepõem (exceto cancelados). Elimina condição de corrida entre usuários.
alter table public.appointments drop constraint if exists appointments_no_overlap;
alter table public.appointments add constraint appointments_no_overlap
  exclude using gist (
    owner_id with =,
    barber_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelado' and barber_id is not null);

alter table public.appointments enable row level security;
drop policy if exists "appointments_select_own" on public.appointments;
drop policy if exists "appointments_insert_own" on public.appointments;
drop policy if exists "appointments_update_own" on public.appointments;
drop policy if exists "appointments_delete_own" on public.appointments;
create policy "appointments_select_own" on public.appointments for select using (auth.uid() = owner_id);
create policy "appointments_insert_own" on public.appointments for insert with check (auth.uid() = owner_id);
create policy "appointments_update_own" on public.appointments for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "appointments_delete_own" on public.appointments for delete using (auth.uid() = owner_id);

drop trigger if exists trg_appointments_updated_at on public.appointments;
create trigger trg_appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- =====================================================================
-- FINANCIAL_ENTRIES (receitas/despesas avulsas)
-- =====================================================================
create table if not exists public.financial_entries (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  type           text not null check (type in ('income','expense')),
  category       text,
  description    text,
  amount         numeric(10,2) not null default 0,
  payment_method text,
  occurred_at    timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists financial_entries_owner_idx on public.financial_entries(owner_id, occurred_at);

alter table public.financial_entries enable row level security;
drop policy if exists "financial_select_own" on public.financial_entries;
drop policy if exists "financial_insert_own" on public.financial_entries;
drop policy if exists "financial_update_own" on public.financial_entries;
drop policy if exists "financial_delete_own" on public.financial_entries;
create policy "financial_select_own" on public.financial_entries for select using (auth.uid() = owner_id);
create policy "financial_insert_own" on public.financial_entries for insert with check (auth.uid() = owner_id);
create policy "financial_update_own" on public.financial_entries for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "financial_delete_own" on public.financial_entries for delete using (auth.uid() = owner_id);

drop trigger if exists trg_financial_updated_at on public.financial_entries;
create trigger trg_financial_updated_at before update on public.financial_entries
  for each row execute function public.set_updated_at();

-- =====================================================================
-- SETTINGS (uma linha por usuário)
-- =====================================================================
create table if not exists public.settings (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  business_name    text not null default 'HR Barber Shop',
  owner_name       text not null default '',
  whatsapp         text not null default '',
  address          text,
  interval_minutes integer not null default 10,
  theme            text not null default 'dark',
  currency         text not null default 'BRL',
  timezone         text not null default 'America/Sao_Paulo',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.settings enable row level security;
drop policy if exists "settings_select_own" on public.settings;
drop policy if exists "settings_insert_own" on public.settings;
drop policy if exists "settings_update_own" on public.settings;
drop policy if exists "settings_delete_own" on public.settings;
create policy "settings_select_own" on public.settings for select using (auth.uid() = owner_id);
create policy "settings_insert_own" on public.settings for insert with check (auth.uid() = owner_id);
create policy "settings_update_own" on public.settings for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "settings_delete_own" on public.settings for delete using (auth.uid() = owner_id);

drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();

-- =====================================================================
-- WORKING_HOURS (grade semanal; uma linha por dia, nível da barbearia)
-- =====================================================================
create table if not exists public.working_hours (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  barber_id   uuid references public.barbers(id) on delete cascade,
  weekday     integer not null check (weekday between 0 and 6),
  is_open     boolean not null default true,
  start_time  time not null default '09:00',
  end_time    time not null default '19:00',
  break_start time,
  break_end   time,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Um registro por dia da semana no nível da barbearia (barber_id nulo).
create unique index if not exists working_hours_owner_weekday_shop_idx
  on public.working_hours(owner_id, weekday) where barber_id is null;
create index if not exists working_hours_owner_idx on public.working_hours(owner_id);

alter table public.working_hours enable row level security;
drop policy if exists "working_hours_select_own" on public.working_hours;
drop policy if exists "working_hours_insert_own" on public.working_hours;
drop policy if exists "working_hours_update_own" on public.working_hours;
drop policy if exists "working_hours_delete_own" on public.working_hours;
create policy "working_hours_select_own" on public.working_hours for select using (auth.uid() = owner_id);
create policy "working_hours_insert_own" on public.working_hours for insert with check (auth.uid() = owner_id);
create policy "working_hours_update_own" on public.working_hours for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "working_hours_delete_own" on public.working_hours for delete using (auth.uid() = owner_id);

drop trigger if exists trg_working_hours_updated_at on public.working_hours;
create trigger trg_working_hours_updated_at before update on public.working_hours
  for each row execute function public.set_updated_at();

-- =====================================================================
-- REALTIME — adiciona as tabelas voláteis à publicação supabase_realtime
-- =====================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'appointments'
  ) then
    alter publication supabase_realtime add table public.appointments;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'financial_entries'
  ) then
    alter publication supabase_realtime add table public.financial_entries;
  end if;
end $$;

-- Fim do schema. ✅
