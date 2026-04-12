-- Migration: Fix KDS drink routing
-- Date: 2026-04-12
-- Description: Add is_default column to preparation_stations and set Boissons category to Bar station

-- 1. Add is_default column
ALTER TABLE preparation_stations ADD COLUMN is_default boolean NOT NULL DEFAULT false;

-- 2. Mark Cuisine as the default fallback station for each restaurant
UPDATE preparation_stations SET is_default = true WHERE name = 'Cuisine';

-- 3. Set Boissons category default_station_id to Bar station
UPDATE menu_categories mc
SET default_station_id = ps.id
FROM preparation_stations ps
WHERE ps.restaurant_id = mc.restaurant_id
  AND ps.name = 'Bar'
  AND mc.name = 'Boissons';
