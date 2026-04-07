-- =====================================================================
-- M09 Avis & E-réputation — Migration initiale
-- Spec : docs/superpowers/specs/2026-04-07-m09-avis-design.md
-- =====================================================================

-- ---------------------------------------------------------------------
-- Table reviews
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('manual','google','tripadvisor','thefork','facebook')),
  external_id text,
  external_url text,
  author_name text NOT NULL,
  author_avatar_url text,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  review_date date NOT NULL,
  response text,
  response_date timestamptz,
  responded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','to_handle','handled','archived')),
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_restaurant_date_idx
  ON reviews(restaurant_id, review_date DESC);

CREATE INDEX IF NOT EXISTS reviews_status_idx
  ON reviews(restaurant_id, status);

CREATE INDEX IF NOT EXISTS reviews_source_idx
  ON reviews(restaurant_id, source);

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------

-- Auto status = to_handle si rating <= 2 à l'insertion
CREATE OR REPLACE FUNCTION reviews_set_initial_status()
RETURNS trigger AS $$
BEGIN
  IF NEW.rating <= 2 AND NEW.status = 'new' THEN
    NEW.status := 'to_handle';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reviews_initial_status ON reviews;
CREATE TRIGGER trg_reviews_initial_status
  BEFORE INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION reviews_set_initial_status();

-- Auto status = handled + response_date quand response passe de null à non-null
CREATE OR REPLACE FUNCTION reviews_handle_response()
RETURNS trigger AS $$
BEGIN
  IF (OLD.response IS NULL OR OLD.response = '') AND NEW.response IS NOT NULL AND NEW.response <> '' THEN
    NEW.status := 'handled';
    NEW.response_date := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reviews_handle_response ON reviews;
CREATE TRIGGER trg_reviews_handle_response
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION reviews_handle_response();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_select_own_restaurant" ON reviews;
CREATE POLICY "reviews_select_own_restaurant" ON reviews
  FOR SELECT USING (restaurant_id = get_user_restaurant_id());

DROP POLICY IF EXISTS "reviews_insert_own_restaurant" ON reviews;
CREATE POLICY "reviews_insert_own_restaurant" ON reviews
  FOR INSERT WITH CHECK (restaurant_id = get_user_restaurant_id());

DROP POLICY IF EXISTS "reviews_update_own_restaurant" ON reviews;
CREATE POLICY "reviews_update_own_restaurant" ON reviews
  FOR UPDATE USING (restaurant_id = get_user_restaurant_id())
  WITH CHECK (restaurant_id = get_user_restaurant_id());

DROP POLICY IF EXISTS "reviews_delete_own_restaurant" ON reviews;
CREATE POLICY "reviews_delete_own_restaurant" ON reviews
  FOR DELETE USING (restaurant_id = get_user_restaurant_id());
