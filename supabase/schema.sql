-- =====================================================================
-- Bruno Samad Agenda - Schema Supabase
-- Rode este arquivo no SQL Editor do Supabase (uma unica vez).
-- =====================================================================

-- Extensao para gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- PROFILES (perfil do barbeiro, 1:1 com auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- CLIENTS
-- ---------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  whatsapp text,
  birth_date date,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists clients_user_id_idx on public.clients(user_id);

-- ---------------------------------------------------------------------
-- SERVICES
-- ---------------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer not null default 30,
  price numeric(10, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists services_user_id_idx on public.services(user_id);

-- ---------------------------------------------------------------------
-- APPOINTMENTS
-- ---------------------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  client_name text not null,
  client_whatsapp text,
  service_name text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  duration_minutes integer not null default 30,
  price numeric(10, 2) not null default 0,
  status text not null default 'agendado'
    check (status in ('agendado', 'confirmado', 'atendido', 'faltou', 'cancelado')),
  notes text,
  recurring_group_id uuid,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists appointments_user_id_idx on public.appointments(user_id);
create index if not exists appointments_date_idx on public.appointments(user_id, date);
create index if not exists appointments_recurring_group_idx on public.appointments(recurring_group_id);

-- ---------------------------------------------------------------------
-- APPOINTMENT_RECURRING_GROUPS (grupos de agendamento recorrente)
-- ---------------------------------------------------------------------
create table if not exists public.appointment_recurring_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  frequency text not null default 'weekly'
    check (frequency in ('weekly', 'biweekly', 'monthly', 'custom')),
  interval_weeks integer not null default 1,
  selected_weekdays text[] not null default '{}',
  start_date date not null,
  end_date date,
  occurrences_count integer,
  created_at timestamptz not null default now()
);
create index if not exists recurring_groups_user_id_idx
  on public.appointment_recurring_groups(user_id);

-- FK appointments -> grupo (adicionada apos a criacao do grupo)
alter table public.appointments
  drop constraint if exists appointments_recurring_group_id_fkey;
alter table public.appointments
  add constraint appointments_recurring_group_id_fkey
  foreign key (recurring_group_id)
  references public.appointment_recurring_groups(id) on delete set null;

-- ---------------------------------------------------------------------
-- WORKING_HOURS (horario de funcionamento por dia da semana)
-- ---------------------------------------------------------------------
create table if not exists public.working_hours (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6), -- 0 = domingo
  is_open boolean not null default true,
  start_time time not null default '09:00',
  end_time time not null default '19:00',
  break_start time,
  break_end time,
  unique (user_id, weekday)
);
create index if not exists working_hours_user_id_idx on public.working_hours(user_id);

-- ---------------------------------------------------------------------
-- BLOCKED_TIMES (bloqueios/dias fechados pontuais)
-- ---------------------------------------------------------------------
create table if not exists public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists blocked_times_user_id_idx on public.blocked_times(user_id);

-- ---------------------------------------------------------------------
-- SETTINGS (1:1 com usuario)
-- ---------------------------------------------------------------------
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null default 'Bruno Samad',
  barber_name text not null default 'Bruno Samad',
  whatsapp text,
  interval_minutes integer not null default 10,
  theme text not null default 'dark',
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- Cada usuario so enxerga / altera os proprios dados.
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.working_hours enable row level security;
alter table public.blocked_times enable row level security;
alter table public.settings enable row level security;
alter table public.appointment_recurring_groups enable row level security;

-- PROFILES (id = auth.uid())
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Macro de policies padrao (user_id = auth.uid()) para cada tabela
do $$
declare
  t text;
  tables text[] := array['clients', 'services', 'appointments', 'working_hours', 'blocked_times', 'settings', 'appointment_recurring_groups'];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "%1$s_select" on public.%1$s;', t);
    execute format('create policy "%1$s_select" on public.%1$s for select using (auth.uid() = user_id);', t);

    execute format('drop policy if exists "%1$s_insert" on public.%1$s;', t);
    execute format('create policy "%1$s_insert" on public.%1$s for insert with check (auth.uid() = user_id);', t);

    execute format('drop policy if exists "%1$s_update" on public.%1$s;', t);
    execute format('create policy "%1$s_update" on public.%1$s for update using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);

    execute format('drop policy if exists "%1$s_delete" on public.%1$s;', t);
    execute format('create policy "%1$s_delete" on public.%1$s for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- =====================================================================
-- TRIGGER: cria profile, settings e horarios padrao ao registrar usuario
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Bruno Samad'))
  on conflict (id) do nothing;

  insert into public.settings (user_id, business_name, barber_name)
  values (new.id, 'Bruno Samad', 'Bruno Samad')
  on conflict (user_id) do nothing;

  -- Horarios padrao: seg-sex 09-19, sab 08-16, dom fechado
  insert into public.working_hours (user_id, weekday, is_open, start_time, end_time)
  values
    (new.id, 0, false, '09:00', '19:00'),
    (new.id, 1, true,  '09:00', '19:00'),
    (new.id, 2, true,  '09:00', '19:00'),
    (new.id, 3, true,  '09:00', '19:00'),
    (new.id, 4, true,  '09:00', '19:00'),
    (new.id, 5, true,  '09:00', '19:00'),
    (new.id, 6, true,  '08:00', '16:00')
  on conflict (user_id, weekday) do nothing;

  -- Servicos iniciais
  insert into public.services (user_id, name, duration_minutes, price, description)
  values
    (new.id, 'Corte Masculino', 40, 40, 'Corte tradicional ou moderno'),
    (new.id, 'Barba', 25, 30, 'Barba feita na navalha'),
    (new.id, 'Corte + Barba', 60, 65, 'Combo completo'),
    (new.id, 'Sobrancelha', 10, 15, 'Design de sobrancelha'),
    (new.id, 'Acabamento', 15, 20, 'Acabamento / pezinho');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
