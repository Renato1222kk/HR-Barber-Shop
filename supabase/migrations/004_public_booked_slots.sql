-- =====================================================================
-- HR Barber Shop - Horarios marcados publicos (/horarios)
--
-- Permite que o cliente confira, sem login, que o horario dele entrou na
-- agenda. Segue o mesmo modelo de 002_public_booking.sql:
--
--   * O papel `anon` continua SEM SELECT na tabela appointments.
--   * Nenhuma politica RLS `using (true)` e criada.
--   * A unica porta e a funcao SECURITY DEFINER abaixo, que devolve
--     SOMENTE: horario de inicio, horario de fim e nome abreviado
--     ("Leonardo S."). O nome completo nunca sai do banco.
--   * Nada de client_id, WhatsApp, observacoes, servico, preco,
--     forma de pagamento, owner_id ou barber_id.
--   * Cancelados nao aparecem (mesma regra da disponibilidade).
--   * Apenas de hoje ate a janela maxima de agendamento (America/Sao_Paulo):
--     o historico de dias passados nao fica exposto.
--
-- Numerada 004 para nao colidir com 003_fix_booking_slots.sql.
-- Idempotente: pode ser reexecutada (tudo e `create or replace`).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Nome publico: primeiro nome + inicial do sobrenome.
--   "Leonardo Santos"   -> "Leonardo S."
--   "João Pedro Silva"  -> "João P."
--   "Maria da Silva"    -> "Maria S."   (ignora da/de/do/das/dos/e)
--   "Renato"            -> "Renato"
--   vazio / nulo        -> "Cliente"
-- ---------------------------------------------------------------------
create or replace function public.public_display_name(p_name text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_parts   text[];
  v_first   text;
  v_initial text;
  i         integer;
begin
  v_parts := regexp_split_to_array(btrim(coalesce(p_name, '')), '\s+');
  if v_parts is null or coalesce(v_parts[1], '') = '' then
    return 'Cliente';
  end if;

  v_first := left(initcap(lower(v_parts[1])), 30);

  for i in 2 .. coalesce(array_length(v_parts, 1), 1) loop
    if lower(v_parts[i]) not in ('da', 'de', 'do', 'das', 'dos', 'e', 'di', 'du') then
      v_initial := upper(left(regexp_replace(v_parts[i], '[^[:alpha:]]', '', 'g'), 1));
      if v_initial <> '' then
        return v_first || ' ' || v_initial || '.';
      end if;
    end if;
  end loop;

  return v_first;
end;
$$;

-- ---------------------------------------------------------------------
-- Horarios ocupados de um dia (publico, ja anonimizado).
-- ---------------------------------------------------------------------
create or replace function public.public_booked_slots(p_date date)
returns table (
  start_time   text,
  end_time     text,
  display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    to_char(a.start_time, 'HH24:MI'),
    to_char(a.end_time, 'HH24:MI'),
    public.public_display_name(a.client_name)
  from public.appointments a
  where a.owner_id = public.booking_owner_id()
    and a.date = p_date
    and a.status <> 'cancelado'
    and p_date >= (now() at time zone 'America/Sao_Paulo')::date
    and p_date <= (now() at time zone 'America/Sao_Paulo')::date + public.booking_max_advance_days()
  order by a.start_time asc, a.end_time asc;
$$;

-- ---------------------------------------------------------------------
-- Permissoes: o publico so executa a funcao; nenhuma tabela e liberada.
-- ---------------------------------------------------------------------
grant execute on function public.public_display_name(text) to anon, authenticated;
grant execute on function public.public_booked_slots(date) to anon, authenticated;
