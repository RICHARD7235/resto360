import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Review, ReviewKpis, TrendPoint } from "@/types/reviews";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, any, any>;

async function untyped(): Promise<UntypedClient> {
  return (await createClient()) as unknown as UntypedClient;
}

export async function getReviews(restaurantId: string): Promise<Review[]> {
  const supabase = await untyped();
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("review_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Review[];
}

export async function getReviewById(id: string): Promise<Review | null> {
  const supabase = await untyped();
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Review;
}

export function computeKpis(reviews: Review[]): ReviewKpis {
  const total = reviews.length;
  const average =
    total === 0 ? 0 : reviews.reduce((sum, r) => sum + r.rating, 0) / total;
  const responded = reviews.filter((r) => r.response && r.response.length > 0).length;
  const responseRate = total === 0 ? 0 : (responded / total) * 100;

  const now = new Date();
  const d30 = new Date(now);
  d30.setDate(d30.getDate() - 30);
  const d60 = new Date(now);
  d60.setDate(d60.getDate() - 60);

  const last30 = reviews.filter((r) => new Date(r.review_date) >= d30);
  const prev30 = reviews.filter(
    (r) => new Date(r.review_date) >= d60 && new Date(r.review_date) < d30
  );
  const avg = (arr: Review[]) =>
    arr.length === 0 ? 0 : arr.reduce((s, r) => s + r.rating, 0) / arr.length;
  const trend30d = avg(last30) - avg(prev30);

  const toHandleCount = reviews.filter((r) => r.status === "to_handle").length;

  const distribution: ReviewKpis["distribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    const k = Math.max(1, Math.min(5, r.rating)) as 1 | 2 | 3 | 4 | 5;
    distribution[k] += 1;
  }

  return { total, average, responseRate, trend30d, toHandleCount, distribution };
}

export function computeTrend(reviews: Review[], days: 30 | 90): TrendPoint[] {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days);

  const map = new Map<string, { sum: number; count: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { sum: 0, count: 0 });
  }

  for (const r of reviews) {
    if (new Date(r.review_date) < start) continue;
    const key = r.review_date.slice(0, 10);
    const e = map.get(key);
    if (e) {
      e.sum += r.rating;
      e.count += 1;
    }
  }

  return Array.from(map.entries()).map(([date, { sum, count }]) => ({
    date,
    average: count === 0 ? 0 : sum / count,
    count,
  }));
}
