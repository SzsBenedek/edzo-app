"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { EXERCISE_ICONS } from "@/components/ExerciseIcon";
import type { ActionState } from "@/components/form";

export async function createExercise(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "dumbbell");
  if (!name) return { error: "Adj nevet a gyakorlatnak." };
  if (!(icon in EXERCISE_ICONS)) return { error: "Ismeretlen ikon." };

  const { error } = await supabase.from("exercises").insert({ name, icon });
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
