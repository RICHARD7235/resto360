"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ReviewInsert, ReviewSource } from "@/types/reviews";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, any, any>;

async function untyped(): Promise<UntypedClient> {
  return (await createClient()) as unknown as UntypedClient;
}

async function getCtx(): Promise<{ userId: string; restaurantId: string }> {
  const supabase = await untyped();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id")
    .eq("id", user.id)
    .single();
  if (!profile?.restaurant_id) redirect("/connexion");
  return { userId: user.id, restaurantId: profile.restaurant_id as string };
}

export async function createReview(input: Omit<ReviewInsert, "restaurant_id">) {
  const { restaurantId } = await getCtx();
  const supabase = await untyped();
  const { error } = await supabase.from("reviews").insert({
    ...input,
    restaurant_id: restaurantId,
  });
  if (error) throw error;
  revalidatePath("/avis");
}

export async function respondToReview(reviewId: string, response: string) {
  const { userId } = await getCtx();
  if (!response.trim()) throw new Error("Réponse vide");
  const supabase = await untyped();
  const { error } = await supabase
    .from("reviews")
    .update({ response: response.trim(), responded_by: userId })
    .eq("id", reviewId);
  if (error) throw error;
  revalidatePath("/avis");
}

export async function archiveReview(reviewId: string) {
  await getCtx();
  const supabase = await untyped();
  const { error } = await supabase
    .from("reviews")
    .update({ status: "archived" })
    .eq("id", reviewId);
  if (error) throw error;
  revalidatePath("/avis");
}

export async function deleteReview(reviewId: string) {
  await getCtx();
  const supabase = await untyped();
  const { error } = await supabase.from("reviews").delete().eq("id", reviewId);
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
  const { restaurantId } = await getCtx();
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
