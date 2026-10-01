import { Plus } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { ButtonLink, PageHeader } from "@/components/ui";
import { ClientList, type ClientRow } from "./ClientList";

export default async function ClientsPage() {
  const { supabase } = await requireUser();
  const [{ data: clients }, { data: balances }] = await Promise.all([
    supabase.from("clients").select("id, name, goal, active, referral_partner").order("name"),
    supabase.from("pass_balances").select("client_id, remaining_sessions").gt("remaining_sessions", 0),
  ]);

  // Egy kliensnek lehet több bérlete; a hátralévő alkalmakat összeadjuk.
  const remaining = new Map<string, number>();
  for (const b of balances ?? []) remaining.set(b.client_id, (remaining.get(b.client_id) ?? 0) + b.remaining_sessions);

  const rows: ClientRow[] = (clients ?? []).map((c) => ({ ...c, remaining: remaining.get(c.id) ?? null }));
  const activeCount = rows.filter((c) => c.active).length;

  return (
    <>
      <PageHeader
        title="Kliensek"
        subtitle={`${activeCount} aktív kliens`}
        action={
          <ButtonLink href="/kliensek/uj">
            <Plus className="size-4.5" /> Új kliens
          </ButtonLink>
        }
      />
      <ClientList clients={rows} />
    </>
  );
}
