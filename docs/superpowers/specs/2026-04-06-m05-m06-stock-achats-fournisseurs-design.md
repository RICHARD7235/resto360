# M06 Fournisseurs + M05 Stock & Achats — Design Spec

**Date :** 2026-04-06
**Modules :** M06 (Fournisseurs), M05 (Stock & Achats)
**Ordre de dev :** M06 d'abord (fondation), puis M05
**Client pilote :** La Cabane Qui Fume (Pascal GIRAULT)

---

## Contexte & Décisions

- **Approche retenue :** Deux modules séparés mais liés par FK. M06 = base fournisseurs/catalogues, M05 = stock + achats qui consomme M06.
- **Niveau de stock :** Hybride — mode `ingredient` (déduction auto via fiches techniques) pour les articles coûteux (viandes, poissons), mode `lot` (inventaire périodique) pour le reste (condiments, huiles). Scalable vers full ingrédient.
- **Fournisseurs :** 5-10+ avec catalogues/tarifs négociés, comparaison de prix.
- **Bons de commande :** Semi-automatique — suggestions basées sur stock bas + consommation récente, validation manuelle par Pascal avant envoi.
- **Import inventaire :** Upload Excel/CSV avec preview éditable et rapprochement automatique.

---

## M06 — Fournisseurs

### Modèle de données

```sql
CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  name text NOT NULL,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text, -- conditions livraison, jours de passage
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE supplier_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  reference text, -- code article fournisseur
  label text NOT NULL, -- "Entrecôte Black Angus 300g"
  unit text NOT NULL CHECK (unit IN ('kg', 'L', 'piece', 'pack')),
  unit_price numeric NOT NULL,
  currency text DEFAULT 'EUR',
  category text CHECK (category IN ('viandes', 'poissons', 'légumes', 'produits_laitiers', 'boissons', 'épicerie', 'autre')),
  is_available boolean DEFAULT true,
  last_price_update timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### RLS

```sql
-- suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_restaurant" ON suppliers
  USING (restaurant_id = get_user_restaurant_id());

-- supplier_catalog_items (via supplier)
ALTER TABLE supplier_catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog_items_restaurant" ON supplier_catalog_items
  USING (supplier_id IN (SELECT id FROM suppliers WHERE restaurant_id = get_user_restaurant_id()));
```

### Pages & UI

#### `/fournisseurs` — Liste fournisseurs
- Cards ou tableau avec : nom, contact, téléphone, nombre d'articles catalogue
- Filtres : actif/inactif, recherche par nom
- Bouton "Nouveau fournisseur" → dialog création
- Stats header : total fournisseurs, total articles catalogue

#### `/fournisseurs/[id]` — Fiche fournisseur
- Section infos : nom, contact, téléphone, email, adresse, notes
- Section catalogue : tableau des articles (label, référence, unité, prix, disponibilité)
- Bouton "Ajouter un article" → dialog
- Bouton "Nouveau bon de commande" → redirige vers `/stock/commande/nouvelle?supplier=<id>`
- Actions : éditer infos, désactiver fournisseur

#### Dialogs
- **Création/édition fournisseur** : nom*, contact, phone, email, adresse, notes
- **Création/édition article catalogue** : label*, référence, unité*, prix*, catégorie, disponible

### Server Actions

```
getSuppliers(filters?) → suppliers[]
getSupplier(id) → supplier + catalog_items[]
createSupplier(data) → supplier
updateSupplier(id, data) → supplier
toggleSupplierActive(id) → supplier
createCatalogItem(supplierId, data) → catalog_item
updateCatalogItem(id, data) → catalog_item
deleteCatalogItem(id) → void
```

---

## M05 — Stock & Achats

### Modèle de données

```sql
CREATE TABLE stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  name text NOT NULL,
  category text CHECK (category IN ('viandes', 'poissons', 'légumes', 'produits_laitiers', 'boissons', 'épicerie', 'autre')),
  unit text NOT NULL CHECK (unit IN ('kg', 'g', 'L', 'cl', 'piece', 'pack')),
  current_quantity numeric NOT NULL DEFAULT 0,
  alert_threshold numeric NOT NULL DEFAULT 0,
  optimal_quantity numeric NOT NULL DEFAULT 0,
  tracking_mode text NOT NULL DEFAULT 'lot' CHECK (tracking_mode IN ('ingredient', 'lot')),
  unit_cost numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid NOT NULL REFERENCES stock_items(id),
  type text NOT NULL CHECK (type IN ('purchase', 'consumption', 'waste', 'adjustment', 'return', 'inventory')),
  quantity numeric NOT NULL, -- positif = entrée, négatif = sortie
  unit_cost numeric,
  reference_type text CHECK (reference_type IN ('order', 'purchase_order', 'manual', 'inventory')),
  reference_id uuid,
  batch_id uuid, -- regroupe les mouvements d'un même inventaire/import
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partially_received', 'received', 'cancelled')),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date date,
  total_ht numeric DEFAULT 0,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  stock_item_id uuid NOT NULL REFERENCES stock_items(id),
  catalog_item_id uuid REFERENCES supplier_catalog_items(id),
  quantity_ordered numeric NOT NULL,
  quantity_received numeric DEFAULT 0,
  unit_price numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);
