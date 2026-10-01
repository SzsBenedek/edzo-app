import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, CalendarPlus, ChevronRight, Phone, Mail } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { formatFt, formatTime, TZ } from "@/lib/format";
import { BackLink, ButtonLink, Card, PageHeader, StatusBadge } from "@/components/ui";
import { ExerciseIcon } from "@/components/ExerciseIcon";
import type { Appointment, Client, PassBalance, PassProduct } from "@/lib/types";
import { setClientActive, updateClient } from "../actions";
import { ClientForm } from "../ClientForm";
import { SellPassForm } from "./SellPassForm";

type SetRow = {
  reps: number;
  weight_kg: number | null;
  exercise: { id: string; name: string; icon: string };
  appointment: { starts_at: string };
};

const dateFmt = new Intl.DateTimeFormat("hu-HU", { timeZone: TZ, month: "short", day: "numeric", weekday: "short" });

export default async function ClientPage({ params }: PageProps<"/kliensek/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const [{ data: client }, { data: passes }, { data: appointments }, { data: sets }, { data: products }, { data: settings }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", id).maybeSingle<Client>(),
      supabase.from("pass_balances").select("*").eq("client_id", id).order("purchased_on", { ascending: false }),
      supabase
        .from("appointments")
        .select("id, starts_at, status, pass_id, price, duration_min")
        .eq("client_id", id)
        .order("starts_at", { ascending: false })
        .limit(30),
      supabase
        .from("workout_sets")
        .select("reps, weight_kg, exercise:exercises(id, name, icon), appointment:appointments!inner(starts_at, client_id)")
        .eq("appointment.client_id", id)
        .returns<SetRow[]>(),
      supabase.from("pass_products").select("*").eq("active", true).order("total_sessions", { ascending: false }),
      supabase.from("settings").select("session_price").single(),
    ]);

  if (!client) notFound();

  const activePasses = ((passes ?? []) as PassBalance[]).filter((p) => p.remaining_sessions > 0);
  const progress = summarizeProgress(sets ?? []);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

  return (
    <>
      <BackLink href="/kliensek" label="Kliensek" />
      <PageHeader
        title={client.name}
        subtitle={[client.goal, !client.active && "archivált"].filter(Boolean).join(" · ") || undefined}
        action={
          <ButtonLink href={`/naptar/uj?kliens=${client.id}`}>
            <CalendarPlus className="size-4.5" /> <span className="hidden sm:inline">Időpont</span>
          </ButtonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="space-y-6">
          {/* Bérletek */}
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Bérlet</h2>
            {activePasses.length === 0 ? (
              <p className="mb-3 text-sm text-muted">Nincs aktív bérlete.</p>
            ) : (
              <ul className="mb-3 space-y-3">
                {activePasses.map((p) => (
                  <li key={p.id} className="rounded-xl bg-surface-2 p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-sm text-muted">{p.purchased_on.replaceAll("-", ".")}.</span>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full rounded-full bg-accent"
                          style={{ width: `${(p.used_sessions / p.total_sessions) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold tabular-nums">
                        {p.remaining_sessions}/{p.total_sessions} maradt
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <SellPassForm
              clientId={client.id}
              products={((products ?? []) as PassProduct[]).map((p) => ({ ...p, paid_sessions: Number(p.paid_sessions) }))}
              sessionPrice={settings?.session_price ?? 0}
              referralShare={Number(client.referral_share)}
              today={today}
            />
          </Card>

          {/* Fejlődés */}
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Fejlődés</h2>
            {progress.length === 0 ? (
              <p className="text-sm text-muted">Még nincs rögzített gyakorlat.</p>
            ) : (
              <ul className="divide-y divide-line">
                {progress.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                      <ExerciseIcon name={p.icon} className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.name}</div>
                      <div className="text-sm text-muted">
                        Legutóbb: {p.last} · {p.sessions} edzésen
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted">Csúcs</div>
                      <div className="font-semibold tabular-nums">{p.best}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Időpontok */}
          <Card className="overflow-hidden">
            <h2 className="px-5 pt-5 pb-2 font-semibold">Időpontok</h2>
            {(appointments ?? []).length === 0 ? (
              <p className="px-5 pb-5 text-sm text-muted">Még nincs időpont.</p>
            ) : (
              <ul className="divide-y divide-line">
                {(appointments as Appointment[]).map((a) => (
                  <li key={a.id}>
                    <Link href={`/edzes/${a.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                      <div className="flex-1">
                        <div className="font-medium first-letter:uppercase">{dateFmt.format(new Date(a.starts_at))}</div>
                        <div className="text-sm text-muted">
                          {formatTime(a.starts_at)} · {a.pass_id ? "bérlet" : a.price ? formatFt(a.price) : "—"}
                        </div>
                      </div>
                      <StatusBadge status={a.status} />
                      <ChevronRight className="size-4.5 text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Adatok */}
        <div className="space-y-4">
          {(client.phone || client.email) && (
            <Card className="flex gap-2 p-3">
              {client.phone && (
                <a href={`tel:${client.phone}`} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-surface-2 py-2.5 text-sm font-medium">
                  <Phone className="size-4" /> Hívás
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-surface-2 py-2.5 text-sm font-medium">
                  <Mail className="size-4" /> E-mail
                </a>
              )}
            </Card>
          )}
          <details className="group rounded-2xl border border-line bg-surface p-5" open={false}>
            <summary className="cursor-pointer list-none font-semibold">
              Adatok szerkesztése <span className="float-right text-muted group-open:rotate-90">›</span>
            </summary>
            <div className="mt-4">
              <ClientForm action={updateClient.bind(null, client.id)} client={client} submitLabel="Mentés" />
            </div>
          </details>
          <form action={setClientActive.bind(null, client.id, !client.active)}>
            <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm text-muted hover:text-text">
              {client.active ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
              {client.active ? "Kliens archiválása" : "Visszaállítás aktívvá"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function formatSet(reps: number, weight: number | null) {
  return weight ? `${Number(weight)} kg × ${reps}` : `${reps} ism.`;
}

/** Gyakorlatonként: legutóbbi legjobb sorozat, csúcs, és hány edzésen szerepelt. */
function summarizeProgress(sets: SetRow[]) {
  const byExercise = new Map<string, SetRow[]>();
  for (const s of sets) {
    const list = byExercise.get(s.exercise.id) ?? [];
    list.push(s);
    byExercise.set(s.exercise.id, list);
  }

  const score = (s: SetRow) => (Number(s.weight_kg) || 0) * 1000 + s.reps;

  return [...byExercise.values()]
    .map((list) => {
      const lastDate = list.reduce((d, s) => (s.appointment.starts_at > d ? s.appointment.starts_at : d), "");
      const lastTop = list.filter((s) => s.appointment.starts_at === lastDate).sort((a, b) => score(b) - score(a))[0];
      const best = [...list].sort((a, b) => score(b) - score(a))[0];
      return {
        id: list[0].exercise.id,
        name: list[0].exercise.name,
        icon: list[0].exercise.icon,
        last: formatSet(lastTop.reps, lastTop.weight_kg),
        best: formatSet(best.reps, best.weight_kg),
        sessions: new Set(list.map((s) => s.appointment.starts_at)).size,
        lastDate,
      };
    })
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate));
}
