import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Users } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { formatFt, formatTime, TZ } from "@/lib/format";
import { BackLink, Card, PageHeader } from "@/components/ui";
import type { AppointmentStatus, Exercise, WorkoutSet } from "@/lib/types";
import { StatusControls } from "./StatusControls";
import { WorkoutLogger } from "./WorkoutLogger";

type AppointmentDetail = {
  id: string;
  kind: "personal" | "group";
  title: string | null;
  starts_at: string;
  duration_min: number;
  status: AppointmentStatus;
  price: number | null;
  notes: string | null;
  pass_id: string | null;
  client: { id: string; name: string; goal: string | null; referral_share: number } | null;
  pass: { name: string } | null;
};

type PrevRow = { exercise_id: string; set_no: number; reps: number; weight_kg: number | null; appointment_id: string };

const dateFmt = new Intl.DateTimeFormat("hu-HU", { timeZone: TZ, month: "long", day: "numeric", weekday: "long" });

export default async function WorkoutPage({ params }: PageProps<"/edzes/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: appt } = await supabase
    .from("appointments")
    .select(
      "id, kind, title, starts_at, duration_min, status, price, notes, pass_id, client:clients(id, name, goal, referral_share), pass:passes(name)",
    )
    .eq("id", id)
    .maybeSingle<AppointmentDetail>();
  if (!appt) notFound();

  const [{ data: sets }, { data: exercises }, previous, balance] = await Promise.all([
    supabase
      .from("workout_sets")
      .select("id, appointment_id, exercise_id, set_no, reps, weight_kg")
      .eq("appointment_id", id)
      .order("created_at"),
    supabase.from("exercises").select("id, name, icon").order("name"),
    appt.client ? previousSets(supabase, appt.client.id, appt.starts_at) : Promise.resolve({}),
    appt.pass_id
      ? supabase
          .from("pass_balances")
          .select("remaining_sessions, total_sessions")
          .eq("id", appt.pass_id)
          .single()
          .then((r) => r.data)
      : Promise.resolve(null),
  ]);

  const title = appt.kind === "group" ? appt.title || "Csoportos óra" : (appt.client?.name ?? "Edzés");
  const payment = appt.pass
    ? `${appt.pass.name}${balance ? ` · ${balance.remaining_sessions}/${balance.total_sessions} maradt` : ""}`
    : appt.price
      ? formatFt(appt.price)
      : null;

  return (
    <div className="max-w-3xl">
      <BackLink href="/naptar" label="Naptár" />
      <PageHeader
        title={title}
        subtitle={`${dateFmt.format(new Date(appt.starts_at))} · ${formatTime(appt.starts_at)} · ${appt.duration_min} perc`}
        action={
          <Link
            href={`/edzes/${appt.id}/szerkesztes`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-medium"
          >
            <Pencil className="size-4" /> <span className="hidden sm:inline">Szerkesztés</span>
          </Link>
        }
      />

      <Card className="mb-6 space-y-4 p-4">
        <StatusControls id={appt.id} status={appt.status} />
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          {payment && <span>Fizetés: {payment}</span>}
          {appt.client && (
            <Link href={`/kliensek/${appt.client.id}`} className="underline-offset-4 hover:underline">
              Kliens adatlapja →
            </Link>
          )}
          {appt.notes && <span className="basis-full">Jegyzet: {appt.notes}</span>}
        </div>
      </Card>

      {appt.kind === "group" ? (
        <Card className="flex items-center gap-3 p-5 text-sm text-muted">
          <Users className="size-5" />
          Csoportos óránál elég az állapotot beállítani: az „Elvégezve” gomb rögzíti a bevételt.
        </Card>
      ) : (
        <WorkoutLogger
          appointmentId={appt.id}
          initialSets={(sets ?? []) as WorkoutSet[]}
          exercises={(exercises ?? []) as Exercise[]}
          previous={previous}
        />
      )}
    </div>
  );
}

/** A kliens ennél korábbi edzéseiből gyakorlatonként a legutóbbi alkalom sorozatai. */
async function previousSets(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  clientId: string,
  before: string,
) {
  const { data } = await supabase
    .from("appointments")
    .select("id, starts_at")
    .eq("client_id", clientId)
    .lt("starts_at", before)
    .order("starts_at", { ascending: false })
    .limit(40);
  if (!data?.length) return {};

  const { data: sets } = await supabase
    .from("workout_sets")
    .select("exercise_id, set_no, reps, weight_kg, appointment_id")
    .in(
      "appointment_id",
      data.map((a) => a.id),
    )
    .returns<PrevRow[]>();

  // Az időpontok időrendben csökkenően jönnek: gyakorlatonként az első találat a legutóbbi.
  const rank = new Map(data.map((a, i) => [a.id, i]));
  const latestAppt = new Map<string, { appt: string }>();
  for (const row of sets ?? []) {
    const cur = latestAppt.get(row.exercise_id);
    if (!cur || rank.get(row.appointment_id)! < rank.get(cur.appt)!) latestAppt.set(row.exercise_id, { appt: row.appointment_id });
  }

  const result: Record<string, { reps: number; weight_kg: number | null }[]> = {};
  const rows = (sets ?? [])
    .filter((r) => latestAppt.get(r.exercise_id)?.appt === r.appointment_id)
    .sort((a, b) => a.set_no - b.set_no);
  for (const r of rows) (result[r.exercise_id] ??= []).push({ reps: r.reps, weight_kg: r.weight_kg });
  return result;
}
