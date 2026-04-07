import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MarketingCampaign,
  MarketingPromotion,
  MarketingSegment,
  MarketingSocialPost,
  MarketingKpis,
} from "@/types/marketing";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, any, any>;

async function untyped(): Promise<UntypedClient> {
  return (await createClient()) as unknown as UntypedClient;
}

export async function getCampaigns(restaurantId: string): Promise<MarketingCampaign[]> {
  const supabase = await untyped();
  const { data, error } = await supabase
    .from("marketing_campaigns")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MarketingCampaign[];
}

export async function getSegments(restaurantId: string): Promise<MarketingSegment[]> {
  const supabase = await untyped();
  const { data, error } = await supabase
    .from("marketing_segments")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MarketingSegment[];
}

export async function getPromotions(restaurantId: string): Promise<MarketingPromotion[]> {
  const supabase = await untyped();
  const { data, error } = await supabase
    .from("marketing_promotions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("ends_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MarketingPromotion[];
}

export async function getSocialPosts(restaurantId: string): Promise<MarketingSocialPost[]> {
  const supabase = await untyped();
  const { data, error } = await supabase
    .from("marketing_social_posts")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MarketingSocialPost[];
}

export function computeMarketingKpis(
  campaigns: MarketingCampaign[],
  promotions: MarketingPromotion[],
  posts: MarketingSocialPost[],
): MarketingKpis {
  const activeCampaigns = campaigns.filter((c) => c.status === "sent" || c.status === "scheduled").length;
  const scheduledCampaigns = campaigns.filter((c) => c.status === "scheduled").length;

  const sent = campaigns.filter((c) => c.status === "sent" && c.recipients_count > 0);
  const avgOpenRate =
    sent.length === 0
      ? 0
      : sent.reduce((acc, c) => acc + c.opens_count / c.recipients_count, 0) / sent.length;

  const totalRecipients = sent.reduce((acc, c) => acc + c.recipients_count, 0);

  const today = new Date().toISOString().slice(0, 10);
  const activePromotions = promotions.filter(
    (p) => p.is_active && p.starts_at <= today && p.ends_at >= today,
  ).length;

  const scheduledPosts = posts.filter((p) => p.status === "scheduled").length;

  return {
    activeCampaigns,
    scheduledCampaigns,
    avgOpenRate,
    totalRecipients,
    activePromotions,
    scheduledPosts,
  };
}
