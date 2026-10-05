// Az üzleti szabályok tesztje a valódi migrációkon, memóriában futó Postgresben (PGlite).
// Futtatás: npm run test:db
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const TRAINER = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const dir = new URL("../supabase/migrations/", import.meta.url);

let db;
const q = async (sql, params) => (await db.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const as = (uid) => db.exec(`set request.jwt.sub = '${uid}'; set role authenticated;`);
const asAdmin = () => db.exec(`reset role; reset request.jwt.sub;`);

before(async () => {
  db = new PGlite();
  // A Supabase auth sémájának minimális utánzata.
  await db.exec(`
    create role authenticated;
    create schema auth;
    grant usage on schema auth to authenticated;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
  `);
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(new URL(f, dir), "utf8"));
  }
  await db.exec(`
    grant usage on schema public to authenticated;
    grant all on all tables in schema public to authenticated;
    grant execute on all functions in schema public to authenticated;
    insert into auth.users values ('${TRAINER}', 'trainer@example.com'), ('${OTHER}', 'other@example.com');
    update public.settings set session_price = 9000;
  `);
});

test("új felhasználó alapbeállításokat kap", async () => {
  const products = await q(`select total_sessions, paid_sessions::float from pass_products where user_id = $1 order by total_sessions`, [TRAINER]);
  assert.deepEqual(products, [
    { total_sessions: 6, paid_sessions: 5.5 },
    { total_sessions: 11, paid_sessions: 10 },
    { total_sessions: 12, paid_sessions: 12 },
  ]);
  const recurring = await q(`select name, amount from recurring_expenses where user_id = $1 order by name`, [TRAINER]);
  assert.deepEqual(recurring, [
    { name: "KATA", amount: 50000 },
    { name: "Terembérlet", amount: 42000 },
  ]);
});

test("elvégzett alkalmi óra bevételt rögzít, a lemondás ingyenes, a kimaradás fizetős", async () => {
  await as(TRAINER);
  const { id: client } = await one(`insert into clients (name) values ('Anna') returning id`);
  const { id: appt } = await one(
    `insert into appointments (client_id, starts_at, price) values ($1, '2026-10-05 07:00+02', 9000) returning id`,
    [client],
  );
  const income = () => one(`select coalesce(sum(amount), 0)::int as sum from transactions where appointment_id = $1`, [appt]);

  assert.equal((await income()).sum, 0, "tervezett óra még nem bevétel");
  await q(`update appointments set status = 'done' where id = $1`, [appt]);
  assert.equal((await income()).sum, 9000);
  await q(`update appointments set status = 'cancelled' where id = $1`, [appt]);
  assert.equal((await income()).sum, 0, "lemondott óra ingyenes");
  await q(`update appointments set status = 'no_show' where id = $1`, [appt]);
  assert.equal((await income()).sum, 9000, "lemondás nélküli kimaradás fizetős");
  await asAdmin();
});

test("ajánlott kliensnél 1/3 az ajánlóé, bérletnél és alkalmi óránál is", async () => {
  await as(TRAINER);
  const { id: client } = await one(
    `insert into clients (name, referral_partner, referral_share) values ('Béla', 'Program', 0.33333) returning id`,
  );
  const pass = await one(
    `insert into passes (client_id, name, total_sessions, price) values ($1, '12 alkalmas', 12, 108000) returning id`,
    [client],
  );
  const tx = await one(`select gross_amount, referral_fee, amount from transactions where pass_id = $1`, [pass.id]);
  assert.deepEqual(tx, { gross_amount: 108000, referral_fee: 36000, amount: 72000 });

  const { id: appt } = await one(
    `insert into appointments (client_id, starts_at, price, status) values ($1, now(), 9000, 'done') returning id`,
    [client],
  );
  const single = await one(`select referral_fee, amount from transactions where appointment_id = $1`, [appt]);
  assert.deepEqual(single, { referral_fee: 3000, amount: 6000 });
  await asAdmin();
});

test("bérletes alkalom nem bevétel, de fogy a bérletből (elvégzett és kimaradt is)", async () => {
  await as(TRAINER);
  const { id: client } = await one(`insert into clients (name) values ('Csilla') returning id`);
  const { id: pass } = await one(
    `insert into passes (client_id, name, total_sessions, price) values ($1, '10+1', 11, 90000) returning id`,
    [client],
  );
  for (const status of ["done", "no_show", "cancelled", "scheduled"]) {
    await q(`insert into appointments (client_id, pass_id, starts_at, status) values ($1, $2, now(), $3)`, [client, pass, status]);
  }
  const balance = await one(`select used_sessions, remaining_sessions from pass_balances where id = $1`, [pass]);
  assert.deepEqual(balance, { used_sessions: 2, remaining_sessions: 9 });
  const apptIncome = await one(
    `select count(*)::int as n from transactions t join appointments a on a.id = t.appointment_id where a.pass_id = $1`,
    [pass],
  );
  assert.equal(apptIncome.n, 0, "bérletes órához nincs külön bevétel");
  await asAdmin();
});

test("csoportos óra a fix saját részt rögzíti", async () => {
  await as(TRAINER);
  const { id } = await one(
    `insert into appointments (kind, title, starts_at, price, status) values ('group', 'Köredzés', now(), 5500, 'done') returning id`,
  );
  const tx = await one(`select category, amount from transactions where appointment_id = $1`, [id]);
  assert.deepEqual(tx, { category: "Csoportos óra", amount: 5500 });
  await asAdmin();
});

test("a bevétel napja budapesti idő szerint számít", async () => {
  await as(TRAINER);
  const { id: client } = await one(`insert into clients (name) values ('Dóra') returning id`);
  // 23:30 budapesti idő = 21:30 UTC, mégis aznapra kell könyvelni
  const { id } = await one(
    `insert into appointments (client_id, starts_at, price, status) values ($1, '2026-10-02 23:30+02', 9000, 'done') returning id`,
    [client],
  );
  const tx = await one(`select occurred_on::text from transactions where appointment_id = $1`, [id]);
  assert.equal(tx.occurred_on, "2026-10-02");
  await asAdmin();
});

test("havi fix kiadások hónaponként egyszer könyvelődnek", async () => {
  await as(TRAINER);
  const first = await one(`select post_recurring_expenses('2026-11-15') as n`);
  const again = await one(`select post_recurring_expenses('2026-11-28') as n`);
  assert.equal(first.n, 2);
  assert.equal(again.n, 0, "újrahívásra nem duplikál");
  await asAdmin();
});

test("RLS: egy edző nem látja és nem módosíthatja a másik adatait", async () => {
  await as(TRAINER);
  const mine = await one(`select count(*)::int as n from clients`);
  assert.ok(mine.n > 0);
  await asAdmin();

  await as(OTHER);
  assert.equal((await one(`select count(*)::int as n from clients`)).n, 0);
  assert.equal((await one(`select count(*)::int as n from transactions`)).n, 0);
  const updated = await q(`update clients set name = 'hacked' returning id`);
  assert.equal(updated.length, 0);
  await asAdmin();
});
