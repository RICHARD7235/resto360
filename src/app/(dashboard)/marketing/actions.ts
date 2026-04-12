"use server";

import { z } from "zod";
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

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const campaignSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["sms", "email", "push"]),
  message: z.string().min(1).max(2000),
  target_audience: z.string().max(200).optional().nullable(),
  scheduled_at: z.string().datetime().optional().nullable(),
  status: z.string().optional().nullable(),
  subject: z.string().max(200).optional().nullable(),
  recipients_count: z.number().int().min(0).optional().nullable(),
});

const promotionSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().min(1).max(50),
  discount_type: z.enum(["percentage", "fixed"]),
  discount_value: z.number().min(0),
  starts_at: z.string().regex(dateRegex),
  ends_at: z.string().regex(dateRegex).optional().nullable(),
  is_active: z.boolean().optional(),
  description: z.string().max(500).optional().nullable(),
  min_order_amount: z.number().min(0).optional().nullable(),
  max_uses: z.number().int().min(0).optional().nullable(),
});

const socialPostSchema = z.object({
  platform: z.enum(["instagram", "facebook", "tiktok", "google"]),
  content: z.string().min(1).max(2000),
  image_url: z.string().url().optional().nullable(),
  scheduled_at: z.string().datetime().optional().nullable(),
  status: z.string().optional().nullable(),
});

// ==================== CAMPAIGNS ====================

export async function createCampaign(
  input: Omit<MarketingCampaignInsert, "restaurant_id">,
) {
  campaignSchema.parse(input);
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
  campaignSchema.partial().parse(patch);
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
  promotionSchema.parse(input);
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
  socialPostSchema.parse(input);
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
  socialPostSchema.partial().parse(patch);
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
