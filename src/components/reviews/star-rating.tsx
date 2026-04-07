import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={cn(
            i <= rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/40"
          )}
        />
      ))}
    </div>
  );
}
