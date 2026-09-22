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

-- =====================================================================
-- AGENDAMENTO ONLINE PUBLICO (/agendar)
--
-- Funcoes SECURITY DEFINER que sustentam a pagina publica de agendamento.
-- Sao a UNICA porta de entrada do publico: o papel `anon` NAO recebe
-- SELECT/INSERT nas tabelas e nao existe politica RLS `using (true)`.
-- Cada funcao roda como o dono, le/grava apenas o necessario e devolve
-- somente dados publicos. O owner e resolvido no servidor (instalacao
-- unica): o formulario publico nunca envia owner_id.
--
-- Conteudo identico ao de supabase/migrations/002_public_booking.sql.
-- =====================================================================

create or replace function public.booking_min_lead_minutes()
returns integer language sql immutable as $$ select 30; $$;

create or replace function public.booking_max_advance_days()
returns integer language sql immutable as $$ select 60; $$;

create or replace function public.booking_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select owner_id from public.settings order by created_at asc limit 1;
$$;

create or replace function public.public_booking_services()
returns table (
  id uuid,
  name text,
  description text,
  duration_minutes integer,
  price numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name, s.description, s.duration_minutes, s.price
  from public.services s
  where s.owner_id = public.booking_owner_id()
    and s.active = true
  order by s.name asc;
$$;

create or replace function public.public_booking_settings()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'business_name', s.business_name,
    'whatsapp', s.whatsapp,
    'address', s.address,
    'working_hours', coalesce((
      select json_agg(
        json_build_object(
          'weekday', wh.weekday,
          'is_open', wh.is_open,
          'start_time', to_char(wh.start_time, 'HH24:MI'),
          'end_time', to_char(wh.end_time, 'HH24:MI')
        ) order by wh.weekday
      )
      from public.working_hours wh
      where wh.owner_id = s.owner_id
    ), '[]'::json)
  )
  from public.settings s
  where s.owner_id = public.booking_owner_id();
$$;

create or replace function public.public_booking_availability(
  p_service_id uuid,
  p_date date
)
returns setof text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner        uuid := public.booking_owner_id();
  v_barber       uuid;
  v_duration     integer;
  v_interval     integer;
  v_step         integer;
  v_today        date := (now() at time zone 'America/Sao_Paulo')::date;
  v_now_min      integer := (extract(hour from (now() at time zone 'America/Sao_Paulo')) * 60
                             + extract(minute from (now() at time zone 'America/Sao_Paulo')))::int;
  v_min_start    integer;
  v_open         integer;
  v_close        integer;
  v_break_start  integer;
  v_break_end    integer;
  v_wh           record;
  s              integer;
begin
  if v_owner is null then return; end if;
  if p_date < v_today then return; end if;
  if p_date > v_today + public.booking_max_advance_days() then return; end if;

  select duration_minutes into v_duration
  from public.services
  where id = p_service_id and owner_id = v_owner and active = true;
  if v_duration is null then return; end if;

  select id into v_barber
  from public.barbers
  where owner_id = v_owner and active = true
  order by created_at asc
  limit 1;
  if v_barber is null then return; end if;

  select is_open, start_time, end_time, break_start, break_end
  into v_wh
  from public.working_hours
  where owner_id = v_owner and weekday = extract(dow from p_date)::int;
  if not found or not v_wh.is_open then return; end if;

  v_open  := extract(hour from v_wh.start_time) * 60 + extract(minute from v_wh.start_time);
  v_close := extract(hour from v_wh.end_time)   * 60 + extract(minute from v_wh.end_time);
  if v_wh.break_start is not null and v_wh.break_end is not null then
    v_break_start := extract(hour from v_wh.break_start) * 60 + extract(minute from v_wh.break_start);
    v_break_end   := extract(hour from v_wh.break_end)   * 60 + extract(minute from v_wh.break_end);
  end if;

  select coalesce(interval_minutes, 0) into v_interval from public.settings where owner_id = v_owner;
  v_step := v_duration + greatest(coalesce(v_interval, 0), 0);
  if v_step <= 0 then v_step := greatest(v_duration, 1); end if;

  if p_date = v_today then
    v_min_start := v_now_min + public.booking_min_lead_minutes();
  end if;

  s := v_open;
  while s + v_duration <= v_close loop
    if v_break_start is null
       or not (s < v_break_end and v_break_start < s + v_duration) then
      if v_min_start is null or s >= v_min_start then
        if not exists (
          select 1
          from public.appointments a
          where a.owner_id = v_owner
            and a.barber_id = v_barber
            and a.date = p_date
            and a.status <> 'cancelado'
            and s < (extract(hour from a.end_time) * 60 + extract(minute from a.end_time))
            and (extract(hour from a.start_time) * 60 + extract(minute from a.start_time)) < s + v_duration
        ) then
          return next to_char(make_time(s / 60, s % 60, 0), 'HH24:MI');
        end if;
      end if;
    end if;
    s := s + v_step;
  end loop;

  return;
end;
$$;

create or replace function public.public_booking_next_available(
  p_service_id uuid,
  p_from date
)
returns date
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  d date;
  i integer;
begin
  if p_from < v_today then p_from := v_today; end if;
  for i in 0 .. public.booking_max_advance_days() loop
    d := p_from + i;
    if exists (select 1 from public.public_booking_availability(p_service_id, d)) then
      return d;
    end if;
  end loop;
  return null;
