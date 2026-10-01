import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { formatDayLong, formatFt, formatTime, todayRange } from "@/lib/format";
import { Card, EmptyState, PageHeader, StatusBadge, type AppointmentStatus } from "@/components/ui";

type TodayAppointment = {
  id: string;
  kind: "personal" | "group";
  title: string | null;
  starts_at: string;
  duration_min: number;
  status: AppointmentStatus;
  pass_id: string | null;
  client: { name: string } | null;
};

export default async function TodayPage() {
  const { supabase } = await requireUser();
  const { start, end } = todayRange();

  // A havi fix kiadásokat az első megnyitáskor lekönyveljük (idempotens).
  await supabase.rpc("post_recurring_expenses");

  const monthStart = start.slice(0, 8) + "01";
  const [{ data: appointments }, { data: monthTx }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, kind, title, starts_at, duration_min, status, pass_id, client:clients(name)")
      .gte("starts_at", start)
      .lte("starts_at", end)
      .order("starts_at")
      .returns<TodayAppointment[]>(),
    supabase.from("transactions").select("type, amount").gte("occurred_on", monthStart),
  ]);

  const income = (monthTx ?? []).filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = (monthTx ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const remaining = (appointments ?? []).filter((a) => a.status === "scheduled").length;

  return (
    <>
      <PageHeader title="Ma" subtitle={formatDayLong(new Date())} />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Mai edzés" value={String(appointments?.length ?? 0)} hint={`${remaining} hátravan`} />
        <Stat label="Havi bevétel" value={formatFt(income)} />
        <Stat label="Havi egyenleg" value={formatFt(income - expense)} tone={income - expense >= 0 ? "ok" : "danger"} />
      </div>

      {!appointments?.length ? (
        <EmptyState title="Mára nincs időpont" text="Új időpontot a Naptárban vehetsz fel." />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {appointments.map((a) => (
            <Link
              key={a.id}
              href={`/edzes/${a.id}`}
              className="flex items-center gap-4 px-4 py-4 transition hover:bg-surface-2 active:bg-surface-2"
            >
              <div className="w-14 shrink-0 text-center">
                <div className="text-lg font-semibold tabular-nums">{formatTime(a.starts_at)}</div>
                <div className="text-xs text-muted">{a.duration_min} perc</div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate font-medium">
                  {a.kind === "group" && <Users className="size-4 shrink-0 text-muted" />}
                  <span className="truncate">{a.kind === "group" ? a.title || "Csoportos óra" : a.client?.name}</span>
                </div>
                <div className="mt-1">
                  <StatusBadge status={a.status} />
                </div>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted" />
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "danger";
}) {
  return (
    <Card className="p-3 md:p-5">
      <div className="text-xs text-muted md:text-sm">{label}</div>
      <div
        className={`mt-1 truncate text-base font-semibold tabular-nums md:text-2xl ${
          tone === "ok" ? "text-ok" : tone === "danger" ? "text-danger" : ""
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </Card>
  );
}
