-- Edző app – kezdeti séma
-- Egy felhasználó (az edző) látja a saját adatait; minden tábla user_id alapján RLS-sel védett.

-- ---------------------------------------------------------------------------
-- Beállítások
-- ---------------------------------------------------------------------------
create table public.settings (
  user_id            uuid primary key default auth.uid() references auth.users on delete cascade,
  session_price      integer not null default 0 check (session_price >= 0),      -- egy személyi óra ára (Ft)
  group_session_rate integer not null default 5500 check (group_session_rate >= 0) -- ennyit keres egy csoportos órán (Ft)
);

-- ---------------------------------------------------------------------------
-- Kliensek
-- ---------------------------------------------------------------------------
create table public.clients (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users on delete cascade,
  name             text not null check (length(trim(name)) > 0),
  phone            text,
  email            text,
  goal             text,
  notes            text,
  -- Ha egy másik edzőtől / programból jött: az ajánló neve és a neki járó rész (pl. 0.33333 = 1/3).
  referral_partner text,
  referral_share   numeric(6,5) not null default 0 check (referral_share >= 0 and referral_share < 1),
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);
create index clients_user_idx on public.clients (user_id, active, name);

-- ---------------------------------------------------------------------------
-- Gyakorlatok
-- ---------------------------------------------------------------------------
create table public.exercises (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  icon       text not null default 'dumbbell',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------------------------------------------------------------------------
-- Bérlettípusok (pl. 10+1: 11 alkalom 10 alkalom áráért; 5+½: 6 alkalom 5,5 alkalom áráért)
-- ---------------------------------------------------------------------------
create table public.pass_products (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  name           text not null,
  total_sessions integer not null check (total_sessions > 0),
  paid_sessions  numeric(5,2) not null check (paid_sessions > 0),
  active         boolean not null default true
);

-- Megvásárolt bérletek. Az árat és az alkalomszámot vásárláskor rögzítjük,
-- hogy a későbbi árváltozás ne írja át a múltat.
create table public.passes (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  client_id      uuid not null references public.clients on delete restrict,
  product_id     uuid references public.pass_products on delete set null,
  name           text not null,
  total_sessions integer not null check (total_sessions > 0),
  price          integer not null check (price >= 0),
  purchased_on   date not null default current_date,
  notes          text,
  created_at     timestamptz not null default now()
);
create index passes_client_idx on public.passes (client_id, purchased_on desc);

-- ---------------------------------------------------------------------------
-- Időpontok (személyi vagy csoportos óra)
-- ---------------------------------------------------------------------------
create table public.appointments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  kind         text not null default 'personal' check (kind in ('personal', 'group')),
  client_id    uuid references public.clients on delete restrict,
  pass_id      uuid references public.passes on delete restrict,
  title        text,                                   -- csoportos óránál pl. "Reggeli köredzés"
  starts_at    timestamptz not null,
  duration_min integer not null default 60 check (duration_min > 0),
  status       text not null default 'scheduled'
               check (status in ('scheduled', 'done', 'cancelled', 'no_show')),
  price        integer check (price >= 0),             -- bérletes alkalomnál null
  notes        text,
  created_at   timestamptz not null default now(),
  constraint personal_needs_client check (kind = 'group' or client_id is not null),
  constraint pass_only_personal   check (pass_id is null or kind = 'personal')
);
create index appointments_user_time_idx on public.appointments (user_id, starts_at);
create index appointments_client_idx on public.appointments (client_id, starts_at desc);
create index appointments_pass_idx on public.appointments (pass_id) where pass_id is not null;

-- ---------------------------------------------------------------------------
-- Elvégzett sorozatok egy edzésen belül
-- ---------------------------------------------------------------------------
create table public.workout_sets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  appointment_id uuid not null references public.appointments on delete cascade,
  exercise_id    uuid not null references public.exercises on delete restrict,
  set_no         integer not null check (set_no > 0),
  reps           integer not null check (reps >= 0),
  weight_kg      numeric(6,2) check (weight_kg >= 0),
  notes          text,
  created_at     timestamptz not null default now()
);
create index workout_sets_appt_idx on public.workout_sets (appointment_id, exercise_id, set_no);
create index workout_sets_exercise_idx on public.workout_sets (exercise_id);

-- ---------------------------------------------------------------------------
-- Rendszeres havi kiadások (KATA, terembérlet…)
-- ---------------------------------------------------------------------------
create table public.recurring_expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  name         text not null,
  category     text not null default 'Egyéb',
  amount       integer not null check (amount >= 0),
  day_of_month integer not null default 1 check (day_of_month between 1 and 28),
  active       boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Pénzmozgások. Az `amount` mindig az, ami az edzőnél marad / amit ő fizet.
