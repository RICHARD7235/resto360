"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { requireActionPermission } from "@/lib/rbac";
import type {
  MarketingCampaignInsert,
  MarketingPromotionInsert,
  MarketingSocialPostInsert,
} from "@/types/marketing";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, any, any>;

async function untyped(): Promise<UntypedClient> {
  return (await createClient()) as unknown as UntypedClient;
}

// ==================== CAMPAIGNS ====================

export async function createCampaign(
  input: Omit<MarketingCampaignInsert, "restaurant_id">,
) {
  const { restaurantId } = await requireActionPermission("m10_marketing", "write");
  const supabase = await untyped();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("marketing_campaigns").insert({
    ...input,
    restaurant_id: restaurantId,
    created_by: user!.id,
  });
  if (error) throw error;
  revalidatePath("/marketing");
  revalidatePath("/marketing/campagnes");
}

export async function updateCampaign(
  id: string,
  patch: Partial<Omit<MarketingCampaignInsert, "restaurant_id">>,
) {
  const { restaurantId } = await requireActionPermission("m10_marketing", "write");
  const supabase = await untyped();
  const { error } = await supabase
    .from("marketing_campaigns")
    .update(patch)
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  revalidatePath("/marketing");
  revalidatePath("/marketing/campagnes");
}

export async function markCampaignSent(id: string) {
  const { restaurantId } = await requireActionPermission("m10_marketing", "write");
  const supabase = await untyped();
  // Simulation : passage en "sent" avec stats factices mais cohérentes
  const { data: c } = await supabase
    .from("marketing_campaigns")
    .select("recipients_count")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();
  const recipients = Math.max(50, (c?.recipients_count as number) || 200);
  const opens = Math.round(recipients * (0.35 + Math.random() * 0.25));
  const clicks = Math.round(opens * (0.15 + Math.random() * 0.15));
  const { error } = await supabase
    .from("marketing_campaigns")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      recipients_count: recipients,
      opens_count: opens,
      clicks_count: clicks,
    })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  revalidatePath("/marketing");
  revalidatePath("/marketing/campagnes");
}

export async function deleteCampaign(id: string) {
  const { restaurantId } = await requireActionPermission("m10_marketing", "delete");
  const supabase = await untyped();
  const { error } = await supabase
    .from("marketing_campaigns")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  revalidatePath("/marketing");
  revalidatePath("/marketing/campagnes");
}

// ==================== PROMOTIONS ====================

export async function createPromotion(
  input: Omit<MarketingPromotionInsert, "restaurant_id">,
) {
  const { restaurantId } = await requireActionPermission("m10_marketing", "write");
  const supabase = await untyped();
  const { error } = await supabase.from("marketing_promotions").insert({
    ...input,
    code: input.code.toUpperCase().trim(),
    restaurant_id: restaurantId,
  });
  if (error) throw error;
  revalidatePath("/marketing");
  revalidatePath("/marketing/promotions");
}

export async function togglePromotion(id: string, isActive: boolean) {
  const { restaurantId } = await requireActionPermission("m10_marketing", "write");
  const supabase = await untyped();
  const { error } = await supabase
    .from("marketing_promotions")
    .update({ is_active: isActive })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  revalidatePath("/marketing");
  revalidatePath("/marketing/promotions");
}

export async function deletePromotion(id: string) {
  const { restaurantId } = await requireActionPermission("m10_marketing", "delete");
  const supabase = await untyped();
  const { error } = await supabase
    .from("marketing_promotions")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  revalidatePath("/marketing");
  revalidatePath("/marketing/promotions");
}

// ==================== SOCIAL POSTS ====================

export async function createSocialPost(
  input: Omit<MarketingSocialPostInsert, "restaurant_id">,
) {
  const { restaurantId } = await requireActionPermission("m10_marketing", "write");
  const supabase = await untyped();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("marketing_social_posts").insert({
    ...input,
    restaurant_id: restaurantId,
    created_by: user!.id,
  });
  if (error) throw error;
  revalidatePath("/marketing");
  revalidatePath("/marketing/reseaux");
}

export async function updateSocialPost(
  id: string,
  patch: Partial<Omit<MarketingSocialPostInsert, "restaurant_id">>,
) {
  const { restaurantId } = await requireActionPermission("m10_marketing", "write");
  const supabase = await untyped();
  const { error } = await supabase
    .from("marketing_social_posts")
    .update(patch)
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  revalidatePath("/marketing");
  revalidatePath("/marketing/reseaux");
}

export async function deleteSocialPost(id: string) {
  const { restaurantId } = await requireActionPermission("m10_marketing", "delete");
  const supabase = await untyped();
  const { error } = await supabase
    .from("marketing_social_posts")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  revalidatePath("/marketing");
  revalidatePath("/marketing/reseaux");
}
