# RBAC — Spec

## Contexte

Resto360 utilise actuellement des whitelists hardcodées (`QHS_ADMIN_ROLES`, `ADMIN_ROLES`) pour contrôler l'accès aux modules. Deux taxonomies de rôles coexistent sans être unifiées :
- `profiles.role` : rôle web (owner/admin/manager/cook/staff) — source de vérité pour l'accès app
- `staff_members.role` : intitulé de poste libre ("Gérant", "Chef cuisinier"...) — utilisé pour le PIN terrain

Le système actuel ne permet pas de configuration flexible, chaque module implémente sa propre logique de gating, et il n'y a pas de RLS role-aware (sauf accounting_snapshots).

## Objectif

Remplacer les whitelists par un RBAC configurable : table `role_permissions` en DB avec matrice rôle × module × CRUD, helper serveur `requirePermission()`, sidebar dynamique, et UI admin pour que l'owner/admin puisse ajuster les permissions.

## Décisions

- **Deux systèmes conservés** : `profiles.role` (web) et `staff_members.role` (terrain) restent séparés
- **Granularité** : permissions CRUD par module (read/write/delete)
- **Configurable par restaurant** : l'admin peut modifier la matrice via UI
- **5 rôles canoniques** : owner, admin, manager, cook, staff

---

## 1. Schéma DB

### Table `role_permissions`

```sql
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

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view permissions of their restaurant"
  ON role_permissions FOR SELECT
  USING (restaurant_id = get_user_restaurant_id());

CREATE POLICY "Owner/admin can manage permissions"
  ON role_permissions FOR ALL
  USING (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
    )
  );
```

### Matrice par défaut (seed)

| Module | owner | admin | manager | cook | staff |
|--------|-------|-------|---------|------|-------|
| m01_dashboard | RWD | RWD | R | R | R |
| m02_reservations | RWD | RWD | RWD | - | RW |
| m03_commandes | RWD | RWD | RWD | RW | RW |
| m04_carte | RWD | RWD | RWD | R | - |
| m05_stock | RWD | RWD | RWD | R | - |
| m06_fournisseurs | RWD | RWD | RW | - | - |
| m07_personnel | RWD | RWD | RW | - | - |
| m08_caisse | RWD | RWD | R | - | - |
| m09_avis | RWD | RWD | RW | - | - |
| m10_marketing | RWD | RWD | RW | - | - |
| m11_comptabilite | RWD | RWD | R | - | - |
| m12_documents | RWD | RWD | RW | - | - |
| m13_qualite | RWD | RWD | RWD | RW | RW |

*(R=read, W=write, D=delete, -=aucun accès)*

Le seed insère cette matrice pour chaque restaurant existant. Les nouveaux restaurants la reçoivent via un trigger `AFTER INSERT ON restaurants`.

---

## 2. Helper serveur — `src/lib/rbac.ts`

### Types

```typescript
type AppModule =
  | "m01_dashboard" | "m02_reservations" | "m03_commandes" | "m04_carte"
  | "m05_stock" | "m06_fournisseurs" | "m07_personnel" | "m08_caisse"
  | "m09_avis" | "m10_marketing" | "m11_comptabilite" | "m12_documents"
  | "m13_qualite";

type PermissionAction = "read" | "write" | "delete";
```

### Fonctions

- `hasPermission(module, action): Promise<boolean>` — vérifie sans throw
- `requirePermission(module, action): Promise<{ restaurantId, role }>` — throw + redirect si refusé
- `getPermissionsForRole(restaurantId, role): Promise<Map<AppModule, {read, write, delete}>>` — charge toute la matrice d'un rôle (pour la sidebar et l'UI admin)

### Implémentation

`requirePermission` :
1. Récupère `auth.uid()` → `profiles.role` + `profiles.restaurant_id`
2. Query `role_permissions` WHERE `restaurant_id, role, module`
3. Vérifie `can_{action}` = true
4. Si false → `redirect("/tableau-de-bord")` (pas throw, redirection douce)

---

## 3. Remplacement des guards existants

| Fichier | Avant | Après |
|---------|-------|-------|
| `src/lib/qhs/auth.ts` | `requireQhsAdmin()` + whitelist `QHS_ADMIN_ROLES` | `requirePermission("m13_qualite", "write")` |
| `src/lib/supabase/qhs/mutations.ts` | Whitelist `ADMIN_ROLES` hardcodée | `requirePermission("m13_qualite", "write")` |
| `src/app/(dashboard)/comptabilite/layout.tsx` | `requireQhsAdmin()` | `requirePermission("m11_comptabilite", "read")` |
| `src/app/(dashboard)/documents/layout.tsx` | `requireQhsAdmin()` | `requirePermission("m12_documents", "read")` |
| `src/app/(dashboard)/qualite/nettoyage/admin/layout.tsx` | `requireQhsAdmin()` | `requirePermission("m13_qualite", "write")` |

Les anciens helpers (`requireQhsAdmin`, `QHS_ADMIN_ROLES`, `ADMIN_ROLES`) sont supprimés après migration.

---

## 4. Sidebar dynamique

La sidebar actuelle affiche tous les modules. Avec le RBAC :

- Au chargement du layout dashboard, appeler `getPermissionsForRole()` côté serveur
- Passer les permissions au composant sidebar via props
- Masquer les items de menu pour lesquels `can_read = false`
- Pas de hook client nécessaire — c'est du SSR dans le layout

---

## 5. UI Admin — `/admin-operationnelle/roles`

### Composants

- **Page** : tableau avec en-têtes colonnes = rôles (owner grisé/non modifiable), lignes = modules
- **Cellules** : 3 toggles (R/W/D) par case
- **Actions** : Sauvegarder (bulk upsert), Réinitialiser les valeurs par défaut
- **Accès** : owner et admin uniquement (`requirePermission` sur un module dédié ou check direct du rôle)

### Contraintes

- Owner a toujours RWD sur tout — non modifiable (hardcodé côté UI + validé côté serveur)
- Admin ne peut pas retirer ses propres permissions (protection anti-lockout)

---

## 6. Migration des RLS existantes

### accounting_snapshots

La seule RLS actuelle qui vérifie le rôle (`profiles.role IN ('owner', 'manager', 'admin')`) sera remplacée par une jointure sur `role_permissions` :

```sql
CREATE POLICY "Role-based access to accounting_snapshots"
  ON accounting_snapshots FOR SELECT
  USING (
    restaurant_id = get_user_restaurant_id()
    AND EXISTS (
      SELECT 1 FROM role_permissions rp
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE rp.restaurant_id = accounting_snapshots.restaurant_id
        AND rp.role = p.role
        AND rp.module = 'm11_comptabilite'
        AND rp.can_read = true
    )
  );
```

### Autres tables

Les RLS existantes restent en `get_user_restaurant_id()` (tenant-only). Le contrôle RBAC se fait côté server actions et layouts. Ajouter du role-check dans les RLS est possible à terme mais pas nécessaire pour cette itération.

---

## Vérification

1. **Migration SQL** : appliquer sur Supabase, vérifier seed avec `SELECT * FROM role_permissions`
2. **Helpers** : tester `requirePermission` avec chaque rôle sur chaque module
3. **Guards** : vérifier que les layouts redirigent correctement selon le rôle
4. **Sidebar** : se connecter avec cook → ne voir que M01/M03/M04/M05/M13
5. **UI Admin** : modifier une permission, recharger, vérifier que le changement prend effet
6. **Build** : `npm run build` passe
