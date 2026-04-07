import { Badge } from "@/components/ui/badge";
import type { ReviewSource } from "@/types/reviews";

const LABELS: Record<ReviewSource, string> = {
  manual: "Manuel",
  google: "Google",
  tripadvisor: "TripAdvisor",
  thefork: "TheFork",
  facebook: "Facebook",
};

const COLORS: Record<ReviewSource, string> = {
  manual: "bg-slate-100 text-slate-700",
  google: "bg-blue-100 text-blue-700",
  tripadvisor: "bg-emerald-100 text-emerald-700",
  thefork: "bg-rose-100 text-rose-700",
  facebook: "bg-indigo-100 text-indigo-700",
};

export function SourceBadge({ source }: { source: ReviewSource }) {
  return (
    <Badge variant="secondary" className={COLORS[source]}>
      {LABELS[source]}
    </Badge>
  );
}
