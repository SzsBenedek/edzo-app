export const TZ = "Europe/Budapest";

const huf = new Intl.NumberFormat("hu-HU", {
  style: "currency",
  currency: "HUF",
  maximumFractionDigits: 0,
});

export function formatFt(value: number) {
  return huf.format(value);
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("hu-HU", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
}

export function formatDayLong(date: Date) {
  return new Intl.DateTimeFormat("hu-HU", {
    timeZone: TZ,
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

/** A mai nap budapesti idő szerinti kezdete és vége, ISO formában. */
export function todayRange(now = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now); // YYYY-MM-DD
  const offset = budapestOffset(now);
  return {
    start: `${ymd}T00:00:00${offset}`,
    end: `${ymd}T23:59:59.999${offset}`,
  };
}

/** Budapesti idő szerinti YYYY-MM-DD. */
export function ymd(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(date);
}

/** "2026-10-05" + "07:30" budapesti idő -> ISO időbélyeg a helyes (téli/nyári) eltolással. */
export function budapestToISO(date: string, time: string) {
  const offset = budapestOffset(new Date(`${date}T12:00:00Z`));
  return new Date(`${date}T${time}:00${offset}`).toISOString();
}

/** Naptári napok aritmetikája YYYY-MM-DD formában (időzónától független). */
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Az adott nap hetének hétfője. */
export function mondayOf(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = hétfő
  return addDays(date, -dow);
}

function budapestOffset(date: Date) {
  const part = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "longOffset" })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value; // pl. "GMT+02:00"
  return part?.replace("GMT", "") || "+00:00";
}
