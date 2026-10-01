import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, Users } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { addDays, budapestToISO, formatTime, mondayOf, ymd } from "@/lib/format";
import { ButtonLink, PageHeader, StatusBadge } from "@/components/ui";
import type { AppointmentStatus } from "@/lib/types";

type WeekAppointment = {
  id: string;
  kind: "personal" | "group";
  title: string | null;
  starts_at: string;
  duration_min: number;
  status: AppointmentStatus;
  pass_id: string | null;
  client: { name: string } | null;
};

const dayName = new Intl.DateTimeFormat("hu-HU", { weekday: "long", timeZone: "UTC" });
const dayShort = new Intl.DateTimeFormat("hu-HU", { weekday: "short", timeZone: "UTC" });
const monthDay = new Intl.DateTimeFormat("hu-HU", { month: "long", day: "numeric", timeZone: "UTC" });

export default async function CalendarPage({ searchParams }: PageProps<"/naptar">) {
  const { het } = await searchParams;
  const { supabase } = await requireUser();

  const today = ymd(new Date());
  const monday = mondayOf(typeof het === "string" && /^\d{4}-\d{2}-\d{2}$/.test(het) ? het : today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  const { data } = await supabase
    .from("appointments")
    .select("id, kind, title, starts_at, duration_min, status, pass_id, client:clients(name)")
    .gte("starts_at", budapestToISO(monday, "00:00"))
    .lt("starts_at", budapestToISO(addDays(monday, 7), "00:00"))
    .order("starts_at")
    .returns<WeekAppointment[]>();

  const byDay = new Map<string, WeekAppointment[]>(days.map((d) => [d, []]));
  for (const a of data ?? []) byDay.get(ymd(new Date(a.starts_at)))?.push(a);

  const label = (d: string) => new Date(`${d}T12:00:00Z`);
  const range = `${monthDay.format(label(days[0]))} – ${monthDay.format(label(days[6]))}`;

  return (
    <>
      <PageHeader
        title="Naptár"
        subtitle={range}
        action={
          <ButtonLink href={`/naptar/uj?datum=${days.includes(today) ? today : monday}`}>
            <Plus className="size-4.5" /> Időpont
          </ButtonLink>
        }
      />

      <div className="mb-5 flex items-center gap-2">
        <WeekNav href={`/naptar?het=${addDays(monday, -7)}`} label="Előző hét">
          <ChevronLeft className="size-5" />
        </WeekNav>
        <Link href="/naptar" className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium">
          Ma
        </Link>
        <WeekNav href={`/naptar?het=${addDays(monday, 7)}`} label="Következő hét">
          <ChevronRight className="size-5" />
        </WeekNav>
        <span className="ml-auto text-sm text-muted">{data?.length ?? 0} időpont</span>
      </div>

      {/* Telefonon napokra bontott lista, széles képernyőn 7 oszlop */}
      <div className="space-y-4 lg:grid lg:grid-cols-7 lg:gap-2 lg:space-y-0">
        {days.map((d) => {
          const items = byDay.get(d) ?? [];
          const isToday = d === today;
          return (
            <section key={d} className="lg:min-h-64 lg:rounded-2xl lg:border lg:border-line lg:bg-surface lg:p-2">
              <header className="mb-2 flex items-baseline justify-between px-1">
                <h2 className={`font-semibold first-letter:uppercase ${isToday ? "text-accent" : ""}`}>
                  <span className="lg:hidden">{dayName.format(label(d))}</span>
                  <span className="hidden lg:inline">{dayShort.format(label(d))}</span>
                  <span className="ml-2 text-sm font-normal text-muted">{d.slice(8).replace(/^0/, "")}.</span>
                </h2>
                <Link
                  href={`/naptar/uj?datum=${d}`}
                  aria-label="Új időpont erre a napra"
                  className="rounded-lg p-1 text-muted hover:bg-surface-2 hover:text-accent"
                >
                  <Plus className="size-4.5" />
                </Link>
              </header>

              {items.length === 0 ? (
                <p className="px-1 text-sm text-muted/70 lg:hidden">Szabad nap</p>
              ) : (
                <ul className="space-y-1.5">
                  {items.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/edzes/${a.id}`}
                        className={`block rounded-xl border-l-4 bg-surface px-3 py-2.5 shadow-[0_0_0_1px_var(--line)] transition hover:bg-surface-2 lg:bg-surface-2 lg:shadow-none ${
                          a.status === "done" ? "border-ok" : a.status === "scheduled" ? "border-accent" : "border-line opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold tabular-nums">{formatTime(a.starts_at)}</span>
                          <span className="lg:hidden">
                            <StatusBadge status={a.status} />
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 truncate text-sm">
                          {a.kind === "group" && <Users className="size-3.5 shrink-0 text-muted" />}
                          <span className="truncate">{a.kind === "group" ? a.title || "Csoportos óra" : a.client?.name}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function WeekNav({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link href={href} aria-label={label} className="grid size-10 place-items-center rounded-xl border border-line bg-surface">
      {children}
    </Link>
  );
}

