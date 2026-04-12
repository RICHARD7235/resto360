-- M03 V3: Course Firing / Envoi par service
-- Hold & Fire model: items grouped by course, only current course visible in kitchen

-- 1. order_items.course_number
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS course_number int NOT NULL DEFAULT 1;

-- 2. preparation_tickets: drop old unique, add course_number + fired_at
ALTER TABLE preparation_tickets
  DROP CONSTRAINT IF EXISTS preparation_tickets_order_id_station_id_key;

ALTER TABLE preparation_tickets
  ADD COLUMN IF NOT EXISTS course_number int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fired_at timestamptz;

ALTER TABLE preparation_tickets
  ADD CONSTRAINT preparation_tickets_order_station_course_key
    UNIQUE (order_id, station_id, course_number);

-- 3. Backfill: mark all existing tickets as fired (they were created pre-coursing)
UPDATE preparation_tickets SET fired_at = created_at WHERE fired_at IS NULL;

-- 4. Auto-fire setting on restaurants
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS auto_fire_delay_minutes int DEFAULT NULL;

-- 5. Index for fired_at filtering
CREATE INDEX IF NOT EXISTS idx_preparation_tickets_fired
  ON preparation_tickets(fired_at) WHERE fired_at IS NOT NULL;
