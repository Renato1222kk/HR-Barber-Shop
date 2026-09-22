-- =====================================================================
-- HR Barber Shop - Agendamento online publico (/agendar)
--
-- Cria as funcoes SECURITY DEFINER que sustentam a pagina publica de
-- agendamento. Elas sao a UNICA porta de entrada do publico:
--
--   * O papel `anon` NAO recebe SELECT/INSERT nas tabelas.
--   * Nao existe politica RLS `using (true)`.
--   * Cada funcao roda como o dono (definer), le/grava apenas o necessario
--     e devolve somente dados publicos (nada de owner_id, lista de
--     clientes, WhatsApp de terceiros, financeiro, observacoes alheias).
--   * O owner e resolvido no servidor (instalacao unica): o formulario
--     publico nunca envia owner_id.
--
-- As regras reaproveitadas do painel:
--   * Horario de funcionamento (working_hours, por dia da semana).
--   * Intervalo entre atendimentos (settings.interval_minutes).
--   * Barbeiro padrao ativo (primeiro ativo por data de cadastro).
--   * Conflito de horario pela constraint appointments_no_barber_overlap
--     (GiST) — a protecao definitiva contra condicao de corrida.
--   * Fuso America/Sao_Paulo via public.shop_timestamp / horario de parede.
--
-- Idempotente: pode ser reexecutado (tudo e `create or replace`).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Parametros centralizados (ajustaveis depois sem tocar no app)
-- ---------------------------------------------------------------------

-- Antecedencia minima para agendar no proprio dia (minutos).
create or replace function public.booking_min_lead_minutes()
returns integer language sql immutable as $$ select 30; $$;

-- Janela futura maxima de agendamento (dias a partir de hoje).
create or replace function public.booking_max_advance_days()
returns integer language sql immutable as $$ select 60; $$;

-- ---------------------------------------------------------------------
-- Dono da barbearia (instalacao unica) — resolvido no servidor.
-- Determinístico: a linha de settings mais antiga é a da HR Barber Shop.
-- ---------------------------------------------------------------------
create or replace function public.booking_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select owner_id from public.settings order by created_at asc limit 1;
$$;

-- =====================================================================
-- SERVICOS ATIVOS (publico)
-- =====================================================================
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

-- =====================================================================
-- DADOS PUBLICOS DA BARBEARIA (nome, WhatsApp, endereco, horarios)
-- Nunca devolve owner_id nem qualquer dado interno.
-- =====================================================================
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

-- =====================================================================
-- DISPONIBILIDADE REAL (horarios livres para um servico numa data)
--
-- Gera os inicios candidatos a partir da abertura, espacados por
-- (duracao do servico + intervalo entre atendimentos). Para cada um:
--   * o servico precisa CABER inteiro antes do fechamento;
--   * nao pode cair no intervalo de almoco (break);
--   * se for hoje, precisa respeitar a antecedencia minima;
--   * nao pode sobrepor nenhum atendimento existente do barbeiro
--     (do painel ou do link publico) — verifica INTERVALO, nao so o
--     inicio igual.
-- Devolve "HH:MM" em ordem crescente.
-- =====================================================================
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
  v_min_start    integer;  -- minutos: menor inicio permitido hoje (antecedencia)
  v_is_open      boolean;
  v_open         integer;
  v_close        integer;
  v_break_start  integer;
  v_break_end    integer;
  v_wh           record;
  s              integer;  -- inicio candidato (minutos desde a meia-noite)
begin
  if v_owner is null then return; end if;
  if p_date < v_today then return; end if;
  if p_date > v_today + public.booking_max_advance_days() then return; end if;

  -- Servico precisa existir, pertencer ao dono e estar ativo.
  select duration_minutes into v_duration
  from public.services
  where id = p_service_id and owner_id = v_owner and active = true;
  if v_duration is null then return; end if;

  -- Barbeiro padrao ativo (mesma regra do painel).
  select id into v_barber
  from public.barbers
  where owner_id = v_owner and active = true
  order by created_at asc
  limit 1;
  if v_barber is null then return; end if;

  -- Horario de funcionamento do dia (0 = domingo, igual ao painel).
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

  -- Passo do grid = duracao + intervalo configurado.
  select coalesce(interval_minutes, 0) into v_interval from public.settings where owner_id = v_owner;
  v_step := v_duration + greatest(coalesce(v_interval, 0), 0);
  if v_step <= 0 then v_step := greatest(v_duration, 1); end if;

  -- Antecedencia minima (apenas para hoje).
  if p_date = v_today then
    v_min_start := v_now_min + public.booking_min_lead_minutes();
  end if;

  s := v_open;
  while s + v_duration <= v_close loop
    -- Nao pode invadir o intervalo de almoco.
    if v_break_start is null
       or not (s < v_break_end and v_break_start < s + v_duration) then
      -- Antecedencia (passado / margem minima) para hoje.
      if v_min_start is null or s >= v_min_start then
        -- Sem sobreposicao com atendimentos existentes.
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

