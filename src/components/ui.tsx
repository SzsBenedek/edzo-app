import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { AppointmentStatus } from "@/lib/types";

export type { AppointmentStatus };

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-text">
      <ChevronLeft className="size-4" />
      {label}
    </Link>
  );
}

export function ButtonLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition active:scale-[.98]"
    >
      {children}
    </Link>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted first-letter:uppercase">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface ${className}`}>{children}</div>;
}

export function EmptyState({ title, text }: { title: string; text?: string }) {
  return (
    <Card className="px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {text && <p className="mt-1 text-sm text-muted">{text}</p>}
    </Card>
  );
}

const statusStyles = {
  scheduled: "bg-surface-2 text-muted",
  done: "bg-ok-soft text-ok",
  cancelled: "bg-surface-2 text-muted line-through",
  no_show: "bg-accent-soft text-accent",
} as const;

const statusLabels = {
  scheduled: "Tervezett",
  done: "Elvégezve",
  cancelled: "Lemondva",
  no_show: "Nem jött el",
} as const;

export const STATUS_LABELS: Record<AppointmentStatus, string> = statusLabels;

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
