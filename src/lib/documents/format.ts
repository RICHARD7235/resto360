import type { UrgencyLevel } from "@/types/documents";

export function formatExpiry(date: string | null): string {
  if (!date) return "Sans échéance";
  const d = new Date(date);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function urgencyColor(level: UrgencyLevel): string {
  switch (level) {
    case "expired":
      return "bg-red-100 text-red-800 border-red-200";
    case "critical":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "warning":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "info":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "ok":
    default:
      return "bg-green-100 text-green-800 border-green-200";
  }
}

export function urgencyLabel(level: UrgencyLevel): string {
  switch (level) {
    case "expired":
      return "Expiré";
    case "critical":
      return "Critique (≤30j)";
    case "warning":
      return "À prévoir (≤60j)";
    case "info":
      return "À surveiller (≤90j)";
    case "ok":
    default:
      return "À jour";
  }
}

export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
