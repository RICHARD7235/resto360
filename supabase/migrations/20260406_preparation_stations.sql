-- Migration: Preparation Stations & Tickets
-- Date: 2026-04-06
-- Description: Add configurable preparation stations and per-station tickets

-- 1. Create preparation_stations table
CREATE TABLE preparation_stations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6B7280',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Create preparation_tickets table
CREATE TABLE preparation_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  station_id uuid NOT NULL REFERENCES preparation_stations(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'ready', 'served')),
  started_at timestamptz,
  ready_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, station_id)
);

-- 3. Add columns to existing tables
ALTER TABLE menu_categories ADD COLUMN default_station_id uuid REFERENCES preparation_stations(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN station_id uuid REFERENCES preparation_stations(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD COLUMN preparation_ticket_id uuid REFERENCES preparation_tickets(id) ON DELETE SET NULL;

-- 4. RLS policies for preparation_stations
ALTER TABLE preparation_stations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stations of their restaurant"
  ON preparation_stations FOR SELECT
  USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Users can insert stations for their restaurant"
  ON preparation_stations FOR INSERT
  WITH CHECK (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Users can update stations of their restaurant"
  ON preparation_stations FOR UPDATE
  USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Users can delete stations of their restaurant"
  ON preparation_stations FOR DELETE
  USING (restaurant_id = get_user_restaurant_id());

-- 5. RLS policies for preparation_tickets
ALTER TABLE preparation_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tickets via orders of their restaurant"
  ON preparation_tickets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = preparation_tickets.order_id
      AND orders.restaurant_id = get_user_restaurant_id()
    )
  );

CREATE POLICY "Users can insert tickets for their restaurant orders"
  ON preparation_tickets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = preparation_tickets.order_id
      AND orders.restaurant_id = get_user_restaurant_id()
    )
  );

CREATE POLICY "Users can update tickets for their restaurant orders"
  ON preparation_tickets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = preparation_tickets.order_id
      AND orders.restaurant_id = get_user_restaurant_id()
    )
  );

-- 6. Indexes
CREATE INDEX idx_preparation_stations_restaurant ON preparation_stations(restaurant_id);
CREATE INDEX idx_preparation_tickets_order ON preparation_tickets(order_id);
CREATE INDEX idx_preparation_tickets_station ON preparation_tickets(station_id);
CREATE INDEX idx_preparation_tickets_status ON preparation_tickets(status);
CREATE INDEX idx_order_items_ticket ON order_items(preparation_ticket_id);

-- 7. Seed default stations for existing restaurants
INSERT INTO preparation_stations (restaurant_id, name, display_order, color, is_active)
SELECT id, 'Cuisine', 1, '#E85D26', true FROM restaurants
UNION ALL
SELECT id, 'Bar', 2, '#3B82F6', true FROM restaurants;
