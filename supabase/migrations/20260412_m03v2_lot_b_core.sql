-- M03v2 Lot B Core: Annulations, Livraison/Emporter, Split Addition
-- Migration already applied on Supabase — this file is for repo tracking only.

-- =========================================================================
-- 1. New columns on orders
-- =========================================================================
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'dine_in'
    CHECK (order_type IN ('dine_in', 'takeaway', 'delivery')),
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS paid_amount numeric(10,2) NOT NULL DEFAULT 0;

-- =========================================================================
-- 2. New column on order_items
-- =========================================================================
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES order_payments(id);

-- =========================================================================
-- 3. order_payments table
-- =========================================================================
CREATE TABLE IF NOT EXISTS order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  amount numeric(10,2) NOT NULL,
  method text NOT NULL CHECK (method IN ('cash', 'card', 'check', 'ticket_restaurant', 'other')),
  label text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_payments_restaurant_access" ON order_payments
  FOR ALL USING (restaurant_id = get_user_restaurant_id());

-- =========================================================================
-- 4. order_cancellations table
-- =========================================================================
CREATE TABLE IF NOT EXISTS order_cancellations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES order_items(id) ON DELETE SET NULL,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  reason text NOT NULL,
  cancelled_by uuid REFERENCES auth.users(id),
  cancelled_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_cancellations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_cancellations_restaurant_access" ON order_cancellations
  FOR ALL USING (restaurant_id = get_user_restaurant_id());
