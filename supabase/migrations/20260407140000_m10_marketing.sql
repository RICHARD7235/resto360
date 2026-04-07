-- =====================================================================
-- M10 Marketing & Réseaux — Migration initiale
-- Tables : campaigns, segments, promotions, social_posts
-- =====================================================================

-- ---------------------------------------------------------------------
-- Segments (listes clients prédéfinies)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketing_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  estimated_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_segments_restaurant_idx
  ON marketing_segments(restaurant_id);

-- ---------------------------------------------------------------------
-- Campaigns (email / SMS)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email','sms')),
  segment_id uuid REFERENCES marketing_segments(id) ON DELETE SET NULL,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sent','archived')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipients_count integer NOT NULL DEFAULT 0,
  opens_count integer NOT NULL DEFAULT 0,
  clicks_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_campaigns_restaurant_status_idx
  ON marketing_campaigns(restaurant_id, status);

-- ---------------------------------------------------------------------
-- Promotions (codes promo)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketing_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','amount')),
  discount_value numeric(10,2) NOT NULL CHECK (discount_value > 0),
  starts_at date NOT NULL,
  ends_at date NOT NULL,
  max_uses integer,
  uses_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, code)
);

CREATE INDEX IF NOT EXISTS marketing_promotions_restaurant_idx
  ON marketing_promotions(restaurant_id, is_active);

-- ---------------------------------------------------------------------
-- Social posts (planification réseaux)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS marketing_social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('facebook','instagram')),
  content text NOT NULL,
  image_url text,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','archived')),
  published_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marketing_social_posts_restaurant_date_idx
  ON marketing_social_posts(restaurant_id, scheduled_at DESC);

-- ---------------------------------------------------------------------
-- Triggers updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION marketing_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_marketing_campaigns_touch ON marketing_campaigns;
CREATE TRIGGER trg_marketing_campaigns_touch
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION marketing_touch_updated_at();

DROP TRIGGER IF EXISTS trg_marketing_promotions_touch ON marketing_promotions;
CREATE TRIGGER trg_marketing_promotions_touch
  BEFORE UPDATE ON marketing_promotions
  FOR EACH ROW EXECUTE FUNCTION marketing_touch_updated_at();

DROP TRIGGER IF EXISTS trg_marketing_social_posts_touch ON marketing_social_posts;
CREATE TRIGGER trg_marketing_social_posts_touch
  BEFORE UPDATE ON marketing_social_posts
  FOR EACH ROW EXECUTE FUNCTION marketing_touch_updated_at();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
ALTER TABLE marketing_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_social_posts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['marketing_segments','marketing_campaigns','marketing_promotions','marketing_social_posts']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%1$s_select" ON %1$s', t);
    EXECUTE format('CREATE POLICY "%1$s_select" ON %1$s FOR SELECT USING (restaurant_id = get_user_restaurant_id())', t);

    EXECUTE format('DROP POLICY IF EXISTS "%1$s_insert" ON %1$s', t);
    EXECUTE format('CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id())', t);

    EXECUTE format('DROP POLICY IF EXISTS "%1$s_update" ON %1$s', t);
    EXECUTE format('CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE USING (restaurant_id = get_user_restaurant_id()) WITH CHECK (restaurant_id = get_user_restaurant_id())', t);

    EXECUTE format('DROP POLICY IF EXISTS "%1$s_delete" ON %1$s', t);
    EXECUTE format('CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE USING (restaurant_id = get_user_restaurant_id())', t);
  END LOOP;
END $$;
