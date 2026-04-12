-- ============================================================================
-- M03v2 Lot C — UX : Table restaurant_tables pour plan de salle dynamique
-- Migration already applied on Supabase prod (12/04/2026)
-- This file is kept in the repo for history / CI reproducibility
-- ============================================================================

CREATE TABLE IF NOT EXISTS restaurant_tables (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  zone        text NOT NULL DEFAULT 'Salle',
  capacity    integer NOT NULL DEFAULT 4 CHECK (capacity BETWEEN 1 AND 20),
  shape       text NOT NULL DEFAULT 'square' CHECK (shape IN ('square', 'round', 'rectangle')),
  width       integer NOT NULL DEFAULT 1 CHECK (width BETWEEN 1 AND 3),
  height      integer NOT NULL DEFAULT 1 CHECK (height BETWEEN 1 AND 3),
  pos_x       real NOT NULL DEFAULT 50,
  pos_y       real NOT NULL DEFAULT 50,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by restaurant
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_restaurant
  ON restaurant_tables(restaurant_id)
  WHERE is_active = true;

-- Unique table name per restaurant
ALTER TABLE restaurant_tables
  ADD CONSTRAINT uq_restaurant_tables_name
  UNIQUE (restaurant_id, name);

-- RLS
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their restaurant tables"
  ON restaurant_tables FOR SELECT
  USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Admins/owners can manage restaurant tables"
  ON restaurant_tables FOR ALL
  USING (restaurant_id = get_user_restaurant_id());

-- Seed LCQF (La Cabane Qui Fume) — 12 tables
-- Uses the existing restaurant_id from the restaurants table
INSERT INTO restaurant_tables (restaurant_id, name, zone, capacity, shape, width, height, pos_x, pos_y)
SELECT r.id, t.name, t.zone, t.capacity, t.shape, t.width, t.height, t.pos_x, t.pos_y
FROM restaurants r
CROSS JOIN (VALUES
  ('T1',  'Salle',    4, 'square',    1, 1, 10, 15),
  ('T2',  'Salle',    4, 'square',    1, 1, 25, 15),
  ('T3',  'Salle',    4, 'square',    1, 1, 40, 15),
  ('T4',  'Salle',    2, 'round',     1, 1, 55, 15),
  ('T5',  'Salle',    6, 'rectangle', 2, 1, 10, 45),
  ('T6',  'Salle',    6, 'rectangle', 2, 1, 35, 45),
  ('T7',  'Salle',    8, 'rectangle', 3, 1, 65, 45),
  ('T8',  'Terrasse', 4, 'square',    1, 1, 10, 75),
  ('T9',  'Terrasse', 4, 'square',    1, 1, 25, 75),
  ('T10', 'Terrasse', 4, 'square',    1, 1, 40, 75),
  ('T11', 'Terrasse', 2, 'round',     1, 1, 55, 75),
  ('T12', 'Terrasse', 6, 'rectangle', 2, 1, 75, 75)
) AS t(name, zone, capacity, shape, width, height, pos_x, pos_y)
WHERE r.name ILIKE '%cabane%'
ON CONFLICT (restaurant_id, name) DO NOTHING;
