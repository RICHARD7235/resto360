const eurFull = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const intFr = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function formatEur(n: number, opts?: { compact?: boolean }): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (opts?.compact && Math.abs(n) >= 10000) {
    const k = n / 1000;
    return `${intFr.format(Math.round(k * 10) / 10).replace(",", ",")} k€`
      .replace(/\.0(?= k€)/, "");
  }
  return eurFull.format(n);
}

export function formatPct(n: number, digits = 1): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits).replace(".", ",")} %`;
}

export function formatInt(n: number): string {
  if (n == null || Number.isNaN(n)) return "—";
  return intFr.format(n);
}

export function formatByKind(
  value: number,
  kind: "eur" | "pct" | "int",
  compact?: boolean,
): string {
  switch (kind) {
    case "eur":
      return formatEur(value, { compact });
    case "pct":
      return formatPct(value);
    case "int":
      return formatInt(value);
  }
}
