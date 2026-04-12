-- Migration: RBAC — role_permissions table
-- Date: 2026-04-12

-- 1. Create role_permissions table
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'cook', 'staff')),
  module text NOT NULL CHECK (module IN (
    'm01_dashboard', 'm02_reservations', 'm03_commandes', 'm04_carte',
    'm05_stock', 'm06_fournisseurs', 'm07_personnel', 'm08_caisse',
    'm09_avis', 'm10_marketing', 'm11_comptabilite', 'm12_documents', 'm13_qualite'
  )),
  can_read boolean NOT NULL DEFAULT false,
  can_write boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, role, module)
);

-- 2. RLS
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view permissions of their restaurant"
  ON role_permissions FOR SELECT
  USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Owner/admin can insert permissions"
  ON role_permissions FOR INSERT
  WITH CHECK (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owner/admin can update permissions"
  ON role_permissions FOR UPDATE
  USING (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owner/admin can delete permissions"
  ON role_permissions FOR DELETE
  USING (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- 3. Indexes
CREATE INDEX idx_role_permissions_restaurant ON role_permissions(restaurant_id);
CREATE INDEX idx_role_permissions_lookup ON role_permissions(restaurant_id, role, module);

-- 4. Function to seed default permissions for a restaurant
CREATE OR REPLACE FUNCTION seed_default_permissions(p_restaurant_id uuid)
RETURNS void AS $$
DECLARE
  roles text[] := ARRAY['owner', 'admin', 'manager', 'cook', 'staff'];
  modules text[] := ARRAY[
    'm01_dashboard', 'm02_reservations', 'm03_commandes', 'm04_carte',
    'm05_stock', 'm06_fournisseurs', 'm07_personnel', 'm08_caisse',
    'm09_avis', 'm10_marketing', 'm11_comptabilite', 'm12_documents', 'm13_qualite'
  ];
  r text;
  m text;
  v_read boolean;
  v_write boolean;
  v_delete boolean;
BEGIN
  FOREACH r IN ARRAY roles LOOP
    FOREACH m IN ARRAY modules LOOP
      CASE
        WHEN r IN ('owner', 'admin') THEN
          v_read := true; v_write := true; v_delete := true;
        WHEN r = 'manager' THEN
          CASE m
            WHEN 'm01_dashboard' THEN v_read := true; v_write := false; v_delete := false;
            WHEN 'm08_caisse' THEN v_read := true; v_write := false; v_delete := false;
            WHEN 'm11_comptabilite' THEN v_read := true; v_write := false; v_delete := false;
            ELSE v_read := true; v_write := true; v_delete := true;
          END CASE;
        WHEN r = 'cook' THEN
          CASE m
            WHEN 'm03_commandes' THEN v_read := true; v_write := true; v_delete := false;
            WHEN 'm04_carte' THEN v_read := true; v_write := false; v_delete := false;
            WHEN 'm05_stock' THEN v_read := true; v_write := false; v_delete := false;
            WHEN 'm13_qualite' THEN v_read := true; v_write := true; v_delete := false;
            WHEN 'm01_dashboard' THEN v_read := true; v_write := false; v_delete := false;
            ELSE v_read := false; v_write := false; v_delete := false;
          END CASE;
        WHEN r = 'staff' THEN
          CASE m
            WHEN 'm01_dashboard' THEN v_read := true; v_write := false; v_delete := false;
            WHEN 'm02_reservations' THEN v_read := true; v_write := true; v_delete := false;
            WHEN 'm03_commandes' THEN v_read := true; v_write := true; v_delete := false;
            WHEN 'm13_qualite' THEN v_read := true; v_write := true; v_delete := false;
            ELSE v_read := false; v_write := false; v_delete := false;
          END CASE;
      END CASE;

      INSERT INTO role_permissions (restaurant_id, role, module, can_read, can_write, can_delete)
      VALUES (p_restaurant_id, r, m, v_read, v_write, v_delete)
      ON CONFLICT (restaurant_id, role, module) DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Seed for existing restaurants
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM restaurants LOOP
    PERFORM seed_default_permissions(r.id);
  END LOOP;
END $$;

-- 6. Trigger for new restaurants
CREATE OR REPLACE FUNCTION trigger_seed_permissions()
RETURNS trigger AS $$
BEGIN
  PERFORM seed_default_permissions(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_restaurant_created_seed_permissions
  AFTER INSERT ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_seed_permissions();