```

### Enrichissement M04 — recipe_ingredients

```sql
-- Ajout de colonnes à la table recipe_ingredients existante
ALTER TABLE recipe_ingredients ADD COLUMN stock_item_id uuid REFERENCES stock_items(id);
ALTER TABLE recipe_ingredients ADD COLUMN unit text CHECK (unit IN ('kg', 'g', 'L', 'cl', 'piece'));
```

### RLS

```sql
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_items_restaurant" ON stock_items
  USING (restaurant_id = get_user_restaurant_id());

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_movements_restaurant" ON stock_movements
  USING (stock_item_id IN (SELECT id FROM stock_items WHERE restaurant_id = get_user_restaurant_id()));

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase_orders_restaurant" ON purchase_orders
  USING (restaurant_id = get_user_restaurant_id());

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase_order_items_restaurant" ON purchase_order_items
  USING (purchase_order_id IN (SELECT id FROM purchase_orders WHERE restaurant_id = get_user_restaurant_id()));
```

### Pages & UI

#### `/stock` — Vue principale à 3 onglets

**Onglet Inventaire (défaut) :**
- Tableau des articles : nom, catégorie, quantité actuelle, unité, seuil, statut (badge ok/bas/critique), mode de suivi
- Filtres : catégorie, statut stock (ok/bas/critique), mode de suivi (ingredient/lot), recherche
- Stats header : total articles, articles en alerte, valeur totale du stock
- Boutons : "Nouvel article", "Importer un inventaire", "Télécharger le modèle"

**Onglet Mouvements :**
- Historique chronologique : date, article, type (badge coloré), quantité, coût, référence, notes, auteur
- Filtres : type de mouvement, article, période
- Bouton "Mouvement manuel" → dialog (article, type, quantité, notes)

**Onglet Achats :**
- Liste des bons de commande : numéro, fournisseur, date, statut (badge), total HT
- Filtres : statut, fournisseur, période
- Bouton "Nouveau bon de commande"

#### `/stock/inventaire` — Saisie d'inventaire
- Tableau éditable : article, quantité système, quantité comptée (input), écart (calculé), unité
- Filtres par catégorie pour saisir section par section
- Bouton "Valider l'inventaire" → génère les mouvements `inventory` avec `batch_id` commun

#### `/stock/commande/nouvelle` — Création bon de commande
- Sélection fournisseur (dropdown ou pré-rempli via `?supplier=<id>`)
- Tableau articles :
  - **Lignes suggérées** (auto) : articles dont `current_quantity < alert_threshold`, quantité = `optimal_quantity - current_quantity`, prix depuis catalogue fournisseur
  - **Ajout manuel** : search parmi stock_items, renseigner quantité
  - Chaque ligne : article, quantité, prix unitaire (depuis catalogue), total ligne
- Total HT en bas
- Actions : "Enregistrer brouillon", "Envoyer" (passe en `sent`)
- Date de livraison prévue (optionnel)

#### `/stock/commande/[id]` — Détail bon de commande
- Infos : fournisseur, date, statut, total HT, notes
- Tableau lignes : article, commandé, reçu, prix, total
- **Mode réception** : inputs quantité reçue par ligne
  - Bouton "Valider réception" → crée mouvements `purchase`, met à jour `current_quantity` et `unit_cost`
  - Si toutes lignes reçues complètes → statut `received`
  - Sinon → statut `partially_received`
- Actions : annuler (si draft/sent)

### Import Excel / CSV pour inventaire

#### Flux d'import (dialog multi-étapes)

**Étape 1 — Upload :**
- Drag & drop ou sélection fichier (.xlsx, .csv)
- Parsing côté client via SheetJS (xlsx)

**Étape 2 — Mapping colonnes :**
- Détection automatique des colonnes (nom, quantité comptée, unité)
- Dropdowns pour réassigner si détection incorrecte

**Étape 3 — Preview éditable :**
- Tableau avec toutes les lignes parsées :
  - **Article stock** : match automatique fuzzy avec `stock_items` existants, dropdown pour corriger
  - **Quantité comptée** : éditable
  - **Quantité système** : valeur actuelle en DB
  - **Écart** : différence, surligné rouge si > 10%
  - **Action** : `mettre à jour` | `créer nouveau` | `ignorer`
- Lignes non reconnues → "créer nouveau stock_item" avec catégorie/unité à remplir

**Étape 4 — Validation :**
- Résumé : X articles mis à jour, Y créés, Z ignorés
- Bouton confirmer → server action

#### Template téléchargeable
- Bouton "Télécharger le modèle" sur la page inventaire
- Génère un .xlsx pré-rempli avec stock_items existants (nom, unité, quantité actuelle, colonne vide "quantité comptée")
- Pascal fait l'inventaire physique sur ce fichier, puis le ré-importe

#### Dépendance technique
- **SheetJS (xlsx)** — parsing côté client
- Preview/édition = React state côté client
- Seule la validation finale → server action

### Flux automatisés

#### Déduction stock à la commande (mode `ingredient`)

```
Commande envoyée en cuisine (status → sent)
  → pour chaque order_item
    → lookup recipe via product_id → recipes
      → pour chaque recipe_ingredient WHERE stock_item_id IS NOT NULL
        → créer stock_movement (type: consumption, quantity: -ingredient.quantity * order_item.quantity)
        → UPDATE stock_items SET current_quantity = current_quantity - consumed
