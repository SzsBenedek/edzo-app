"use client";

import { useState } from "react";
import { formatFt } from "@/lib/format";

export type MonthPoint = { key: string; label: string; income: number; expense: number; current: boolean };

const SERIES = [
  { key: "income", label: "Bevétel", color: "var(--series-income)" },
  { key: "expense", label: "Kiadás", color: "var(--series-expense)" },
] as const;

function niceMax(v: number) {
  if (v <= 0) return 100000;
  const pow = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / pow / 2) * 2 * pow; // 2-es lépcsőkre kerekít, pl. 812e -> 1M
}

const compact = new Intl.NumberFormat("hu-HU", { notation: "compact", maximumFractionDigits: 1 });

export function MonthlyChart({ data }: { data: MonthPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.flatMap((d) => [d.income, d.expense])));
  const ticks = [0, 0.5, 1].map((f) => f * max);
  const active = hover !== null ? data[hover] : null;

  return (
    <figure>
      <div className="mb-4 flex items-center justify-between gap-4">
        <figcaption className="font-semibold">Utolsó 6 hónap</figcaption>
        <ul className="flex gap-4 text-sm text-muted">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex h-52 gap-2 pl-10">
        {/* Rács és tengely-feliratok */}
        {ticks.map((t) => (
          <div
            key={t}
            className="pointer-events-none absolute right-0 left-10 border-t border-line"
            style={{ bottom: `${(t / max) * 100}%` }}
          >
            <span className="absolute -top-2 -left-10 w-8 text-right text-[11px] text-muted tabular-nums">
              {compact.format(t)}
            </span>
          </div>
        ))}

        {data.map((d, i) => (
          <button
            key={d.key}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            onClick={() => setHover(hover === i ? null : i)}
            aria-label={`${d.label}: bevétel ${formatFt(d.income)}, kiadás ${formatFt(d.expense)}`}
            className={`relative z-10 flex flex-1 items-end justify-center gap-0.5 rounded-lg outline-none ${
              hover === i ? "bg-surface-2/70" : ""
            }`}
          >
            {SERIES.map((s) => (
              <span
                key={s.key}
                className="w-full max-w-7 rounded-t-[4px]"
                style={{ height: `${(d[s.key] / max) * 100}%`, background: s.color, minHeight: d[s.key] ? 2 : 0 }}
              />
            ))}
          </button>
        ))}

        {active && (
          <div
            role="status"
            className="pointer-events-none absolute top-0 z-20 w-44 -translate-x-1/2 rounded-xl border border-line bg-surface p-3 text-sm shadow-lg"
            style={{ left: `calc(2.5rem + (100% - 2.5rem) * ${(hover! + 0.5) / data.length})` }}
          >
            <div className="mb-1.5 font-semibold first-letter:uppercase">{active.label}</div>
            {SERIES.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="size-2 rounded-sm" style={{ background: s.color }} />
                  {s.label}
                </span>
                <span className="tabular-nums">{formatFt(active[s.key])}</span>
              </div>
            ))}
            <div className="mt-1.5 flex justify-between border-t border-line pt-1.5 font-medium">
              <span>Egyenleg</span>
              <span className="tabular-nums">{formatFt(active.income - active.expense)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-2 pl-10">
        {data.map((d) => (
          <span key={d.key} className={`flex-1 text-center text-xs ${d.current ? "font-semibold text-text" : "text-muted"}`}>
            {d.label.slice(0, 3)}
          </span>
        ))}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted">Táblázatként</summary>
        <table className="mt-2 w-full text-right tabular-nums">
          <thead className="text-muted">
            <tr>
              <th className="py-1 text-left font-normal">Hónap</th>
              <th className="font-normal">Bevétel</th>
              <th className="font-normal">Kiadás</th>
              <th className="font-normal">Egyenleg</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.key} className="border-t border-line">
                <td className="py-1.5 text-left first-letter:uppercase">{d.label}</td>
                <td>{formatFt(d.income)}</td>
                <td>{formatFt(d.expense)}</td>
                <td>{formatFt(d.income - d.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
