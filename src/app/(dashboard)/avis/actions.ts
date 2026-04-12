"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireActionPermission } from "@/lib/rbac";
import type { ReviewInsert, ReviewSource } from "@/types/reviews";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, any, any>;

async function untyped(): Promise<UntypedClient> {
  return (await createClient()) as unknown as UntypedClient;
}

export async function createReview(input: Omit<ReviewInsert, "restaurant_id">) {
  const { restaurantId } = await requireActionPermission("m09_avis", "write");
  const supabase = await untyped();
  const { error } = await supabase.from("reviews").insert({
    ...input,
    restaurant_id: restaurantId,
  });
  if (error) throw error;
  revalidatePath("/avis");
}

export async function respondToReview(reviewId: string, response: string) {
  const { restaurantId } = await requireActionPermission("m09_avis", "write");
  if (!response.trim()) throw new Error("Réponse vide");
  const supabase = await untyped();
  // Get current user for responded_by
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("reviews")
    .update({ response: response.trim(), responded_by: user!.id })
    .eq("id", reviewId)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  revalidatePath("/avis");
}

export async function archiveReview(reviewId: string) {
  const { restaurantId } = await requireActionPermission("m09_avis", "write");
  const supabase = await untyped();
  const { error } = await supabase
    .from("reviews")
    .update({ status: "archived" })
    .eq("id", reviewId)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  revalidatePath("/avis");
}

export async function deleteReview(reviewId: string) {
  const { restaurantId } = await requireActionPermission("m09_avis", "delete");
  const supabase = await untyped();
  const { error } = await supabase
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  revalidatePath("/avis");
}

type CsvRow = {
  source: string;
  author_name: string;
  rating: number;
  comment?: string;
  review_date: string;
};

export async function importReviewsCsv(rows: CsvRow[]) {
  const { restaurantId } = await requireActionPermission("m09_avis", "write");
  const supabase = await untyped();
  const validSources: ReviewSource[] = ["manual", "google", "tripadvisor", "thefork", "facebook"];
  const payload = rows
    .filter((r) => r.author_name && r.rating >= 1 && r.rating <= 5 && r.review_date)
    .map((r) => ({
      restaurant_id: restaurantId,
      source: (validSources.includes(r.source as ReviewSource) ? r.source : "manual") as ReviewSource,
      author_name: r.author_name,
      rating: Math.round(r.rating),
      comment: r.comment ?? null,
      review_date: r.review_date,
    }));
  if (payload.length === 0) return { inserted: 0 };
  const { error } = await supabase.from("reviews").insert(payload);
  if (error) throw error;
  revalidatePath("/avis");
  return { inserted: payload.length };
}
