"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import type { ActionState } from "@/components/form";

function toInt(v: FormDataEntryValue | null) {
  const n = Number(String(v ?? "").replace(/\s/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, userId } = await requireUser();
  const session_price = toInt(formData.get("session_price"));
  const group_session_rate = toInt(formData.get("group_session_rate"));
  if (session_price === null || group_session_rate === null) return { error: "Érvényes összegeket adj meg." };

  const { error } = await supabase
    .from("settings")
    .update({ session_price, group_session_rate })
    .eq("user_id", userId);
  if (error) return { error: "Nem sikerült menteni." };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveRecurringExpense(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || "Egyéb";
  const amount = toInt(formData.get("amount"));
  const active = formData.get("active") === "on";
  if (!name || amount === null) return { error: "Adj meg nevet és összeget." };

  const row = { name, category, amount, active };
  const { error } = id
    ? await supabase.from("recurring_expenses").update(row).eq("id", id)
    : await supabase.from("recurring_expenses").insert(row);
  if (error) return { error: "Nem sikerült menteni." };

  revalidatePath("/beallitasok");
  return { ok: true };
}
