"use client";

import { useActionState } from "react";
import { Dumbbell } from "lucide-react";
import { login, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form action={action} className="w-full max-w-sm space-y-5">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-ink">
            <Dumbbell className="size-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">Edzőnapló</h1>
            <p className="text-sm text-muted">Jelentkezz be a folytatáshoz</p>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">E-mail</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Jelszó</span>
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent"
          />
        </label>

        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}

        <button
          disabled={pending}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-accent-ink transition active:scale-[.98] disabled:opacity-60"
        >
          {pending ? "Belépés…" : "Belépés"}
        </button>
      </form>
    </main>
  );
}
