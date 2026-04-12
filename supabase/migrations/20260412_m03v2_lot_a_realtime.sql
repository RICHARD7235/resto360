-- M03 V2 Lot A: Enable Realtime on preparation_tickets + add position column

-- Add position for KDS drag-and-drop ordering (used by Lot C, but column needed now)
ALTER TABLE preparation_tickets
  ADD COLUMN IF NOT EXISTS position int DEFAULT 0;

-- Enable Realtime on preparation_tickets
ALTER PUBLICATION supabase_realtime ADD TABLE preparation_tickets;
