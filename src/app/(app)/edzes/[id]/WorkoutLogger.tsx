"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, Minus, Plus, Search, Trash2, X } from "lucide-react";
import { ExerciseIcon } from "@/components/ExerciseIcon";
import { Card } from "@/components/ui";
import type { Exercise, WorkoutSet } from "@/lib/types";
import { addSet, deleteSet, updateSet } from "./actions";

type PrevSet = { reps: number; weight_kg: number | null };

const fmtKg = (w: number | null) => (w ? `${Number(w)} kg` : "saját súly");

export function WorkoutLogger({
  appointmentId,
  initialSets,
  exercises,
  previous,
}: {
  appointmentId: string;
  initialSets: WorkoutSet[];
  exercises: Exercise[];
  previous: Record<string, PrevSet[]>; // gyakorlat -> a legutóbbi edzés sorozatai
}) {
  const [sets, setSets] = useState(initialSets);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(0);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const setsRef = useRef(sets);
  useEffect(() => {
    setsRef.current = sets;
  }, [sets]);

  // Gyakorlatok abban a sorrendben, ahogy az edzésen először szerepeltek.
  const order = useMemo(() => [...new Set(sets.map((s) => s.exercise_id))], [sets]);
  const exerciseById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  function track<T>(promise: Promise<T & { error?: string }>) {
    setSaving((n) => n + 1);
    promise
      .then((r) => r.error && setError(r.error))
      .catch(() => setError("Nincs kapcsolat – a változás nem mentődött."))
      .finally(() => setSaving((n) => n - 1));
    return promise;
  }

  function create(exerciseId: string, reps: number, weight: number | null) {
    const setNo = sets.filter((s) => s.exercise_id === exerciseId).length + 1;
    startTransition(async () => {
      const res = await track(addSet(appointmentId, exerciseId, setNo, reps, weight));
      if (res.set) setSets((prev) => [...prev, res.set!]);
    });
  }

  function change(id: string, patch: Partial<Pick<WorkoutSet, "reps" | "weight_kg">>) {
    const current = setsRef.current.find((s) => s.id === id);
    if (!current) return;
    const next = { ...current, ...patch };
    setsRef.current = setsRef.current.map((s) => (s.id === id ? next : s));
    setSets(setsRef.current);
    // Gyors koppintásoknál csak az utolsó értéket küldjük el.
    clearTimeout(timers.current.get(id));
    timers.current.set(
      id,
      setTimeout(() => track(updateSet(id, next.reps, next.weight_kg)), 600),
    );
  }

  function remove(id: string) {
    clearTimeout(timers.current.get(id));
    setSets((prev) => prev.filter((s) => s.id !== id));
    track(deleteSet(id));
  }

  function addExercise(exerciseId: string) {
    setPickerOpen(false);
    const first = previous[exerciseId]?.[0];
    create(exerciseId, first?.reps ?? 10, first?.weight_kg ?? null);
  }

  return (
    <div className="space-y-4">
      <div className="flex h-5 items-center justify-end text-xs text-muted" aria-live="polite">
        {saving > 0 ? "Mentés…" : sets.length > 0 && (
          <span className="flex items-center gap-1 text-ok">
            <Check className="size-3.5" /> Mentve
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-accent-soft px-4 py-2 text-sm text-accent">
          {error}
        </p>
      )}

      {order.map((exerciseId) => {
        const ex = exerciseById.get(exerciseId);
        const exSets = sets.filter((s) => s.exercise_id === exerciseId);
        const prev = previous[exerciseId];
        const last = exSets[exSets.length - 1];
        return (
          <Card key={exerciseId} className="p-4">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
                <ExerciseIcon name={ex?.icon ?? "dumbbell"} />
              </span>
              <div className="min-w-0">
                <h3 className="truncate font-semibold">{ex?.name ?? "Gyakorlat"}</h3>
                {prev && (
                  <p className="truncate text-xs text-muted">
                    Múltkor: {prev.map((p) => `${p.weight_kg ? Number(p.weight_kg) + "×" : ""}${p.reps}`).join(", ")}
                  </p>
                )}
              </div>
            </div>

            {exSets.length > 0 && (
              <div className="mb-1.5 flex gap-1.5 text-xs text-muted sm:gap-2" aria-hidden>
                <span className="w-5 shrink-0 sm:w-6" />
                <span className="flex-1 text-center">Súly (kg)</span>
                <span className="flex-1 text-center">Ismétlés</span>
                <span className="w-8 shrink-0 sm:w-10" />
              </div>
            )}
            <ul className="space-y-2">
              {exSets.map((s, i) => (
                <li key={s.id} className="flex items-center gap-1.5 sm:gap-2">
                  <span className="w-5 shrink-0 text-center text-sm font-semibold text-muted tabular-nums sm:w-6">{i + 1}.</span>
                  <Stepper
                    label={`${i + 1}. sorozat súlya: ${fmtKg(s.weight_kg)}`}
                    value={s.weight_kg ? Number(s.weight_kg) : 0}
                    step={2.5}
                    onChange={(v) => change(s.id, { weight_kg: v || null })}
                  />
                  <Stepper
                    label={`${i + 1}. sorozat: ${s.reps} ismétlés`}
                    value={s.reps}
                    step={1}
                    onChange={(v) => change(s.id, { reps: v })}
                  />
                  <button
                    aria-label="Sorozat törlése"
                    onClick={() => remove(s.id)}
                    className="grid h-10 w-8 shrink-0 place-items-center rounded-lg text-muted hover:text-danger sm:w-10"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>

            <button
              onClick={() => create(exerciseId, last?.reps ?? 10, last?.weight_kg ?? null)}
              className="mt-3 w-full rounded-xl border border-dashed border-line py-2.5 text-sm font-medium text-muted hover:border-accent hover:text-accent"
            >
              + Sorozat
            </button>
          </Card>
        );
      })}

      <button
        onClick={() => setPickerOpen(true)}
        className="w-full rounded-2xl bg-accent py-4 font-semibold text-accent-ink transition active:scale-[.99]"
      >
        + Gyakorlat hozzáadása
      </button>

      {pickerOpen && (
        <ExercisePicker exercises={exercises} used={order} onPick={addExercise} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}

function Stepper({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="flex min-w-0 flex-1 items-center rounded-xl border border-line bg-surface" role="group" aria-label={label}>
      <button
        type="button"
        aria-label="Csökkentés"
        onClick={() => onChange(Math.max(0, +(value - step).toFixed(2)))}
        className="grid h-11 w-9 shrink-0 place-items-center text-muted active:text-accent sm:w-11"
      >
        <Minus className="size-4" />
      </button>
      <label className="min-w-0 flex-1">
        <span className="sr-only">{label}</span>
        <input
          inputMode="decimal"
          value={draft ?? String(value)}
          onFocus={(e) => {
            setDraft(String(value));
            e.target.select();
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const n = Number((draft ?? "").replace(",", "."));
            if (Number.isFinite(n) && n >= 0) onChange(n);
            setDraft(null);
          }}
          className="w-full min-w-0 bg-transparent text-center text-lg font-semibold tabular-nums outline-none"
        />
      </label>
      <button
        type="button"
        aria-label="Növelés"
        onClick={() => onChange(+(value + step).toFixed(2))}
        className="grid h-11 w-9 shrink-0 place-items-center text-muted active:text-accent sm:w-11"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function ExercisePicker({
  exercises,
  used,
  onPick,
  onClose,
}: {
  exercises: Exercise[];
  used: string[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const list = exercises.filter((e) => e.name.toLocaleLowerCase("hu").includes(q.trim().toLocaleLowerCase("hu")));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 md:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Gyakorlat választása"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80dvh] w-full max-w-lg flex-col rounded-t-3xl bg-surface pb-[env(safe-area-inset-bottom)] md:rounded-3xl"
      >
        <div className="flex items-center gap-2 border-b border-line p-4">
          <Search className="size-4.5 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Gyakorlat keresése"
            className="flex-1 bg-transparent outline-none"
          />
          <button onClick={onClose} aria-label="Bezárás" className="rounded-lg p-1.5 text-muted hover:bg-surface-2">
            <X className="size-5" />
          </button>
        </div>
        <ul className="overflow-y-auto p-2">
          {list.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => onPick(e.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-surface-2"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent">
                  <ExerciseIcon name={e.icon} className="size-4.5" />
                </span>
                <span className="flex-1 font-medium">{e.name}</span>
                {used.includes(e.id) && <span className="text-xs text-muted">már szerepel</span>}
              </button>
            </li>
          ))}
          {list.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted">
              {exercises.length === 0 ? "Előbb vegyél fel gyakorlatokat a Gyakorlatok menüben." : "Nincs találat."}
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
