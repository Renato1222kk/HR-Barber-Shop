-- =====================================================================
-- HR Barber Shop - Migracao: agendamento recorrente (ARQUIVO HISTORICO)
-- Pertence a versao antiga com Supabase. Nao e usado pelo app atual.
-- Rode no SQL Editor do Supabase (apos o schema.sql).
-- =====================================================================

create extension if not exists "pgcrypto";

-- Grupos de recorrencia
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

-- Colunas de recorrencia em appointments
alter table public.appointments
  add column if not exists recurring_group_id uuid
    references public.appointment_recurring_groups(id) on delete set null;

alter table public.appointments
  add column if not exists is_recurring boolean not null default false;

create index if not exists appointments_recurring_group_idx
  on public.appointments(recurring_group_id);

-- RLS
alter table public.appointment_recurring_groups enable row level security;

drop policy if exists "recgroups_select" on public.appointment_recurring_groups;
create policy "recgroups_select" on public.appointment_recurring_groups
  for select using (auth.uid() = user_id);

drop policy if exists "recgroups_insert" on public.appointment_recurring_groups;
create policy "recgroups_insert" on public.appointment_recurring_groups
  for insert with check (auth.uid() = user_id);

drop policy if exists "recgroups_update" on public.appointment_recurring_groups;
create policy "recgroups_update" on public.appointment_recurring_groups
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recgroups_delete" on public.appointment_recurring_groups;
create policy "recgroups_delete" on public.appointment_recurring_groups
  for delete using (auth.uid() = user_id);
