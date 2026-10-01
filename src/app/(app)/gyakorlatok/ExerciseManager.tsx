"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { EXERCISE_ICONS, ExerciseIcon } from "@/components/ExerciseIcon";
import { FormError, Input, SubmitButton, type ActionState } from "@/components/form";
import { Card, EmptyState } from "@/components/ui";
import type { Exercise } from "@/lib/types";
import { createExercise, deleteExercise } from "./actions";

export function ExerciseManager({ exercises }: { exercises: Exercise[] }) {
  const [state, action] = useActionState<ActionState, FormData>(createExercise, {});
  const [icon, setIcon] = useState("dumbbell");
  const formRef = useRef<HTMLFormElement>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_320px] md:items-start">
      <div className="order-2 md:order-1">
        {deleteError && <p className="mb-3 text-sm text-danger">{deleteError}</p>}
        {exercises.length === 0 ? (
          <EmptyState title="Még nincs gyakorlat" text="Vedd fel az elsőt, és máris rögzítheted az edzéseken." />
        ) : (
          <Card className="divide-y divide-line">
            {exercises.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
                  <ExerciseIcon name={e.icon} />
                </span>
                <span className="flex-1 font-medium">{e.name}</span>
                <button
                  aria-label={`${e.name} törlése`}
                  onClick={() => {
                    if (!confirm(`Törlöd: ${e.name}?`)) return;
                    startTransition(async () => setDeleteError((await deleteExercise(e.id)).error));
                  }}
                  className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-danger"
                >
                  <Trash2 className="size-4.5" />
                </button>
              </div>
            ))}
          </Card>
        )}
      </div>

      <Card className="order-1 p-4 md:order-2 md:sticky md:top-10">
        <form ref={formRef} action={action} className="space-y-4">
          <h2 className="font-semibold">Új gyakorlat</h2>
          <Input name="name" placeholder="pl. Guggolás" required autoComplete="off" />
          <input type="hidden" name="icon" value={icon} />
          <div>
            <div className="mb-2 text-sm font-medium">Ikon</div>
            <div className="grid grid-cols-8 gap-1.5">
              {Object.keys(EXERCISE_ICONS).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-label={key}
                  aria-pressed={icon === key}
                  onClick={() => setIcon(key)}
                  className={`grid aspect-square place-items-center rounded-lg border transition ${
                    icon === key ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:text-text"
                  }`}
                >
                  <ExerciseIcon name={key} className="size-4.5" />
                </button>
              ))}
            </div>
          </div>
          <FormError state={state} />
          <SubmitButton>Hozzáadás</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
