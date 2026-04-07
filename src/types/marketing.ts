// M10 Marketing & Réseaux — Types manuels (tables hors database.types.ts)

export type CampaignChannel = "email" | "sms";
export type CampaignStatus = "draft" | "scheduled" | "sent" | "archived";
export type PromotionDiscountType = "percent" | "amount";
export type SocialPlatform = "facebook" | "instagram";
export type SocialPostStatus = "draft" | "scheduled" | "published" | "archived";

export type MarketingSegment = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  estimated_count: number;
  created_at: string;
};

export type MarketingCampaign = {
  id: string;
  restaurant_id: string;
  name: string;
  channel: CampaignChannel;
  segment_id: string | null;
  subject: string | null;
  message: string;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  recipients_count: number;
  opens_count: number;
  clicks_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MarketingCampaignInsert = {
  restaurant_id: string;
  name: string;
  channel: CampaignChannel;
  message: string;
  segment_id?: string | null;
  subject?: string | null;
  status?: CampaignStatus;
  scheduled_at?: string | null;
};

export type MarketingPromotion = {
  id: string;
  restaurant_id: string;
  code: string;
  description: string | null;
  discount_type: PromotionDiscountType;
  discount_value: number;
  starts_at: string;
  ends_at: string;
  max_uses: number | null;
  uses_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MarketingPromotionInsert = {
  restaurant_id: string;
  code: string;
  discount_type: PromotionDiscountType;
  discount_value: number;
  starts_at: string;
  ends_at: string;
  description?: string | null;
  max_uses?: number | null;
  is_active?: boolean;
};

export type MarketingSocialPost = {
  id: string;
  restaurant_id: string;
  platform: SocialPlatform;
  content: string;
  image_url: string | null;
  scheduled_at: string;
  status: SocialPostStatus;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MarketingSocialPostInsert = {
  restaurant_id: string;
  platform: SocialPlatform;
  content: string;
  scheduled_at: string;
  image_url?: string | null;
  status?: SocialPostStatus;
};

export type MarketingKpis = {
  activeCampaigns: number;
  scheduledCampaigns: number;
  avgOpenRate: number; // 0-1
  totalRecipients: number;
  activePromotions: number;
  scheduledPosts: number;
};
