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

function clean(reps: number, weight: number | null) {
  return {
    reps: Math.max(0, Math.round(reps) || 0),
    weight_kg: weight === null || !Number.isFinite(weight) || weight <= 0 ? null : Math.round(weight * 100) / 100,
  };
}

export async function addSet(
  appointmentId: string,
  exerciseId: string,
  setNo: number,
  reps: number,
  weight: number | null,
): Promise<{ set?: WorkoutSet; error?: string }> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("workout_sets")
    .insert({ appointment_id: appointmentId, exercise_id: exerciseId, set_no: setNo, ...clean(reps, weight) })
    .select("id, appointment_id, exercise_id, set_no, reps, weight_kg")
    .single();
  if (error) return { error: "Nem sikerült menteni." };
  revalidatePath(`/edzes/${appointmentId}`);
  return { set: data as WorkoutSet };
}

export async function updateSet(id: string, reps: number, weight: number | null) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("workout_sets").update(clean(reps, weight)).eq("id", id);
  return error ? { error: "Nem sikerült menteni." } : {};
}

export async function deleteSet(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("workout_sets").delete().eq("id", id);
  return error ? { error: "Nem sikerült törölni." } : {};
}
