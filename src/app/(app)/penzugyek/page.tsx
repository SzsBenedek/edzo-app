import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { formatFt, ymd } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui";
import { MonthlyChart, type MonthPoint } from "./MonthlyChart";
import { AddTransactionForm, TransactionList, type TxRow } from "./TransactionPanel";

const monthLabel = new Intl.DateTimeFormat("hu-HU", { year: "numeric", month: "long", timeZone: "UTC" });
const monthOnly = new Intl.DateTimeFormat("hu-HU", { month: "long", timeZone: "UTC" });

/** "2026-10" + n hónap -> "2026-11" */
function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export default async function FinancePage({ searchParams }: PageProps<"/penzugyek">) {
  const { honap } = await searchParams;
  const { supabase } = await requireUser();

  const today = ymd(new Date());
  const currentYm = today.slice(0, 7);
  const ym = typeof honap === "string" && /^\d{4}-\d{2}$/.test(honap) && honap <= currentYm ? honap : currentYm;
  const from = `${ym}-01`;
  const to = `${shiftMonth(ym, 1)}-01`;
  const chartFrom = `${shiftMonth(ym, -5)}-01`;

  await supabase.rpc("post_recurring_expenses");

  const [{ data: month }, { data: history }, { data: cats }] = await Promise.all([
    supabase
      .from("transactions")
      .select("id, type, category, occurred_on, amount, referral_fee, note, appointment_id, pass_id, recurring_expense_id, client:clients(name)")
      .gte("occurred_on", from)
      .lt("occurred_on", to)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .returns<TxRow[]>(),
    supabase.from("transactions").select("type, amount, occurred_on").gte("occurred_on", chartFrom).lt("occurred_on", to),
    supabase.from("transactions").select("category").limit(500),
  ]);

  const items = month ?? [];
  const sum = (type: "income" | "expense") => items.filter((t) => t.type === type).reduce((s, t) => s + t.amount, 0);
  const income = sum("income");
  const expense = sum("expense");
  const referral = items.reduce((s, t) => s + t.referral_fee, 0);

  const chart: MonthPoint[] = Array.from({ length: 6 }, (_, i) => {
    const key = shiftMonth(ym, i - 5);
    const rows = (history ?? []).filter((t) => t.occurred_on.startsWith(key));
    return {
      key,
      label: monthOnly.format(new Date(`${key}-01T12:00:00Z`)),
      income: rows.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      expense: rows.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
      current: key === ym,
    };
  });

  const byCategory = (type: "income" | "expense") => {
    const m = new Map<string, number>();
    for (const t of items) if (t.type === type) m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };

  const categories = [...new Set((cats ?? []).map((c) => c.category))].sort((a, b) => a.localeCompare(b, "hu"));

  return (
    <>
      <PageHeader title="Pénzügyek" subtitle={monthLabel.format(new Date(`${from}T12:00:00Z`))} />

      <div className="mb-5 flex items-center gap-2">
        <MonthNav href={`/penzugyek?honap=${shiftMonth(ym, -1)}`} label="Előző hónap">
          <ChevronLeft className="size-5" />
        </MonthNav>
        <Link href="/penzugyek" className="rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium">
          Aktuális
        </Link>
        {ym < currentYm && (
          <MonthNav href={`/penzugyek?honap=${shiftMonth(ym, 1)}`} label="Következő hónap">
            <ChevronRight className="size-5" />
          </MonthNav>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Bevétel" value={formatFt(income)} swatch="var(--series-income)" />
        <Stat label="Kiadás" value={formatFt(expense)} swatch="var(--series-expense)" />
        <Stat label="Egyenleg" value={formatFt(income - expense)} tone={income - expense >= 0 ? "ok" : "danger"} />
        <Stat label="Ajánlóknak fizetve" value={formatFt(referral)} hint="már levonva a bevételből" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Card className="p-5">
            <MonthlyChart data={chart} />
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Breakdown title="Bevétel forrása" rows={byCategory("income")} total={income} color="var(--series-income)" />
            <Breakdown title="Kiadások" rows={byCategory("expense")} total={expense} color="var(--series-expense)" />
          </div>

          <TransactionList key={ym} items={items} />
        </div>

        <Card className="p-5 lg:sticky lg:top-10">
          <AddTransactionForm categories={categories} defaultDate={ym === currentYm ? today : from} />
        </Card>
      </div>
    </>
  );
}

function MonthNav({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link href={href} aria-label={label} className="grid size-10 place-items-center rounded-xl border border-line bg-surface">
      {children}
    </Link>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
  swatch,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ok" | "danger";
  swatch?: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-1.5 text-sm text-muted">
        {swatch && <span className="size-2.5 rounded-sm" style={{ background: swatch }} />}
        {label}
      </div>
      <div
        className={`mt-1 truncate text-xl font-semibold tabular-nums md:text-2xl ${
          tone === "ok" ? "text-ok" : tone === "danger" ? "text-danger" : ""
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-muted">{hint}</div>}
    </Card>
  );
}

function Breakdown({ title, rows, total, color }: { title: string; rows: [string, number][]; total: number; color: string }) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nincs tétel.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map(([cat, amount]) => (
            <li key={cat}>
              <div className="mb-1 flex justify-between gap-3 text-sm">
                <span>{cat}</span>
                <span className="tabular-nums text-muted">{formatFt(amount)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${(amount / total) * 100}%`, background: color }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