-- =====================================================================
-- PROXIMO DIA COM VAGA (para "Ver proximo dia disponivel")
-- =====================================================================
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

-- =====================================================================
-- CRIAR AGENDAMENTO (publico, transacional e seguro)
--
-- Uma unica funcao = uma unica transacao:
--   1. valida nome completo, WhatsApp, servico ativo, data/horario;
--   2. re-checa a disponibilidade AGORA (nao confia no que o navegador
--      carregou antes) — evita corrida logica;
--   3. reaproveita o cliente existente pelo WhatsApp (ou cria um novo)
--      dentro do owner, sem nunca expor a lista de clientes;
--   4. insere o atendimento na MESMA tabela do painel;
--   5. a constraint appointments_no_barber_overlap (GiST) e a barreira
--      final: se dois confirmarem o mesmo horario ao mesmo tempo, o
--      segundo recebe BOOKING_SLOT_TAKEN.
--
-- Erros sao textos-codigo (BOOKING_*) que a API traduz em mensagens
-- amigaveis — nunca vaza detalhe tecnico para o cliente.
-- =====================================================================
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

  -- ---- Nome completo (mesma regra do cliente, revalidada no servidor) ----
  if length(v_name) < 3 or length(v_name) > 80 then
    raise exception 'BOOKING_INVALID_NAME';
  end if;
  if coalesce(array_length(regexp_split_to_array(v_name, '\s+'), 1), 0) < 2 then
    raise exception 'BOOKING_INVALID_NAME';
  end if;

  -- ---- WhatsApp: DDD + celular (10 ou 11 digitos), com ou sem 55 ----
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

  -- ---- Observacao: limita tamanho (anti-spam) ----
  if v_notes is not null and length(v_notes) > 500 then
    v_notes := substr(v_notes, 1, 500);
  end if;

  -- ---- Servico ativo ----
  select id, name, duration_minutes, price into v_service
  from public.services
  where id = p_service_id and owner_id = v_owner and active = true;
  if v_service.id is null then
    raise exception 'BOOKING_INVALID_SERVICE';
  end if;

  -- ---- Barbeiro padrao ativo (automatico, nunca escolhido pelo cliente) ----
  select id, name into v_barber
  from public.barbers
  where owner_id = v_owner and active = true
  order by created_at asc
  limit 1;
  if v_barber.id is null then
    raise exception 'BOOKING_UNAVAILABLE';
  end if;

  -- ---- Re-checagem de disponibilidade AGORA ----
  if not exists (
    select 1 from public.public_booking_availability(p_service_id, p_date) t
    where t = to_char(p_start_time, 'HH24:MI')
  ) then
    raise exception 'BOOKING_SLOT_TAKEN';
  end if;

  v_end_time := p_start_time + make_interval(mins => v_service.duration_minutes);
  if v_end_time <= p_start_time then
    -- Servico cruzaria a meia-noite: nao ha horario valido.
    raise exception 'BOOKING_SLOT_TAKEN';
  end if;

  -- ---- Cliente existente pelo WhatsApp (ou cria) — sem expor a lista ----
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

  -- ---- Insere o atendimento (a constraint GiST fecha a corrida) ----
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

-- =====================================================================
-- PERMISSOES
--
-- O publico (anon) so ganha EXECUTE nestas funcoes. Nenhum acesso direto
-- as tabelas. `authenticated` tambem recebe (o painel pode reutilizar).
-- =====================================================================
grant execute on function public.booking_min_lead_minutes() to anon, authenticated;
grant execute on function public.booking_max_advance_days() to anon, authenticated;
grant execute on function public.booking_owner_id() to anon, authenticated;
grant execute on function public.public_booking_services() to anon, authenticated;
grant execute on function public.public_booking_settings() to anon, authenticated;
grant execute on function public.public_booking_availability(uuid, date) to anon, authenticated;
grant execute on function public.public_booking_next_available(uuid, date) to anon, authenticated;
grant execute on function public.create_public_booking(uuid, date, time, text, text, text) to anon, authenticated;
