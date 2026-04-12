-- Table clearing workflow: track when staff marks table as cleared after payment
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cleared_at timestamptz DEFAULT NULL;

-- Index for filtering uncleared paid orders efficiently
CREATE INDEX IF NOT EXISTS idx_orders_paid_uncleared
  ON orders(status, cleared_at) WHERE status = 'paid' AND cleared_at IS NULL;
