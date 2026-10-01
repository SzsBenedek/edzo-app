import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { formatTime, ymd } from "@/lib/format";
import { BackLink, Card, PageHeader } from "@/components/ui";
import { AppointmentForm, type AppointmentInitial } from "../../../naptar/uj/AppointmentForm";
import { updateAppointment } from "../../../naptar/actions";

export default async function EditAppointmentPage({ params }: PageProps<"/edzes/[id]/szerkesztes">) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, kind, client_id, pass_id, price, title, notes, starts_at, duration_min")
    .eq("id", id)
    .maybeSingle();
  if (!appt) notFound();

  // Az archivált kliens és a már kimerült, de ehhez az időponthoz rendelt bérlet is legyen választható.
  const [{ data: clients }, { data: passes }, { data: settings }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, referral_share")
      .or(appt.client_id ? `active.eq.true,id.eq.${appt.client_id}` : "active.eq.true")
      .order("name"),
    supabase
      .from("pass_balances")
      .select("id, client_id, name, remaining_sessions")
      .or(appt.pass_id ? `remaining_sessions.gt.0,id.eq.${appt.pass_id}` : "remaining_sessions.gt.0")
      .order("purchased_on"),
    supabase.from("settings").select("session_price, group_session_rate").single(),
  ]);

  const start = new Date(appt.starts_at);
  const initial: AppointmentInitial = {
    kind: appt.kind,
    client_id: appt.client_id,
    pass_id: appt.pass_id,
    price: appt.price,
    title: appt.title,
    notes: appt.notes,
    date: ymd(start),
    time: formatTime(appt.starts_at),
    duration: appt.duration_min,
  };

  return (
    <div className="max-w-2xl">
      <BackLink href={`/edzes/${id}`} label="Vissza az edzéshez" />
      <PageHeader title="Időpont szerkesztése" subtitle={appt.kind === "group" ? "Csoportos óra" : "Személyi edzés"} />
      <Card className="p-5">
        <AppointmentForm
          clients={(clients ?? []).map((c) => ({ ...c, referral_share: Number(c.referral_share) }))}
          passes={passes ?? []}
          sessionPrice={settings?.session_price ?? 0}
          groupRate={settings?.group_session_rate ?? 5500}
          defaultDate={initial.date}
          initial={initial}
          action={updateAppointment.bind(null, id)}
        />
      </Card>
    </div>
  );
}
