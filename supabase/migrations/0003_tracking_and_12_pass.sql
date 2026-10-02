-- 1) Gyakorlatonként mit rögzítünk:
--    weight      = súly + ismétlés (alapértelmezett, eddig minden ilyen volt)
--    time        = csak időtartam (pl. plank, szobabicikli)
--    weight_time = súly + időtartam (pl. farmer séta, súlyozott plank)
alter table public.exercises
  add column tracking text not null default 'weight'
  check (tracking in ('weight', 'time', 'weight_time'));

-- Időalapú sorozatnál nincs ismétlésszám, helyette másodperc.
alter table public.workout_sets alter column reps drop not null;
alter table public.workout_sets
  add column duration_sec integer check (duration_sec >= 0);

-- 2) 12 alkalmas bérlet (pl. másik programból érkező klienseknek).
--    Az ajánlói rész a kliensnél beállított arány szerint vonódik le a bérlet árából.
insert into public.pass_products (user_id, name, total_sessions, paid_sessions)
select u.id, '12 alkalmas bérlet', 12, 12
from auth.users u
where not exists (
  select 1 from public.pass_products p where p.user_id = u.id and p.total_sessions = 12
);

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
    (new.id, '5+½ alkalmas bérlet',   6,  5.5),
    (new.id, '12 alkalmas bérlet',   12, 12);

  insert into public.recurring_expenses (user_id, name, category, amount, day_of_month) values
    (new.id, 'KATA',        'Adó',   50000, 1),
    (new.id, 'Terembérlet', 'Terem', 42000, 1);

  return new;
end;
$$;
