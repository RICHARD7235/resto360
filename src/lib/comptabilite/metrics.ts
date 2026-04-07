import type { AccountingSnapshot, KpiKey } from "@/types/comptabilite";

function periodToDate(period: string): Date {
  // period format "YYYY-MM-DD" or "YYYY-MM"
  const [y, m] = period.split("-");
  return new Date(Number(y), Number(m) - 1, 1);
}

export function pickCurrent(
  snapshots: AccountingSnapshot[],
  referenceDate: Date = new Date("2026-03-01"),
): AccountingSnapshot | null {
  const eligible = snapshots
    .filter((s) => periodToDate(s.period).getTime() <= referenceDate.getTime())
    .sort((a, b) => periodToDate(a.period).getTime() - periodToDate(b.period).getTime());
  return eligible.length ? eligible[eligible.length - 1] : null;
}

export function pickPrevYear(
  snapshots: AccountingSnapshot[],
  period: string,
): AccountingSnapshot | null {
  const d = periodToDate(period);
  const target = new Date(d.getFullYear() - 1, d.getMonth(), 1);
  return (
    snapshots.find((s) => {
      const sd = periodToDate(s.period);
      return sd.getFullYear() === target.getFullYear() && sd.getMonth() === target.getMonth();
    }) ?? null
  );
}

export function calcDelta(current: number, previous: number | null): number | null {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function lastNMonths(
  snapshots: AccountingSnapshot[],
  endPeriod: string,
  n: number,
): AccountingSnapshot[] {
  const sorted = [...snapshots].sort(
    (a, b) => periodToDate(a.period).getTime() - periodToDate(b.period).getTime(),
  );
  const endTs = periodToDate(endPeriod).getTime();
  const eligible = sorted.filter((s) => periodToDate(s.period).getTime() <= endTs);
  return eligible.slice(-n);
}

export function sparklineSerie(
  snapshots: AccountingSnapshot[],
  key: KpiKey,
  endPeriod: string,
  months = 12,
): number[] {
  return lastNMonths(snapshots, endPeriod, months).map((s) => Number(s[key] ?? 0));
}
