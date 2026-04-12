-- =============================================================================
-- Atomic Stock & Recipe Functions
-- Fixes race conditions identified by QA audit (2026-04-12)
--
-- Fix 1: adjust_stock_quantity — replaces read-then-write in createManualMovement
--         and receivePurchaseOrder (M05)
-- Fix 2: replace_recipe_ingredients — replaces DELETE ALL + INSERT in updateRecipe (M04)
--
-- DO NOT apply automatically — apply via Supabase Dashboard > SQL Editor
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Fix 1: Atomic stock adjustment
-- Locks the row, updates quantity, and inserts movement in a single transaction.
-- Eliminates race condition where concurrent reads could see stale quantity.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION adjust_stock_quantity(
  p_stock_item_id UUID,
  p_restaurant_id UUID,
  p_delta NUMERIC,
  p_movement_type TEXT,
  p_reference_type TEXT DEFAULT 'manual',
  p_reference_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_unit_cost NUMERIC DEFAULT NULL
) RETURNS NUMERIC AS $$
DECLARE
  v_new_qty NUMERIC;
BEGIN
  -- Lock the row (FOR UPDATE implicit via UPDATE) and update atomically
  UPDATE stock_items
  SET current_quantity = current_quantity + p_delta,
      updated_at = NOW()
  WHERE id = p_stock_item_id
    AND restaurant_id = p_restaurant_id
  RETURNING current_quantity INTO v_new_qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock item % not found for restaurant %', p_stock_item_id, p_restaurant_id;
  END IF;

  -- Insert movement record in the same transaction
  INSERT INTO stock_movements (
    stock_item_id,
    type,
    quantity,
    reference_type,
    reference_id,
    notes,
    created_by,
    unit_cost
  ) VALUES (
    p_stock_item_id,
    p_movement_type,
    ABS(p_delta),
    p_reference_type,
    p_reference_id,
    p_notes,
    p_user_id,
    p_unit_cost
  );

  RETURN v_new_qty;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (RLS on stock_items still applies for reads)
GRANT EXECUTE ON FUNCTION adjust_stock_quantity TO authenticated;

COMMENT ON FUNCTION adjust_stock_quantity IS
  'Atomically adjusts stock quantity and records a movement. '
  'p_delta is positive for additions (purchase, return) and negative for '
  'removals (consumption, waste). Returns the new quantity.';


-- ---------------------------------------------------------------------------
-- Fix 2: Atomic recipe ingredients replacement
-- Deletes and re-inserts ingredients in a single transaction.
-- Prevents orphaned recipes if the INSERT fails after DELETE.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION replace_recipe_ingredients(
  p_recipe_id UUID,
  p_restaurant_id UUID,
  p_ingredients JSONB
) RETURNS VOID AS $$
BEGIN
  -- Verify recipe ownership
  IF NOT EXISTS (
    SELECT 1 FROM recipes
    WHERE id = p_recipe_id
      AND restaurant_id = p_restaurant_id
  ) THEN
    RAISE EXCEPTION 'Recipe % not found for restaurant %', p_recipe_id, p_restaurant_id;
  END IF;

  -- Delete existing ingredients
  DELETE FROM recipe_ingredients WHERE recipe_id = p_recipe_id;

  -- Insert new ingredients (if any)
  IF p_ingredients IS NOT NULL AND jsonb_array_length(p_ingredients) > 0 THEN
    INSERT INTO recipe_ingredients (
      recipe_id,
      name,
      stock_item_id,
      supplier_id,
      quantity,
      unit,
      unit_cost,
      sort_order
    )
    SELECT
      p_recipe_id,
      COALESCE(item->>'name', ''),
      (item->>'stock_item_id')::UUID,
      (item->>'supplier_id')::UUID,
      COALESCE((item->>'quantity')::NUMERIC, 0),
      COALESCE(item->>'unit', ''),
      COALESCE((item->>'unit_cost')::NUMERIC, 0),
      idx - 1  -- 0-based sort_order
    FROM jsonb_array_elements(p_ingredients) WITH ORDINALITY AS t(item, idx);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION replace_recipe_ingredients TO authenticated;

COMMENT ON FUNCTION replace_recipe_ingredients IS
  'Atomically replaces all ingredients for a recipe. '
  'Prevents orphaned recipes when INSERT fails after DELETE. '
  'p_ingredients is a JSONB array of {name, stock_item_id, supplier_id, quantity, unit, unit_cost}.';
