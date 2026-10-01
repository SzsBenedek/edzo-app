"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import type { ActionState } from "@/components/form";

export async function createTransaction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const type = formData.get("type") === "income" ? "income" : "expense";
  const amount = Math.round(Number(String(formData.get("amount") ?? "").replace(/\s/g, "")));
  const category = String(formData.get("category") ?? "").trim() || "Egyéb";
  const occurredOn = String(formData.get("occurred_on") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!Number.isFinite(amount) || amount <= 0) return { error: "Adj meg egy pozitív összeget." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return { error: "Adj meg dátumot." };

  const { error } = await supabase
    .from("transactions")
    .insert({ type, amount, gross_amount: amount, category, occurred_on: occurredOn, note });
  if (error) return { error: "Nem sikerült menteni." };

  revalidatePath("/penzugyek");
  revalidatePath("/");
  return { ok: true };
}

/** Csak kézzel felvett tételt lehet törölni; az edzésből, bérletből és fix kiadásból származót nem. */
export async function deleteTransaction(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .is("appointment_id", null)
    .is("pass_id", null)
    .is("recurring_expense_id", null);
  if (error) return { error: "Nem sikerült törölni." };
  revalidatePath("/penzugyek");
  revalidatePath("/");
  return {};
}
