-- =====================================================================
-- HR Barber Shop - Dados iniciais OPCIONAIS
--
-- Este arquivo NAO e executado automaticamente e NAO cria usuarios.
-- O usuario administrador deve ser criado antes, pelo painel
-- Authentication > Users > Add user do Supabase.
--
-- COMO USAR
--   1. Rode antes o supabase/schema.sql.
--   2. Crie o usuario em Authentication > Users (com "Auto Confirm User").
--   3. Copie o UUID desse usuario (coluna "UID" da listagem).
--   4. Troque o UUID na linha marcada com "<<< TROQUE AQUI >>>".
--   5. Cole o arquivo inteiro no SQL Editor e execute.
--
-- Rodar duas vezes nao duplica nada: cada bloco so insere o que falta.
-- =====================================================================

do $$
declare
  -- <<< TROQUE AQUI >>> pelo UUID do seu usuario de Authentication > Users
  v_owner uuid := '00000000-0000-0000-0000-000000000000';

  v_barber_hr    uuid;
  v_barber_lucas uuid;
  v_service_corte uuid;
  v_service_barba uuid;
  v_service_combo uuid;
  v_client_joao   uuid;
  v_client_carlos uuid;
begin
  if not exists (select 1 from auth.users where id = v_owner) then
    raise exception
      'Usuario % nao existe. Crie-o em Authentication > Users e troque o UUID no topo deste arquivo.',
      v_owner;
  end if;

  -- ---------------- Barbeiros ----------------
  insert into public.barbers (owner_id, name, phone, specialty, work_start, work_end, color)
  select v_owner, 'Henrique Rocha', '5511977770001', 'Cortes classicos e navalhado', '09:00', '19:00', '#c9a24b'
  where not exists (
    select 1 from public.barbers where owner_id = v_owner and name = 'Henrique Rocha'
  );

  insert into public.barbers (owner_id, name, phone, specialty, work_start, work_end, color)
  select v_owner, 'Lucas Martins', '5511977770002', 'Degrade e freestyle', '10:00', '20:00', '#3b82f6'
  where not exists (
    select 1 from public.barbers where owner_id = v_owner and name = 'Lucas Martins'
  );

  select id into v_barber_hr    from public.barbers where owner_id = v_owner and name = 'Henrique Rocha';
  select id into v_barber_lucas from public.barbers where owner_id = v_owner and name = 'Lucas Martins';

  -- ---------------- Servicos ----------------
  insert into public.services (owner_id, name, description, duration_minutes, price)
  select v_owner, 'Corte Masculino', 'Corte tradicional ou moderno na tesoura e maquina.', 40, 35.00
  where not exists (
    select 1 from public.services where owner_id = v_owner and name = 'Corte Masculino'
  );

  insert into public.services (owner_id, name, description, duration_minutes, price)
  select v_owner, 'Barba', 'Barba feita na navalha com toalha quente.', 30, 25.00
  where not exists (
    select 1 from public.services where owner_id = v_owner and name = 'Barba'
  );

  insert into public.services (owner_id, name, description, duration_minutes, price)
  select v_owner, 'Corte + Barba', 'Combo completo com acabamento.', 60, 55.00
  where not exists (
    select 1 from public.services where owner_id = v_owner and name = 'Corte + Barba'
  );

  select id into v_service_corte from public.services where owner_id = v_owner and name = 'Corte Masculino';
  select id into v_service_barba from public.services where owner_id = v_owner and name = 'Barba';
  select id into v_service_combo from public.services where owner_id = v_owner and name = 'Corte + Barba';

  -- ---------------- Clientes ----------------
  insert into public.clients (owner_id, name, whatsapp, birth_date, notes)
  select v_owner, 'Joao Pedro', '5511988880001', '1996-04-12', 'Prefere maquina 2 nas laterais.'
  where not exists (
    select 1 from public.clients where owner_id = v_owner and name = 'Joao Pedro'
  );

  insert into public.clients (owner_id, name, whatsapp, birth_date)
  select v_owner, 'Carlos Eduardo', '5511988880002', '1989-11-03'
  where not exists (
    select 1 from public.clients where owner_id = v_owner and name = 'Carlos Eduardo'
  );

  select id into v_client_joao   from public.clients where owner_id = v_owner and name = 'Joao Pedro';
  select id into v_client_carlos from public.clients where owner_id = v_owner and name = 'Carlos Eduardo';

  -- ---------------- Agendamentos ----------------
  -- Um concluido ontem (entra no faturamento), um hoje e um para amanha.
  insert into public.appointments (
    owner_id, client_id, service_id, barber_id,
    client_name, client_whatsapp, service_name, barber_name,
    date, start_time, end_time, duration_minutes, price, status, payment_method
  )
  select
    v_owner, v_client_joao, v_service_corte, v_barber_hr,
    'Joao Pedro', '5511988880001', 'Corte Masculino', 'Henrique Rocha',
    current_date - 1, '10:00', '10:40', 40, 35.00, 'concluido', 'pix'
  where not exists (
    select 1 from public.appointments
    where owner_id = v_owner and barber_id = v_barber_hr
      and date = current_date - 1 and start_time = '10:00'
  );

  insert into public.appointments (
    owner_id, client_id, service_id, barber_id,
    client_name, client_whatsapp, service_name, barber_name,
    date, start_time, end_time, duration_minutes, price, status
  )
  select
    v_owner, v_client_joao, v_service_barba, v_barber_hr,
    'Joao Pedro', '5511988880001', 'Barba', 'Henrique Rocha',
    current_date, '11:00', '11:30', 30, 25.00, 'agendado'
  where not exists (
    select 1 from public.appointments
    where owner_id = v_owner and barber_id = v_barber_hr
      and date = current_date and start_time = '11:00'
  );

  insert into public.appointments (
    owner_id, client_id, service_id, barber_id,
    client_name, client_whatsapp, service_name, barber_name,
    date, start_time, end_time, duration_minutes, price, status
  )
  select
    v_owner, v_client_carlos, v_service_combo, v_barber_lucas,
    'Carlos Eduardo', '5511988880002', 'Corte + Barba', 'Lucas Martins',
    current_date + 1, '15:00', '16:00', 60, 55.00, 'confirmado'
  where not exists (
    select 1 from public.appointments
    where owner_id = v_owner and barber_id = v_barber_lucas
      and date = current_date + 1 and start_time = '15:00'
  );

  -- ---------------- Financeiro ----------------
  insert into public.financial_entries (
    owner_id, type, category, description, amount, payment_method, occurred_at
  )
  select v_owner, 'expense', 'produtos', 'Compra de pomadas e navalhas', 180.00, 'pix', current_date - 3
  where not exists (
    select 1 from public.financial_entries
    where owner_id = v_owner and description = 'Compra de pomadas e navalhas'
  );

  insert into public.financial_entries (
    owner_id, type, category, description, amount, payment_method, occurred_at
  )
  select v_owner, 'income', 'produtos', 'Venda de pomada modeladora', 45.00, 'dinheiro', current_date - 1
  where not exists (
    select 1 from public.financial_entries
    where owner_id = v_owner and description = 'Venda de pomada modeladora'
  );

  raise notice 'Seed concluido para o usuario %.', v_owner;
end $$;
