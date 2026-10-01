"use client";

import { useActionState, useState } from "react";
import { Field, FormError, Input, Select, SubmitButton, Textarea, type ActionState } from "@/components/form";
import { formatFt } from "@/lib/format";
import { createAppointment } from "../actions";

type ClientOption = { id: string; name: string; referral_share: number };
type PassOption = { id: string; client_id: string; name: string; remaining_sessions: number };
type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Szerkesztésnél a meglévő időpont adatai. */
export type AppointmentInitial = {
  kind: "personal" | "group";
  client_id: string | null;
  pass_id: string | null;
  price: number | null;
  title: string | null;
  notes: string | null;
  date: string;
  time: string;
  duration: number;
};

const DURATIONS = [30, 45, 60, 90];

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; disabled?: boolean }[];
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-40 ${
            value === o.value ? "bg-surface text-text shadow-sm" : "text-muted"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AppointmentForm({
  clients,
  passes,
  sessionPrice,
  groupRate,
  defaultDate,
  defaultClientId,
  initial,
  action: submitAction = createAppointment,
}: {
  clients: ClientOption[];
  passes: PassOption[];
  sessionPrice: number;
  groupRate: number;
  defaultDate: string;
  defaultClientId?: string;
  initial?: AppointmentInitial;
  action?: Action;
}) {
  const editing = Boolean(initial);
  const [state, action] = useActionState<ActionState, FormData>(submitAction, {});
  const [kind, setKind] = useState<"personal" | "group">(initial?.kind ?? "personal");
  const [clientId, setClientId] = useState(initial?.client_id ?? defaultClientId ?? "");
  const clientPasses = passes.filter((p) => p.client_id === clientId);
  const [payment, setPayment] = useState<"pass" | "single">(
    initial ? (initial.pass_id ? "pass" : "single") : clientPasses.length ? "pass" : "single",
  );
  const [price, setPrice] = useState(initial?.price ?? (initial?.kind === "group" ? groupRate : sessionPrice));
  const [duration, setDuration] = useState(initial?.duration ?? 60);
  const [repeat, setRepeat] = useState(1);

  const client = clients.find((c) => c.id === clientId);
  // Szerkesztésnél a már hozzárendelt bérlet marad, egyébként a legrégebbi aktív.
  const pass = clientPasses.find((p) => p.id === initial?.pass_id) ?? clientPasses[0];
  const durations = DURATIONS.includes(duration) ? DURATIONS : [...DURATIONS, duration].sort((a, b) => a - b);
  const fee = kind === "personal" && payment === "single" && client ? Math.round(price * client.referral_share) : 0;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="duration" value={duration} />
      <input type="hidden" name="repeat" value={repeat} />

      {!editing && (
        <Segmented
          value={kind}
          onChange={(k) => {
            setKind(k);
            setPrice(k === "group" ? groupRate : sessionPrice);
          }}
          options={[
            { value: "personal", label: "Személyi edzés" },
            { value: "group", label: "Csoportos óra" },
          ]}
        />
      )}

      {kind === "personal" ? (
        <>
          <Field label="Kliens">
            <Select
              name="client_id"
              value={clientId}
              required
              onChange={(e) => {
                setClientId(e.target.value);
                setPayment(passes.some((p) => p.client_id === e.target.value) ? "pass" : "single");
              }}
            >
              <option value="" disabled>
                Válassz…
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          {clientId && (
            <div className="space-y-3">
              <input type="hidden" name="payment" value={payment} />
              <input type="hidden" name="pass_id" value={payment === "pass" ? (pass?.id ?? "") : ""} />
              <Segmented
                value={payment}
                onChange={setPayment}
                options={[
                  { value: "pass", label: "Bérletből", disabled: !pass },
                  { value: "single", label: "Alkalmi díj" },
                ]}
              />
              {payment === "pass" && pass ? (
                <p className="text-sm text-muted">
                  {pass.name} · <b className="text-text">{pass.remaining_sessions} alkalom</b> maradt
                  {repeat > pass.remaining_sessions && (
                    <span className="block text-accent">Figyelem: több időpontot foglalsz, mint ahány alkalom maradt.</span>
                  )}
                </p>
              ) : (
                <Field label="Ár (Ft)">
                  <Input name="price" type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                </Field>
              )}
              {!pass && <p className="text-xs text-muted">Nincs aktív bérlete. Bérletet a kliens adatlapján tudsz eladni.</p>}
              {fee > 0 && (
                <p className="text-sm text-muted">
                  Ajánlónak jár: {formatFt(fee)} · Nálad marad: <b className="text-text">{formatFt(price - fee)}</b>
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Megnevezés">
            <Input name="title" placeholder="pl. Reggeli köredzés" defaultValue={initial?.title ?? ""} />
          </Field>
          <Field label="Saját rész (Ft)">
            <Input name="price" type="number" inputMode="numeric" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Field label="Nap">
          <Input name="date" type="date" defaultValue={initial?.date ?? defaultDate} required />
        </Field>
        <Field label="Kezdés">
          <Input name="time" type="time" defaultValue={initial?.time ?? "08:00"} step={300} required />
        </Field>
      </div>

      <div>
        <div className="mb-1.5 text-sm font-medium">Időtartam</div>
        <Segmented
          value={String(duration)}
          onChange={(v) => setDuration(Number(v))}
          options={durations.map((d) => ({ value: String(d), label: `${d} p` }))}
        />
      </div>

      {!editing && (
        <div>
          <div className="mb-1.5 text-sm font-medium">Ismétlés</div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setRepeat((r) => Math.max(1, r - 1))} className="grid size-11 place-items-center rounded-xl border border-line text-lg">
              −
            </button>
            <span className="min-w-28 text-center text-sm">
              {repeat === 1 ? "Csak egyszer" : <><b className="text-base">{repeat}</b> héten át, hetente</>}
            </span>
            <button type="button" onClick={() => setRepeat((r) => Math.min(12, r + 1))} className="grid size-11 place-items-center rounded-xl border border-line text-lg">
              +
            </button>
          </div>
        </div>
      )}

      <Field label="Jegyzet">
        <Textarea name="notes" rows={2} defaultValue={initial?.notes ?? ""} />
      </Field>

      <FormError state={state} />
      <SubmitButton>{editing ? "Változások mentése" : repeat > 1 ? `${repeat} időpont mentése` : "Időpont mentése"}</SubmitButton>
    </form>
  );
}
