"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { addDays, budapestToISO, mondayOf } from "@/lib/format";
import type { ActionState } from "@/components/form";

type Parsed =
  | { error: string }
  | { date: string; time: string; duration: number; repeat: number; row: Record<string, unknown> };

/** Az új és a szerkesztett időpont űrlapjának közös feldolgozása. */
function parseAppointment(formData: FormData): Parsed {
  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const kind = get("kind") === "group" ? "group" : "personal";
  const date = get("date");
  const time = get("time");
  const duration = Number(get("duration")) || 60;
  const repeat = Math.min(Math.max(Number(get("repeat")) || 1, 1), 12);
  const notes = get("notes") || null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "Adj meg dátumot és időpontot." };

  let row: Record<string, unknown>;
  if (kind === "group") {
    const price = Number(get("price"));
    row = {
      kind,
      title: get("title") || "Csoportos óra",
      client_id: null,
      pass_id: null,
      price: Number.isFinite(price) ? Math.round(price) : 0,
    };
  } else {
    const clientId = get("client_id");
    if (!clientId) return { error: "Válassz klienst." };
    if (get("payment") === "pass") {
      const passId = get("pass_id");
      if (!passId) return { error: "Ennek a kliensnek nincs aktív bérlete." };
      row = { kind, client_id: clientId, pass_id: passId, price: null };
    } else {
      const price = Number(get("price"));
      if (!Number.isFinite(price) || price < 0) return { error: "Érvényes árat adj meg." };
      row = { kind, client_id: clientId, pass_id: null, price: Math.round(price) };
    }
  }

  return { date, time, duration, repeat, row: { ...row, duration_min: duration, notes } };
}

export async function createAppointment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const parsed = parseAppointment(formData);
  if ("error" in parsed) return parsed;
  const { date, time, repeat, row } = parsed;

  const rows = Array.from({ length: repeat }, (_, i) => ({
    ...row,
    starts_at: budapestToISO(addDays(date, i * 7), time),
  }));

  const { error } = await supabase.from("appointments").insert(rows);
  if (error) return { error: "Nem sikerült menteni." };

  revalidatePath("/naptar");
  revalidatePath("/");
  redirect(`/naptar?het=${mondayOf(date)}`);
}

export async function updateAppointment(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireUser();
  const parsed = parseAppointment(formData);
  if ("error" in parsed) return parsed;
  const { date, time, row } = parsed;

  // A bevételt és a bérletlevonást az adatbázis-trigger igazítja a változáshoz.
  const { error } = await supabase
    .from("appointments")
    .update({ ...row, starts_at: budapestToISO(date, time) })
    .eq("id", id);
  if (error) return { error: "Nem sikerült menteni." };

  revalidatePath(`/edzes/${id}`);
  revalidatePath("/naptar");
  revalidatePath("/");
  redirect(`/edzes/${id}`);
}
