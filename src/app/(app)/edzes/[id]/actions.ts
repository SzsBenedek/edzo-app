"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import type { AppointmentStatus, WorkoutSet } from "@/lib/types";

const STATUSES: AppointmentStatus[] = ["scheduled", "done", "cancelled", "no_show"];

function revalidateAppointment(id: string) {
  revalidatePath(`/edzes/${id}`);
  revalidatePath("/naptar");
  revalidatePath("/");
}

export async function setStatus(id: string, status: AppointmentStatus) {
  if (!STATUSES.includes(status)) return { error: "Érvénytelen állapot." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) return { error: "Nem sikerült menteni." };
  revalidateAppointment(id);
  return {};
}

export async function deleteAppointment(id: string) {
  const { supabase } = await requireUser();
  await supabase.from("appointments").delete().eq("id", id);
  revalidatePath("/naptar");
  revalidatePath("/");
  redirect("/naptar");
}

export type SetValues = { reps: number | null; weight_kg: number | null; duration_sec: number | null };

function clean(v: SetValues) {
  const int = (n: number | null) => (n === null || !Number.isFinite(n) ? null : Math.max(0, Math.round(n)));
  return {
    reps: int(v.reps),
    weight_kg: v.weight_kg === null || !Number.isFinite(v.weight_kg) || v.weight_kg <= 0 ? null : Math.round(v.weight_kg * 100) / 100,
    duration_sec: int(v.duration_sec),
  };
}

export async function addSet(
  appointmentId: string,
  exerciseId: string,
  setNo: number,
  values: SetValues,
): Promise<{ set?: WorkoutSet; error?: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("workout_sets")
    .insert({ appointment_id: appointmentId, exercise_id: exerciseId, set_no: setNo, ...clean(values) })
    .select("id, appointment_id, exercise_id, set_no, reps, weight_kg, duration_sec")
    .single();
  if (error) return { error: "Nem sikerült menteni." };
  revalidatePath(`/edzes/${appointmentId}`);
  return { set: data as WorkoutSet };
}

export async function updateSet(id: string, values: SetValues) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("workout_sets").update(clean(values)).eq("id", id);
  return error ? { error: "Nem sikerült menteni." } : {};
}

export async function deleteSet(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("workout_sets").delete().eq("id", id);
  return error ? { error: "Nem sikerült törölni." } : {};
}