end;
$$;

create or replace function public.create_public_booking(
  p_service_id uuid,
  p_date date,
  p_start_time time,
  p_client_name text,
  p_client_whatsapp text,
  p_notes text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner     uuid := public.booking_owner_id();
  v_service   record;
  v_barber    record;
  v_name      text := btrim(coalesce(p_client_name, ''));
  v_notes     text := nullif(btrim(coalesce(p_notes, '')), '');
  v_digits    text := regexp_replace(coalesce(p_client_whatsapp, ''), '\D', '', 'g');
  v_wa        text;
  v_client_id uuid;
  v_end_time  time;
  v_appt      record;
begin
  if v_owner is null then
    raise exception 'BOOKING_UNAVAILABLE';
  end if;

  if length(v_name) < 3 or length(v_name) > 80 then
    raise exception 'BOOKING_INVALID_NAME';
  end if;
  if coalesce(array_length(regexp_split_to_array(v_name, '\s+'), 1), 0) < 2 then
    raise exception 'BOOKING_INVALID_NAME';
  end if;

  if length(v_digits) >= 12 and left(v_digits, 2) = '55' then
    v_digits := substr(v_digits, 3);
  end if;
  if length(v_digits) not in (10, 11) then
    raise exception 'BOOKING_INVALID_PHONE';
  end if;
  v_wa := case
    when length(v_digits) = 11
      then '(' || substr(v_digits, 1, 2) || ') ' || substr(v_digits, 3, 5) || '-' || substr(v_digits, 8, 4)
      else '(' || substr(v_digits, 1, 2) || ') ' || substr(v_digits, 3, 4) || '-' || substr(v_digits, 7, 4)
  end;

  if v_notes is not null and length(v_notes) > 500 then
    v_notes := substr(v_notes, 1, 500);
  end if;

  select id, name, duration_minutes, price into v_service
  from public.services
  where id = p_service_id and owner_id = v_owner and active = true;
  if v_service.id is null then
    raise exception 'BOOKING_INVALID_SERVICE';
  end if;

  select id, name into v_barber
  from public.barbers
  where owner_id = v_owner and active = true
  order by created_at asc
  limit 1;
  if v_barber.id is null then
    raise exception 'BOOKING_UNAVAILABLE';
  end if;

  if not exists (
    select 1 from public.public_booking_availability(p_service_id, p_date) t
    where t = to_char(p_start_time, 'HH24:MI')
  ) then
    raise exception 'BOOKING_SLOT_TAKEN';
  end if;

  v_end_time := p_start_time + make_interval(mins => v_service.duration_minutes);
  if v_end_time <= p_start_time then
    raise exception 'BOOKING_SLOT_TAKEN';
  end if;

  select c.id into v_client_id
  from public.clients c
  where c.owner_id = v_owner
    and (
      case
        when length(regexp_replace(coalesce(c.whatsapp, ''), '\D', '', 'g')) >= 12
             and left(regexp_replace(coalesce(c.whatsapp, ''), '\D', '', 'g'), 2) = '55'
          then substr(regexp_replace(coalesce(c.whatsapp, ''), '\D', '', 'g'), 3)
        else regexp_replace(coalesce(c.whatsapp, ''), '\D', '', 'g')
      end
    ) = v_digits
  limit 1;

  if v_client_id is null then
    insert into public.clients (owner_id, name, whatsapp)
    values (v_owner, v_name, v_wa)
    returning id into v_client_id;
  end if;

  begin
    insert into public.appointments (
      owner_id, client_id, service_id, barber_id,
      client_name, client_whatsapp, service_name, barber_name,
      date, start_time, end_time, duration_minutes, price, status, notes
    ) values (
      v_owner, v_client_id, v_service.id, v_barber.id,
      v_name, v_wa, v_service.name, v_barber.name,
      p_date, p_start_time, v_end_time, v_service.duration_minutes, v_service.price,
      'agendado', v_notes
    )
    returning id, date, start_time, end_time into v_appt;
  exception
    when exclusion_violation then
      raise exception 'BOOKING_SLOT_TAKEN';
  end;

  return json_build_object(
    'id',               v_appt.id,
    'date',             to_char(v_appt.date, 'YYYY-MM-DD'),
    'start_time',       to_char(v_appt.start_time, 'HH24:MI'),
    'end_time',         to_char(v_appt.end_time, 'HH24:MI'),
    'service_name',     v_service.name,
    'duration_minutes', v_service.duration_minutes,
    'price',            v_service.price,
    'client_name',      v_name,
    'client_whatsapp',  v_wa
  );
end;
$$;

grant execute on function public.booking_min_lead_minutes() to anon, authenticated;
grant execute on function public.booking_max_advance_days() to anon, authenticated;
grant execute on function public.booking_owner_id() to anon, authenticated;
grant execute on function public.public_booking_services() to anon, authenticated;
grant execute on function public.public_booking_settings() to anon, authenticated;
grant execute on function public.public_booking_availability(uuid, date) to anon, authenticated;
grant execute on function public.public_booking_next_available(uuid, date) to anon, authenticated;
grant execute on function public.create_public_booking(uuid, date, time, text, text, text) to anon, authenticated;
