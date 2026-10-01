-- A lemondás nélküli távolmaradás („Nem jött el”) fizetős:
-- alkalmi díjnál bevétel keletkezik, bérletnél levonódik egy alkalom.
-- A lemondott („Lemondva”) időpont továbbra is ingyenes.

create or replace view public.pass_balances with (security_invoker = true) as
select
  p.id,
  p.user_id,
  p.client_id,
  p.name,
  p.total_sessions,
  p.purchased_on,
  count(a.id) filter (where a.status in ('done', 'no_show'))::int                    as used_sessions,
  p.total_sessions - count(a.id) filter (where a.status in ('done', 'no_show'))::int as remaining_sessions
from public.passes p
left join public.appointments a on a.pass_id = p.id
group by p.id;

create or replace function public.sync_appointment_income()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_share numeric := 0;
  v_fee   integer;
begin
  delete from public.transactions where appointment_id = new.id;

  if new.status in ('done', 'no_show') and new.pass_id is null and coalesce(new.price, 0) > 0 then
    if new.kind = 'personal' then
      select referral_share into v_share from public.clients where id = new.client_id;
    end if;
    v_fee := round(new.price * coalesce(v_share, 0));

    insert into public.transactions
      (user_id, type, category, occurred_on, amount, gross_amount, referral_fee, client_id, appointment_id, note)
    values
      (new.user_id, 'income',
       case new.kind when 'group' then 'Csoportos óra' else 'Személyi edzés' end,
       (new.starts_at at time zone 'Europe/Budapest')::date,
       new.price - v_fee, new.price, v_fee, new.client_id, new.id,
       case when new.status = 'no_show' then 'Nem jött el (lemondás nélkül)' end);
  end if;

  return new;
end;
$$;

-- A már meglévő „Nem jött el” időpontokhoz is létrehozzuk a bevételt (a trigger újrafut).
update public.appointments set status = status where status = 'no_show';