-- Edzésből és bérletből származó bevételt triggerek tartják szinkronban.
-- ---------------------------------------------------------------------------
create table public.transactions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users on delete cascade,
  type                 text not null check (type in ('income', 'expense')),
  category             text not null,
  occurred_on          date not null default current_date,
  amount               integer not null check (amount >= 0),
  gross_amount         integer check (gross_amount >= 0),
  referral_fee         integer not null default 0 check (referral_fee >= 0),
  client_id            uuid references public.clients on delete set null,
  appointment_id       uuid unique references public.appointments on delete cascade,
  pass_id              uuid unique references public.passes on delete cascade,
  recurring_expense_id uuid references public.recurring_expenses on delete set null,
  period               date,                           -- rendszeres kiadásnál a hónap első napja
  note                 text,
  created_at           timestamptz not null default now(),
  unique (recurring_expense_id, period)
);
create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);

-- ---------------------------------------------------------------------------
-- Bérletek hátralévő alkalmai
-- ---------------------------------------------------------------------------
create view public.pass_balances with (security_invoker = true) as
select
  p.id,
  p.user_id,
  p.client_id,
  p.name,
  p.total_sessions,
  p.purchased_on,
  count(a.id) filter (where a.status = 'done')::int                       as used_sessions,
  p.total_sessions - count(a.id) filter (where a.status = 'done')::int    as remaining_sessions
from public.passes p
left join public.appointments a on a.pass_id = p.id
group by p.id;

-- ---------------------------------------------------------------------------
-- Automatikus bevétel: elvégzett (nem bérletes) óra -> bevétel
-- ---------------------------------------------------------------------------
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

  if new.status = 'done' and new.pass_id is null and coalesce(new.price, 0) > 0 then
    if new.kind = 'personal' then
      select referral_share into v_share from public.clients where id = new.client_id;
    end if;
    v_fee := round(new.price * coalesce(v_share, 0));

    insert into public.transactions
      (user_id, type, category, occurred_on, amount, gross_amount, referral_fee, client_id, appointment_id)
    values
      (new.user_id, 'income',
       case new.kind when 'group' then 'Csoportos óra' else 'Személyi edzés' end,
       (new.starts_at at time zone 'Europe/Budapest')::date,
       new.price - v_fee, new.price, v_fee, new.client_id, new.id);
  end if;

  return new;
end;
$$;

create trigger appointments_sync_income
after insert or update of status, price, pass_id, client_id, kind, starts_at
on public.appointments
for each row execute function public.sync_appointment_income();

-- ---------------------------------------------------------------------------
-- Automatikus bevétel: bérletvásárlás -> bevétel
-- ---------------------------------------------------------------------------
create or replace function public.sync_pass_income()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_share numeric;
  v_fee   integer;
begin
  delete from public.transactions where pass_id = new.id;

  if new.price > 0 then
    select referral_share into v_share from public.clients where id = new.client_id;
    v_fee := round(new.price * coalesce(v_share, 0));

    insert into public.transactions
      (user_id, type, category, occurred_on, amount, gross_amount, referral_fee, client_id, pass_id)
    values
      (new.user_id, 'income', 'Bérlet', new.purchased_on,
       new.price - v_fee, new.price, v_fee, new.client_id, new.id);
  end if;

  return new;
end;
$$;

create trigger passes_sync_income
after insert or update of price, purchased_on, client_id
on public.passes
for each row execute function public.sync_pass_income();

-- ---------------------------------------------------------------------------
-- Rendszeres kiadások könyvelése egy adott hónapra (idempotens).
-- Az app hívja meg a pénzügyek / főoldal betöltésekor.
-- ---------------------------------------------------------------------------
create or replace function public.post_recurring_expenses(p_month date default current_date)
returns integer
language sql
set search_path = ''
as $$
  with ins as (
    insert into public.transactions
      (user_id, type, category, occurred_on, amount, recurring_expense_id, period, note)
    select r.user_id, 'expense', r.category,
           date_trunc('month', p_month)::date + (r.day_of_month - 1),
           r.amount, r.id, date_trunc('month', p_month)::date, r.name
    from public.recurring_expenses r
    where r.active and r.user_id = auth.uid()
    on conflict (recurring_expense_id, period) do nothing
    returning 1
  )
  select count(*)::int from ins;
$$;

-- ---------------------------------------------------------------------------
-- Új felhasználó: alapbeállítások, bérlettípusok, havi fix kiadások
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.settings (user_id) values (new.id);

  insert into public.pass_products (user_id, name, total_sessions, paid_sessions) values
    (new.id, '10+1 alkalmas bérlet', 11, 10),
    (new.id, '5+½ alkalmas bérlet',   6,  5.5);

  insert into public.recurring_expenses (user_id, name, category, amount, day_of_month) values
    (new.id, 'KATA',        'Adó',   50000, 1),
    (new.id, 'Terembérlet', 'Terem', 42000, 1);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'settings', 'clients', 'exercises', 'pass_products', 'passes',
    'appointments', 'workout_sets', 'recurring_expenses', 'transactions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;
