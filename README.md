# Edzőnapló

Személyi edzőknek: kliensek, időpontok, edzésnapló, bérletek és pénzügyek egy helyen.
Next.js 16 + Supabase (Postgres, Auth, RLS).

## Beállítás

1. Hozz létre egy projektet a [supabase.com](https://supabase.com)-on.
2. **SQL Editor** → futtasd le sorban a `supabase/migrations/` fájljait (0001, 0002, …).
3. **Authentication → Users → Add user**: hozd létre az edző fiókját (e-mail + jelszó).
   Utána **Authentication → Sign In / Providers**: kapcsold ki a regisztrációt ("Allow new users to sign up"), hogy más ne tudjon fiókot nyitni.
4. **Project Settings → API**: másold az URL-t és a publishable (vagy anon) kulcsot a `.env.local` fájlba (minta: `.env.example`).
5. `npm install`, majd `npm run dev`.

## Üzleti logika (adatbázis-triggerek)

- Elvégzett vagy lemondás nélkül kihagyott ("Nem jött el"), nem bérletes óra → automatikus bevétel (ajánlott kliensnél az ajánlói rész levonva). A "Lemondva" ingyenes.
- Bérletes óránál az "Elvégezve" és a "Nem jött el" is levon egy alkalmat.
- Bérletvásárlás → bevétel a vásárlás napján; bérletes alkalom csak a hátralévő alkalmakat csökkenti (`pass_balances` nézet).
- Havi fix kiadások (`recurring_expenses`) → a `post_recurring_expenses()` minden hónapra egyszer lekönyveli.
- Új felhasználónál alapértékek: 10+1 és 5+½ bérlet, KATA 50 000 Ft, terembérlet 42 000 Ft.
