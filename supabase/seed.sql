-- =====================================================================
-- HR Barber Shop — Seed OPCIONAL de dados de teste
--
-- Execute DEPOIS do schema.sql e SOMENTE se quiser dados de exemplo.
-- NÃO cria usuários: crie o usuário administrador antes, pelo painel
-- Authentication > Users do Supabase (ou pelo cadastro do app).
--
-- COMO USAR:
-- 1) Copie o UUID do seu usuário em Authentication > Users.
-- 2) Substitua o valor de v_owner abaixo por esse UUID.
-- 3) Rode este arquivo inteiro no SQL Editor.
-- =====================================================================
do $$
declare
  v_owner uuid := 'REPLACE_WITH_YOUR_USER_UUID';
  b1 uuid; b2 uuid; b3 uuid;
  s1 uuid; s2 uuid; s3 uuid;
  c1 uuid; c2 uuid;
begin
  if v_owner = 'REPLACE_WITH_YOUR_USER_UUID' then
    raise exception 'Troque v_owner pelo UUID do seu usuário (Authentication > Users) antes de rodar o seed.';
  end if;

  -- Barbeiros
  insert into public.barbers (owner_id, name, phone, specialty, active, work_start, work_end)
  values
    (v_owner, 'Henrique Rocha', '5511977770001', 'Cortes clássicos e navalhado', true, '09:00', '19:00'),
    (v_owner, 'Lucas Martins',  '5511977770002', 'Degradê e freestyle',          true, '10:00', '20:00'),
    (v_owner, 'Rafael Santos',  '5511977770003', 'Barboterapia e barba',          true, '09:00', '18:00');
  select id into b1 from public.barbers where owner_id = v_owner and name = 'Henrique Rocha' limit 1;
  select id into b2 from public.barbers where owner_id = v_owner and name = 'Lucas Martins' limit 1;
  select id into b3 from public.barbers where owner_id = v_owner and name = 'Rafael Santos' limit 1;

  -- Serviços
  insert into public.services (owner_id, name, description, duration_minutes, price, active)
  values
    (v_owner, 'Corte Masculino', 'Corte na tesoura e máquina.',   40, 35, true),
    (v_owner, 'Barba',           'Barba na navalha, toalha quente.', 30, 25, true),
    (v_owner, 'Corte + Barba',   'Combo completo com acabamento.', 60, 55, true);
  select id into s1 from public.services where owner_id = v_owner and name = 'Corte Masculino' limit 1;
  select id into s2 from public.services where owner_id = v_owner and name = 'Barba' limit 1;
  select id into s3 from public.services where owner_id = v_owner and name = 'Corte + Barba' limit 1;

  -- Clientes
  insert into public.clients (owner_id, name, whatsapp, birth_date, notes)
  values
    (v_owner, 'João Pedro',     '5511988880001', '1996-04-12', 'Prefere máquina 2 nas laterais.'),
    (v_owner, 'Carlos Eduardo', '5511988880002', '1989-11-03', null);
  select id into c1 from public.clients where owner_id = v_owner and name = 'João Pedro' limit 1;
  select id into c2 from public.clients where owner_id = v_owner and name = 'Carlos Eduardo' limit 1;

  -- Agendamentos de exemplo (hoje)
  insert into public.appointments
    (owner_id, client_id, service_id, barber_id, client_name, client_whatsapp,
     service_name, barber_name, date, start_time, end_time, duration_minutes, price, status)
  values
    (v_owner, c1, s3, b1, 'João Pedro', '5511988880001', 'Corte + Barba', 'Henrique Rocha',
     current_date, '10:00', '11:00', 60, 55, 'concluido'),
    (v_owner, c2, s1, b2, 'Carlos Eduardo', '5511988880002', 'Corte Masculino', 'Lucas Martins',
     current_date, '14:00', '14:40', 40, 35, 'agendado');

  -- Configurações
  insert into public.settings (owner_id, business_name, owner_name, whatsapp, interval_minutes, theme)
  values (v_owner, 'HR Barber Shop', 'Henrique Rocha', '5511999990000', 10, 'dark')
  on conflict (owner_id) do nothing;

  raise notice 'Seed concluído para o usuário %', v_owner;
end $$;
