"use client";

import { useActionState } from "react";
import { Field, FormError, Input, SubmitButton, type ActionState } from "@/components/form";
import { Card } from "@/components/ui";
import { formatFt } from "@/lib/format";
import type { PassProduct, Settings } from "@/lib/types";
import { saveRecurringExpense, saveSettings } from "./actions";

type Recurring = { id: string; name: string; category: string; amount: number; active: boolean };

export function PricesForm({ settings, products }: { settings: Settings; products: PassProduct[] }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSettings, {});

  return (
    <Card className="p-5">
      <form action={action} className="space-y-4">
        <h2 className="font-semibold">Árak</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Személyi óra ára (Ft)">
            <Input name="session_price" type="number" inputMode="numeric" min={0} step={100} defaultValue={settings.session_price} />
          </Field>
          <Field label="Csoportos óra – saját rész (Ft)">
            <Input name="group_session_rate" type="number" inputMode="numeric" min={0} step={100} defaultValue={settings.group_session_rate} />
          </Field>
        </div>
        {products.length > 0 && (
          <ul className="space-y-1 rounded-xl bg-surface-2 px-4 py-3 text-sm">
            {products.map((p) => (
              <li key={p.id} className="flex justify-between gap-3">
                <span>
                  {p.name} <span className="text-muted">({p.total_sessions} alkalom)</span>
                </span>
                <span className="font-medium tabular-nums">{formatFt(p.paid_sessions * settings.session_price)}</span>
              </li>
            ))}
          </ul>
        )}
        <FormError state={state} />
        {state.ok && <p className="text-sm text-ok">Mentve.</p>}
        <SubmitButton>Mentés</SubmitButton>
      </form>
    </Card>
  );
}

export function RecurringExpenses({ items }: { items: Recurring[] }) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold">Havi fix kiadások</h2>
      <p className="mt-1 text-sm text-muted">Minden hónap elején automatikusan bekerülnek a pénzügyekbe.</p>
      <div className="mt-4 space-y-3">
        {items.map((r) => (
          <RecurringRow key={r.id} item={r} />
        ))}
        {/* A key miatt mentés után üres űrlap jelenik meg újra */}
        <RecurringRow key={`new-${items.length}`} />
      </div>
    </Card>
  );
}

function RecurringRow({ item }: { item?: Recurring }) {
  const [state, action] = useActionState<ActionState, FormData>(saveRecurringExpense, {});
  return (
    <form action={action} className="grid grid-cols-2 items-end gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto_auto]">
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <Field label="Megnevezés">
        <Input name="name" defaultValue={item?.name} placeholder="pl. Biztosítás" required />
      </Field>
      <Field label="Kategória">
        <Input name="category" defaultValue={item?.category} placeholder="Egyéb" />
      </Field>
      <Field label="Összeg (Ft)">
        <Input name="amount" type="number" inputMode="numeric" min={0} defaultValue={item?.amount} required />
      </Field>
      <label className="flex items-center gap-2 pb-3 text-sm">
        <input type="checkbox" name="active" defaultChecked={item?.active ?? true} className="size-4 accent-[var(--accent)]" />
        Aktív
      </label>
      <div className="col-span-2 sm:col-span-1">
        <SubmitButton>{item ? "Mentés" : "Hozzáadás"}</SubmitButton>
      </div>
      {(state.error || state.ok) && (
        <p className={`col-span-full text-sm ${state.error ? "text-danger" : "text-ok"}`}>{state.error ?? "Mentve."}</p>
      )}
    </form>
  );
}
