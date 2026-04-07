"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ReviewCard } from "./review-card";
import type { Review, ReviewSource } from "@/types/reviews";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  const [source, setSource] = useState<string>("all");
  const [minRating, setMinRating] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (source !== "all" && r.source !== (source as ReviewSource)) return false;
      if (minRating !== "all" && r.rating < parseInt(minRating)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.author_name.toLowerCase().includes(q) &&
          !(r.comment ?? "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [reviews, source, minRating, search]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={source} onValueChange={(v) => setSource(v ?? "all")}>
          <SelectTrigger>
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes sources</SelectItem>
            <SelectItem value="google">Google</SelectItem>
            <SelectItem value="tripadvisor">TripAdvisor</SelectItem>
            <SelectItem value="thefork">TheFork</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="manual">Manuel</SelectItem>
          </SelectContent>
        </Select>
        <Select value={minRating} onValueChange={(v) => setMinRating(v ?? "all")}>
          <SelectTrigger>
            <SelectValue placeholder="Note min" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes notes</SelectItem>
            <SelectItem value="5">5★ uniquement</SelectItem>
            <SelectItem value="4">4★ et +</SelectItem>
            <SelectItem value="3">3★ et +</SelectItem>
            <SelectItem value="2">2★ et +</SelectItem>
            <SelectItem value="1">1★ et +</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} avis sur {reviews.length}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
          Aucun avis ne correspond aux filtres.
        </div>
      )}
    </div>
  );
}
