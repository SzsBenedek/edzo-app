import { requireUser } from "@/lib/supabase/server";
import { ymd } from "@/lib/format";
import { BackLink, Card, PageHeader } from "@/components/ui";
import { AppointmentForm } from "./AppointmentForm";

export default async function NewAppointmentPage({ searchParams }: PageProps<"/naptar/uj">) {
  const { datum, kliens } = await searchParams;
  const { supabase } = await requireUser();

  const [{ data: clients }, { data: passes }, { data: settings }] = await Promise.all([
    supabase.from("clients").select("id, name, referral_share").eq("active", true).order("name"),
    supabase
      .from("pass_balances")
      .select("id, client_id, name, remaining_sessions")
      .gt("remaining_sessions", 0)
      .order("purchased_on"),
    supabase.from("settings").select("session_price, group_session_rate").single(),
  ]);

  const date = typeof datum === "string" && /^\d{4}-\d{2}-\d{2}$/.test(datum) ? datum : ymd(new Date());

  return (
    <div className="max-w-2xl">
      <BackLink href="/naptar" label="Naptár" />
      <PageHeader title="Új időpont" />
      <Card className="p-5">
        <AppointmentForm
          clients={(clients ?? []).map((c) => ({ ...c, referral_share: Number(c.referral_share) }))}
          passes={passes ?? []}
          sessionPrice={settings?.session_price ?? 0}
          groupRate={settings?.group_session_rate ?? 5500}
          defaultDate={date}
          defaultClientId={typeof kliens === "string" ? kliens : undefined}
        />
      </Card>
    </div>
  );
}
