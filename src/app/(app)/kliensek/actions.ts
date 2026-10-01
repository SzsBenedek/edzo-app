"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import type { ActionState } from "@/components/form";

function clientFromForm(formData: FormData) {
  const text = (key: string) => String(formData.get(key) ?? "").trim() || null;
  const referred = formData.get("referred") === "on";
  const sharePercent = Number(String(formData.get("referral_share") ?? "0").replace(",", "."));

  return {
    name: text("name") ?? "",
    phone: text("phone"),
    email: text("email"),
    goal: text("goal"),
    notes: text("notes"),
    referral_partner: referred ? text("referral_partner") : null,
    referral_share: referred && Number.isFinite(sharePercent) ? Math.min(Math.max(sharePercent, 0), 99) / 100 : 0,
  };
}

export async function createClient(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const client = clientFromForm(formData);
  if (!client.name) return { error: "A név kötelező." };

  const { data, error } = await supabase.from("clients").insert(client).select("id").single();
  if (error) return { error: "Nem sikerült menteni." };

  revalidatePath("/kliensek");
  redirect(`/kliensek/${data.id}`);
}

export async function updateClient(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const client = clientFromForm(formData);
  if (!client.name) return { error: "A név kötelező." };

  const { error } = await supabase.from("clients").update(client).eq("id", id);
  if (error) return { error: "Nem sikerült menteni." };

  revalidatePath(`/kliensek/${id}`);
  revalidatePath("/kliensek");
  return { ok: true };
}

export async function setClientActive(id: string, active: boolean) {
  const { supabase } = await requireUser();
  await supabase.from("clients").update({ active }).eq("id", id);
  revalidatePath(`/kliensek/${id}`);
  revalidatePath("/kliensek");
}

export async function sellPass(clientId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const productId = String(formData.get("product_id") ?? "");
  const price = Math.round(Number(formData.get("price")));
  const purchasedOn = String(formData.get("purchased_on") ?? "");

  const { data: product } = await supabase
    .from("pass_products")
    .select("name, total_sessions")
    .eq("id", productId)
    .single();
  if (!product) return { error: "Válassz bérlettípust." };
  if (!Number.isFinite(price) || price < 0) return { error: "Érvényes árat adj meg." };

  const { error } = await supabase.from("passes").insert({
    client_id: clientId,
    product_id: productId,
    name: product.name,
    total_sessions: product.total_sessions,
    price,
    purchased_on: purchasedOn || undefined,
  });
  if (error) return { error: "Nem sikerült menteni." };

  revalidatePath(`/kliensek/${clientId}`);
  return { ok: true };
}
