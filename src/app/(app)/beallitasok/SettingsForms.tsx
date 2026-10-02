"use client";

import { useActionState, useState } from "react";
import { Field, FormError, Input, SubmitButton, type ActionState } from "@/components/form";
import { Card } from "@/components/ui";
import { formatFt } from "@/lib/format";
import type { PassProduct, Settings } from "@/lib/types";
import { savePassProduct, saveRecurringExpense, saveSettings } from "./actions";

type Recurring = { id: string; name: string; category: string; amount: number; active: boolean };

export function PricesForm({ settings }: { settings: Settings }) {
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

export function PassProducts({ items, sessionPrice }: { items: PassProduct[]; sessionPrice: number }) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold">Bérlettípusok</h2>
      <p className="mt-1 text-sm text-muted">
        Az ár = fizetett alkalmak × óraár. Eladáskor az ár még átírható, ajánlott kliensnél az ajánlói rész automatikusan levonódik.
      </p>
      <div className="mt-4 space-y-3">
        {items.map((p) => (
          <PassProductRow key={p.id} item={p} sessionPrice={sessionPrice} />
        ))}
        {/* A key miatt mentés után üres űrlap jelenik meg újra */}
        <PassProductRow key={`new-${items.length}`} sessionPrice={sessionPrice} />
      </div>
    </Card>
  );
}

function PassProductRow({ item, sessionPrice }: { item?: PassProduct; sessionPrice: number }) {
  const [state, action] = useActionState<ActionState, FormData>(savePassProduct, {});
  const [paid, setPaid] = useState(item?.paid_sessions ?? 0);
  return (
    <form action={action} className="grid grid-cols-2 items-end gap-2 rounded-xl border border-line p-3 sm:grid-cols-[1.6fr_.8fr_.9fr_auto_auto]">
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <div className="col-span-2 sm:col-span-1">
        <Field label="Megnevezés">
          <Input name="name" defaultValue={item?.name} placeholder="pl. 12 alkalmas bérlet" required />
        </Field>
      </div>
      <Field label="Alkalmak">
        <Input name="total_sessions" type="number" inputMode="numeric" min={1} step={1} defaultValue={item?.total_sessions} required />
      </Field>
      <Field label="Fizetett alkalom" hint={paid > 0 && sessionPrice > 0 ? formatFt(paid * sessionPrice) : undefined}>
        <Input
          name="paid_sessions"
          type="number"
          inputMode="decimal"
          min={0.5}
          step={0.5}
          defaultValue={item?.paid_sessions}
          onChange={(e) => setPaid(Number(e.target.value))}
          required
        />
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
