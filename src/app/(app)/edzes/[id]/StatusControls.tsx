"use client";

import { useOptimistic, useTransition } from "react";
import { Trash2 } from "lucide-react";
import type { AppointmentStatus } from "@/lib/types";
import { deleteAppointment, setStatus } from "./actions";

const OPTIONS: { value: AppointmentStatus; label: string; active: string }[] = [
  { value: "scheduled", label: "Tervezett", active: "bg-surface text-text shadow-sm" },
  { value: "done", label: "Elvégezve", active: "bg-ok text-white" },
  { value: "no_show", label: "Nem jött", active: "bg-accent text-accent-ink" },
  { value: "cancelled", label: "Lemondva", active: "bg-surface text-muted shadow-sm line-through" },
];

export function StatusControls({ id, status }: { id: string; status: AppointmentStatus }) {
  const [optimistic, setOptimistic] = useOptimistic(status);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-surface-2 p-1" aria-busy={pending}>
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            aria-pressed={optimistic === o.value}
            onClick={() =>
              startTransition(async () => {
                setOptimistic(o.value);
                await setStatus(id, o.value);
              })
            }
            className={`rounded-xl px-1 py-2.5 text-[13px] font-medium transition sm:text-sm ${
              optimistic === o.value ? o.active : "text-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {(optimistic === "no_show" || optimistic === "cancelled") && (
        <p className="text-sm text-muted">
          {optimistic === "no_show"
            ? "Lemondás nélkül maradt távol: az óra fizetős (bérletnél levonódik egy alkalom)."
            : "Időben lemondta: az óra ingyenes."}
        </p>
      )}
      <button
        onClick={() => {
          if (confirm("Biztosan törlöd az időpontot a rögzített sorozatokkal együtt?")) {
            startTransition(() => deleteAppointment(id));
          }
        }}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-danger"
      >
        <Trash2 className="size-4" /> Időpont törlése
      </button>
    </div>
  );
}