```

- Déclenché dans la server action `createOrder` / `addItemsToOrder` existante
- Les articles en mode `lot` sont ignorés (pas de stock_item_id dans recipe_ingredients)
- Si un article passe sous `alert_threshold` après déduction → il apparaît dans le dashboard M01

#### Suggestion bon de commande

```
stock_items WHERE current_quantity < alert_threshold AND is_active = true
  → pour chaque article, trouver le supplier_catalog_item le moins cher
  → grouper par supplier
  → quantité suggérée = optimal_quantity - current_quantity
  → pré-remplir le formulaire de bon de commande
```

#### Réception marchandises

```
Saisie quantity_received par ligne de purchase_order_items
  → créer stock_movement (type: purchase, quantity: +received, unit_cost: ligne.unit_price)
  → UPDATE stock_items SET current_quantity += received, unit_cost = ligne.unit_price
  → si toutes lignes complètes → purchase_order.status = 'received'
  → sinon → purchase_order.status = 'partially_received'
```

### Server Actions

```
-- Stock Items
getStockItems(filters?) → stock_items[]
getStockItem(id) → stock_item + recent_movements
createStockItem(data) → stock_item
updateStockItem(id, data) → stock_item
getStockAlerts() → stock_items[] (current_quantity < alert_threshold)
getStockStats() → { total, alerts_count, total_value }

-- Movements
getStockMovements(filters?) → stock_movements[]
createManualMovement(data) → stock_movement (+ update current_quantity)
processInventory(lines[]) → stock_movements[] (batch with batch_id)

-- Purchase Orders
getPurchaseOrders(filters?) → purchase_orders[]
getPurchaseOrder(id) → purchase_order + items + supplier
createPurchaseOrder(supplierId, items[]) → purchase_order
updatePurchaseOrder(id, data) → purchase_order
sendPurchaseOrder(id) → purchase_order (status → sent)
cancelPurchaseOrder(id) → purchase_order (status → cancelled)
receivePurchaseOrder(id, receivedItems[]) → purchase_order (+ stock_movements + stock updates)
getSuggestedPurchaseItems(supplierId?) → suggested_items[]

-- Import
parseInventoryFile(file) → parsed_lines[] (client-side)
matchStockItems(parsed_lines[]) → matched_lines[] (server-side fuzzy match)
submitInventoryImport(validated_lines[]) → stock_movements[]
generateInventoryTemplate() → xlsx blob
```

### Intégration Dashboard M01

- Alerte stock pointe vers les vrais `stock_items` avec `current_quantity < alert_threshold`
- KPI additionnel possible : "Coût matière moyen" basé sur les mouvements `consumption`

### Intégration M04 Carte & Recettes

- `recipe_ingredients` enrichi avec `stock_item_id` + `unit`
- Le coût matière recette = `SUM(recipe_ingredient.quantity * stock_item.unit_cost)` (prix réel d'achat)
- Dans la fiche recette M04, un select optionnel "Lier à un article de stock" apparaît à côté de chaque ingrédient

---

## Dépendances techniques

| Dépendance | Usage | Déjà installée ? |
|------------|-------|-------------------|
| SheetJS (xlsx) | Parsing Excel/CSV côté client | Non — à ajouter |
| Fuse.js (optionnel) | Fuzzy matching noms articles pour import | Non — à évaluer vs match simple |

---

## Hors scope (scalabilité future)

- Table `price_history` pour historique des prix fournisseurs
- Import CSV de catalogue fournisseur
- Jours de livraison structurés (actuellement dans `notes`)
- Multi-établissement (partage catalogue fournisseurs)
- Export PDF des bons de commande
- Notifications push quand stock critique
