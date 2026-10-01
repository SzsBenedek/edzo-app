"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { CalendarCheck, Repeat, Ticket, Trash2 } from "lucide-react";
import { Field, FormError, Input, SubmitButton, type ActionState } from "@/components/form";
import { Card, EmptyState } from "@/components/ui";
import { formatFt } from "@/lib/format";
import { createTransaction, deleteTransaction } from "./actions";

export type TxRow = {
  id: string;
  type: "income" | "expense";
  category: string;
  occurred_on: string;
  amount: number;
  referral_fee: number;
  note: string | null;
  appointment_id: string | null;
  pass_id: string | null;
  recurring_expense_id: string | null;
  client: { name: string } | null;
};

const dayFmt = new Intl.DateTimeFormat("hu-HU", { month: "long", day: "numeric", weekday: "short", timeZone: "UTC" });

export function AddTransactionForm({ categories, defaultDate }: { categories: string[]; defaultDate: string }) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState<ActionState, FormData>(async (prev, fd) => {
    const r = await createTransaction(prev, fd);
    if (r.ok) formRef.current?.reset();
    return r;
  }, {});

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <h2 className="font-semibold">Új tétel</h2>
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-lg py-2 text-sm font-medium ${type === t ? "bg-surface shadow-sm" : "text-muted"}`}
          >
            {t === "expense" ? "Kiadás" : "Egyéb bevétel"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Összeg (Ft)">
          <Input name="amount" type="number" inputMode="numeric" min={1} required />
        </Field>
        <Field label="Dátum">
          <Input name="occurred_on" type="date" defaultValue={defaultDate} required />
        </Field>
      </div>
      <Field label="Kategória">
        <Input name="category" list="tx-categories" placeholder="pl. Eszköz, Képzés" autoComplete="off" />
        <datalist id="tx-categories">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <Field label="Megjegyzés">
        <Input name="note" placeholder="pl. Kettlebell szett" autoComplete="off" />
      </Field>
      <FormError state={state} />
      {state.ok && <p className="text-sm text-ok">Rögzítve.</p>}
      <SubmitButton>Rögzítés</SubmitButton>
    </form>
  );
}

function sourceIcon(t: TxRow) {
  if (t.appointment_id) return { Icon: CalendarCheck, label: "Edzésből automatikusan" };
  if (t.pass_id) return { Icon: Ticket, label: "Bérletvásárlásból automatikusan" };
  if (t.recurring_expense_id) return { Icon: Repeat, label: "Havi fix kiadás (Beállításokban szerkeszthető)" };
  return null;
}

export function TransactionList({ items }: { items: TxRow[] }) {
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();

  const visible = items.filter((t) => !hidden.has(t.id) && (filter === "all" || t.type === filter));
  const byDay = new Map<string, TxRow[]>();
  for (const t of visible) byDay.set(t.occurred_on, [...(byDay.get(t.occurred_on) ?? []), t]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-semibold">Tételek</h2>
        <div className="flex gap-1 rounded-xl bg-surface-2 p-1 text-sm">
          {([
            ["all", "Mind"],
            ["income", "Bevétel"],
            ["expense", "Kiadás"],
          ] as const).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className={`rounded-lg px-3 py-1.5 font-medium ${filter === v ? "bg-surface shadow-sm" : "text-muted"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}

      {visible.length === 0 ? (
        <EmptyState title="Ebben a hónapban nincs tétel" />
      ) : (
        <Card className="overflow-hidden">
          {[...byDay.entries()].map(([day, rows]) => (
            <section key={day}>
              <h3 className="bg-surface-2 px-4 py-1.5 text-xs font-medium text-muted first-letter:uppercase">
                {dayFmt.format(new Date(`${day}T12:00:00Z`))}
              </h3>
              <ul className="divide-y divide-line">
                {rows.map((t) => {
                  const src = sourceIcon(t);
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{ background: t.type === "income" ? "var(--series-income)" : "var(--series-expense)" }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{t.client?.name ?? t.note ?? t.category}</div>
                        <div className="flex items-center gap-1.5 truncate text-sm text-muted">
                          {src && <src.Icon className="size-3.5 shrink-0" aria-label={src.label} />}
                          {t.category}
                          {t.client && t.note && ` · ${t.note}`}
                          {t.referral_fee > 0 && ` · ajánlónak ${formatFt(t.referral_fee)}`}
                        </div>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {t.type === "income" ? "+" : "−"}
                        {formatFt(t.amount)}
                      </span>
                      {src ? (
                        <span className="w-8" />
                      ) : (
                        <button
                          aria-label="Tétel törlése"
                          onClick={() => {
                            if (!confirm("Törlöd ezt a tételt?")) return;
                            setHidden((h) => new Set(h).add(t.id));
                            startTransition(async () => {
                              const r = await deleteTransaction(t.id);
                              if (r.error) {
                                setError(r.error);
                                setHidden((h) => {
                                  const n = new Set(h);
                                  n.delete(t.id);
                                  return n;
                                });
                              }
                            });
                          }}
                          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:text-danger"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </Card>
      )}
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1"><CalendarCheck className="size-3.5" /> edzésből</span>
        <span className="flex items-center gap-1"><Ticket className="size-3.5" /> bérletből</span>
        <span className="flex items-center gap-1"><Repeat className="size-3.5" /> havi fix</span>
        <span>– ezek automatikusan jönnek, ezért itt nem törölhetők.</span>
      </p>
    </div>
  );
}
