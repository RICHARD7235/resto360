// M09 Avis & E-réputation — Types manuels (table reviews pas dans database.types.ts)

export type ReviewSource = "manual" | "google" | "tripadvisor" | "thefork" | "facebook";
export type ReviewStatus = "new" | "to_handle" | "handled" | "archived";

export type Review = {
  id: string;
  restaurant_id: string;
  source: ReviewSource;
  external_id: string | null;
  external_url: string | null;
  author_name: string;
  author_avatar_url: string | null;
  rating: number;
  comment: string | null;
  review_date: string;
  response: string | null;
  response_date: string | null;
  responded_by: string | null;
  status: ReviewStatus;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewInsert = {
  restaurant_id: string;
  source: ReviewSource;
  author_name: string;
  rating: number;
  review_date: string;
  comment?: string | null;
  author_avatar_url?: string | null;
  external_id?: string | null;
  external_url?: string | null;
  response?: string | null;
};

export type ReviewKpis = {
  total: number;
  average: number;
  responseRate: number;
  trend30d: number; // +/- moyenne vs 30j précédents
  toHandleCount: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type KeywordHit = { word: string; count: number };
export type KeywordExtraction = {
  positive: KeywordHit[];
  negative: KeywordHit[];
};

export type TrendPoint = { date: string; average: number; count: number };
