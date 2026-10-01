"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Dumbbell,
  House,
  LogOut,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/app/login/actions";

type Item = { href: string; label: string; icon: LucideIcon };

const items: Item[] = [
  { href: "/", label: "Ma", icon: House },
  { href: "/naptar", label: "Naptár", icon: CalendarDays },
  { href: "/kliensek", label: "Kliensek", icon: Users },
  { href: "/gyakorlatok", label: "Gyakorlatok", icon: Dumbbell },
  { href: "/penzugyek", label: "Pénzügyek", icon: Wallet },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Asztali oldalsáv */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
        <div className="mb-6 flex items-center gap-2.5 px-3">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-ink">
            <Dumbbell className="size-4.5" />
          </span>
          <span className="font-semibold">Edzőnapló</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition ${
                  active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-text"
                }`}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <Link
            href="/beallitasok"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] ${
              isActive(pathname, "/beallitasok") ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-text"
            }`}
          >
            <Settings className="size-5" />
            Beállítások
          </Link>
          <form action={logout}>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] text-muted hover:bg-surface-2 hover:text-text">
              <LogOut className="size-5" />
              Kijelentkezés
            </button>
          </form>
        </div>
      </aside>

      {/* Mobil alsó sáv */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                    active ? "text-accent" : "text-muted"
                  }`}
                >
                  <Icon className="size-6" strokeWidth={active ? 2.25 : 1.75} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
