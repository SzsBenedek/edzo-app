-- Demo adatok egy meglévő felhasználóhoz.
-- Futtatás: Supabase -> SQL Editor. Az e-mail-címet lent a v_email változóban állítsd be.
-- Az időpontok a futtatás napjához igazodnak: az elmúlt 6 hét elvégzett edzései és a következő 2 hét.
-- FIGYELEM: a szkript először TÖRLI az adott felhasználó összes kliensét, időpontját, bérletét,
-- gyakorlatát és pénzmozgását, hogy újrafuttatva se duplikáljon. Éles fiókon ne futtasd!

do $$
declare
  v_email text := 'benedekszabosafar@gmail.com';
  v_user  uuid;
  v_price integer := 9000;          -- demo óraár
  v_10    uuid;                     -- 10+1 bérlettípus
  v_5     uuid;                     -- 5+½ bérlettípus
  v_ex    uuid[];
  v_base  numeric[];
  v_client uuid;
  v_pass  uuid;
  v_left  integer;
  v_appt  uuid;
  v_status text;
  v_roll  integer;
  v_n     integer;
  v_day   date;
  c       record;
  i       integer;
  e       integer;
  s       integer;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    raise exception 'Nincs ilyen felhasználó: %', v_email;
  end if;

  -- Tiszta lap (a sorrend az idegen kulcsok miatt számít)
  delete from public.transactions where user_id = v_user;
  delete from public.appointments where user_id = v_user;
  delete from public.passes       where user_id = v_user;
  delete from public.clients      where user_id = v_user;
  delete from public.exercises    where user_id = v_user;

  -- Beállítások, bérlettípusok, fix kiadások (ha a regisztrációs trigger valamiért nem hozta létre)
  insert into public.settings (user_id, session_price, group_session_rate)
  values (v_user, v_price, 5500)
  on conflict (user_id) do update set session_price = excluded.session_price;

  if not exists (select 1 from public.pass_products where user_id = v_user) then
    insert into public.pass_products (user_id, name, total_sessions, paid_sessions) values
      (v_user, '10+1 alkalmas bérlet', 11, 10),
      (v_user, '5+½ alkalmas bérlet',   6,  5.5);
  end if;
  if not exists (select 1 from public.recurring_expenses where user_id = v_user) then
    insert into public.recurring_expenses (user_id, name, category, amount, day_of_month) values
      (v_user, 'KATA',        'Adó',   50000, 1),
      (v_user, 'Terembérlet', 'Terem', 42000, 1);
  end if;

  select id into v_10 from public.pass_products where user_id = v_user and total_sessions = 11 limit 1;
  select id into v_5  from public.pass_products where user_id = v_user and total_sessions = 6  limit 1;

  -- Gyakorlatok és a hozzájuk tartozó kezdősúly (null = saját testsúly)
  create temp table demo_ex (ord int, name text, icon text, base numeric) on commit drop;
  insert into demo_ex values
    (1,  'Guggolás',         'person-standing', 30),
    (2,  'Felhúzás',         'dumbbell',        40),
    (3,  'Fekvenyomás',      'dumbbell',        25),
    (4,  'Evezés kábelen',   'repeat',          25),
    (5,  'Kitörés',          'footprints',      10),
    (6,  'Csípőemelés',      'move-vertical',   40),
    (7,  'Vállból nyomás',   'biceps-flexed',   10),
    (8,  'Lehúzás',          'move-vertical',   30),
    (9,  'Bicepsz hajlítás', 'biceps-flexed',   7.5),
    (10, 'Plank',            'timer',           null),
    (11, 'Kettlebell swing', 'flame',           12),
    (12, 'Szobabicikli',     'bike',            null);

  insert into public.exercises (user_id, name, icon) select v_user, name, icon from demo_ex order by ord;

  select array_agg(x.id order by d.ord), array_agg(d.base order by d.ord)
  into v_ex, v_base
  from demo_ex d join public.exercises x on x.name = d.name and x.user_id = v_user;

  -- Kliensek: név, telefon, cél, ajánló, arány, edzésnapok (1 = hétfő), óra, fizetés, aktív
  for c in
    select * from (values
      ('Kovács Anna',     '+36 30 123 4567', 'Fogyás, állóképesség',   null,           0::numeric,  array[1,4], 7,  'pass10', true),
      ('Nagy Bence',      '+36 20 234 5678', 'Izomépítés',             null,           0,           array[2,5], 17, 'pass10', true),
      ('Szabó Réka',      '+36 70 345 6789', 'Szülés utáni erősödés',  null,           0,           array[3],   10, 'pass5',  true),
      ('Tóth Márton',     '+36 30 456 7890', 'Hátfájás megelőzése',    'FitLife Stúdió', 0.33333,   array[1,3], 18, 'single', true),
      ('Horváth Lilla',   '+36 20 567 8901', 'Futóverseny-felkészülés','FitLife Stúdió', 0.33333,   array[2,4], 8,  'pass10', true),
      ('Varga Dániel',    '+36 70 678 9012', 'Erősödés',               null,           0,           array[6],   9,  'single', true),
      ('Kiss Eszter',     '+36 30 789 0123', 'Tartásjavítás',          null,           0,           array[5],   12, 'pass5',  true),
      ('Molnár Gergely',  '+36 20 890 1234', 'Térdrehab',              null,           0,           array[2],   19, 'single', false)
    ) as t(name, phone, goal, partner, share, days, hour, pay, active)
  loop
    insert into public.clients (user_id, name, phone, goal, referral_partner, referral_share, active)
    values (v_user, c.name, c.phone, c.goal, c.partner, c.share, c.active)
    returning id into v_client;

    v_pass := null;
    v_left := 0;
    v_n := 0;

    for v_day in
      select d::date from generate_series(current_date - 42, current_date + 14, interval '1 day') d
      where extract(isodow from d)::int = any (c.days)
    loop
      -- Archivált kliens csak a múltban edzett, a legutóbbi két hétben már nem
      continue when not c.active and v_day > current_date - 14;

      -- Determinisztikus "véletlen", hogy újrafuttatva ugyanaz legyen
      v_roll := abs(hashtext(c.name || v_day::text)) % 100;
      v_status := case
        when v_day >= current_date then 'scheduled'
        when v_roll < 5 then 'cancelled'
        when v_roll < 9 then 'no_show'
        else 'done'
      end;

      if c.pay in ('pass10', 'pass5') and v_status in ('done', 'no_show', 'scheduled') then
        if v_left = 0 then
          insert into public.passes (user_id, client_id, product_id, name, total_sessions, price, purchased_on)
          select v_user, v_client, p.id, p.name, p.total_sessions, round(p.paid_sessions * v_price), least(v_day, current_date)
          from public.pass_products p
          where p.id = case c.pay when 'pass10' then v_10 else v_5 end
          returning id, total_sessions into v_pass, v_left;
        end if;
        v_left := v_left - 1;

        insert into public.appointments (user_id, kind, client_id, pass_id, starts_at, duration_min, status)
        values (v_user, 'personal', v_client, v_pass,
                (v_day + make_time(c.hour, 0, 0)) at time zone 'Europe/Budapest', 60, v_status)
        returning id into v_appt;
      else
        insert into public.appointments (user_id, kind, client_id, starts_at, duration_min, status, price)
        values (v_user, 'personal', v_client,
                (v_day + make_time(c.hour, 0, 0)) at time zone 'Europe/Budapest', 60, v_status, v_price)
        returning id into v_appt;
      end if;

      -- Elvégzett edzéshez sorozatok, hétről hétre enyhe fejlődéssel
      if v_status = 'done' then
        v_n := v_n + 1;
        for e in 0..3 loop
          i := 1 + ((e + v_n + length(c.name)) % array_length(v_ex, 1));
          for s in 1..3 loop
            insert into public.workout_sets (user_id, appointment_id, exercise_id, set_no, reps, weight_kg)
            values (v_user, v_appt, v_ex[i], s,
                    12 - s - (v_n % 2),
                    -- kezdősúly + kliensenkénti eltérés + kéthetente 2,5 kg fejlődés
                    v_base[i] + (length(c.name) % 3) * 2.5 + (v_n / 2) * 2.5);
          end loop;
        end loop;
      end if;
    end loop;
  end loop;

  -- Csoportos órák: kedd és csütörtök 18:00
  insert into public.appointments (user_id, kind, title, starts_at, duration_min, status, price)
  select v_user, 'group', 'Esti köredzés',
         (d::date + time '18:00') at time zone 'Europe/Budapest', 60,
         case when d::date < current_date then 'done' else 'scheduled' end, 5500
  from generate_series(current_date - 42, current_date + 14, interval '1 day') d
  where extract(isodow from d) in (2, 4);

  -- Havi fix kiadások az elmúlt két hónapra és az aktuálisra
  insert into public.transactions (user_id, type, category, occurred_on, amount, recurring_expense_id, period, note)
  select v_user, 'expense', r.category,
         (date_trunc('month', m) + (r.day_of_month - 1) * interval '1 day')::date,
         r.amount, r.id, date_trunc('month', m)::date, r.name
  from public.recurring_expenses r
  cross join generate_series(date_trunc('month', current_date) - interval '2 months',
                             date_trunc('month', current_date), interval '1 month') m
  where r.user_id = v_user and r.active
  on conflict (recurring_expense_id, period) do nothing;

  -- Néhány egyedi kiadás
  insert into public.transactions (user_id, type, category, occurred_on, amount, note) values
    (v_user, 'expense', 'Eszköz',    current_date - 35, 24990, 'Kettlebell szett'),
    (v_user, 'expense', 'Képzés',    current_date - 20, 45000, 'Funkcionális tréning workshop'),
    (v_user, 'expense', 'Marketing', current_date - 8,  12000, 'Instagram hirdetés');

  raise notice 'Kész: % kliens, % időpont, % bérlet.',
    (select count(*) from public.clients where user_id = v_user),
    (select count(*) from public.appointments where user_id = v_user),
    (select count(*) from public.passes where user_id = v_user);
end;
$$;
