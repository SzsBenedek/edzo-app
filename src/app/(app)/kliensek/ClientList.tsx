"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";

export type ClientRow = {
  id: string;
  name: string;
  goal: string | null;
  active: boolean;
  referral_partner: string | null;
  remaining: number | null; // aktív bérlet hátralévő alkalmai
};

export function ClientList({ clients }: { clients: ClientRow[] }) {
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("hu");
    return clients.filter(
      (c) => (showArchived || c.active) && (!q || c.name.toLocaleLowerCase("hu").includes(q)),
    );
  }, [clients, query, showArchived]);

  const archivedCount = clients.filter((c) => !c.active).length;

  return (
    <>
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Keresés név alapján"
          className="w-full rounded-xl border border-line bg-surface py-3 pr-4 pl-10 outline-none focus:border-accent"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={clients.length === 0 ? "Még nincs kliens" : "Nincs találat"}
          text={clients.length === 0 ? "Vedd fel az első klienst a jobb felső gombbal." : undefined}
        />
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {filtered.map((c) => (
            <Link
              key={c.id}
              href={`/kliensek/${c.id}`}
              className={`flex items-center gap-3 px-4 py-3.5 transition hover:bg-surface-2 ${c.active ? "" : "opacity-55"}`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 font-semibold text-muted">
                {c.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{c.name}</div>
                <div className="truncate text-sm text-muted">
                  {[c.goal, c.referral_partner && `Ajánló: ${c.referral_partner}`].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              {c.remaining !== null && (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${
                    c.remaining <= 1 ? "bg-accent-soft text-accent" : "bg-ok-soft text-ok"
                  }`}
                >
                  {c.remaining} alk.
                </span>
              )}
              <ChevronRight className="size-5 shrink-0 text-muted" />
            </Link>
          ))}
        </Card>
      )}

      {archivedCount > 0 && (
        <button onClick={() => setShowArchived((v) => !v)} className="mt-4 text-sm text-muted underline-offset-4 hover:underline">
          {showArchived ? "Archivált kliensek elrejtése" : `Archivált kliensek mutatása (${archivedCount})`}
        </button>
      )}
    </>
  );
}
