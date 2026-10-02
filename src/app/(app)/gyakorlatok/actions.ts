"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { EXERCISE_ICONS } from "@/components/ExerciseIcon";
import type { ActionState } from "@/components/form";
import { TRACKING_LABELS } from "@/lib/types";

export async function createExercise(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "dumbbell");
  const tracking = String(formData.get("tracking") ?? "weight");
  if (!name) return { error: "Adj nevet a gyakorlatnak." };
  if (!(icon in EXERCISE_ICONS)) return { error: "Ismeretlen ikon." };
  if (!(tracking in TRACKING_LABELS)) return { error: "Válaszd ki, mit rögzítesz." };

  const { error } = await supabase.from("exercises").insert({ name, icon, tracking });
  if (error?.code === "23505") return { error: "Ilyen nevű gyakorlat már van." };
  if (error) return { error: "Nem sikerült menteni." };

  revalidatePath("/gyakorlatok");
  return { ok: true };
}

export async function deleteExercise(id: string): Promise<ActionState> {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("exercises").delete().eq("id", id);
  if (error?.code === "23503") return { error: "Ez a gyakorlat már szerepel edzésben, ezért nem törölhető." };
  if (error) return { error: "Nem sikerült törölni." };
  revalidatePath("/gyakorlatok");
  return { ok: true };
}

export async function updateExerciseTracking(id: string, tracking: string): Promise<ActionState> {
  if (!(tracking in TRACKING_LABELS)) return { error: "Ismeretlen típus." };
  const { supabase } = await requireUser();
  const { error } = await supabase.from("exercises").update({ tracking }).eq("id", id);
  if (error) return { error: "Nem sikerült menteni." };
  revalidatePath("/gyakorlatok");
  return { ok: true };
}
