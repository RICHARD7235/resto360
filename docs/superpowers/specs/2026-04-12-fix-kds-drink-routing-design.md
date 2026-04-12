# Fix KDS Drink Routing — Spec

## Contexte

Les commandes de boissons sont envoyées à la station **Cuisine** au lieu d'être envoyées uniquement à la station **Bar**. Le problème vient d'un fallback aveugle dans `src/lib/preparation-tickets.ts` : quand un produit n'a pas de station résolue (ni `product.station_id`, ni `category.default_station_id`), le code prend la première station active par `display_order` ASC — qui est Cuisine.

**Impact :** Les cuisiniers voient des tickets boissons sur leur KDS, ce qui crée de la confusion en service.

## Solution

### 1. Migration SQL — Corriger les données

- **Ajouter la colonne `is_default BOOLEAN DEFAULT false`** sur `preparation_stations`
- Marquer la station Cuisine comme `is_default = true` pour LCQF
- **Mettre à jour `menu_categories.default_station_id`** de la catégorie "Boissons" pour pointer vers la station Bar

### 2. Code — Fallback configurable

**Fichier :** `src/lib/preparation-tickets.ts`

Modifier le fallback (lignes 83-99 et 169-184) pour :
1. Chercher la station avec `is_default = true` au lieu de la première par `display_order`
2. Si aucune station `is_default`, conserver le fallback actuel (`display_order` ASC) pour rétrocompatibilité
3. Ajouter un `console.warn` quand le fallback est utilisé pour tracer les produits mal configurés

**Avant :**
```typescript
// For unassigned items, assign to the first station (Cuisine by default)
.order("display_order", { ascending: true })
.limit(1)
.single();
```

**Après :**
```typescript
// For unassigned items, assign to the explicit default station
.eq("is_default", true)
.limit(1)
.maybeSingle();
// Fallback: first by display_order if no is_default set
```

### 3. Seed data

Vérifier que le seed LCQF configure :
- Catégorie "Boissons" → `default_station_id` = ID station Bar
- Station Cuisine → `is_default = true`

## Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `src/lib/preparation-tickets.ts` | Fallback `is_default` (2 endroits : lignes ~83-99, ~169-184) |
| Migration SQL (Supabase) | `ALTER TABLE preparation_stations ADD COLUMN is_default boolean DEFAULT false` + UPDATE données |
| Seed data (si fichier existe) | Ajouter `is_default` + `default_station_id` Boissons |

## Vérification

1. **DB** : Vérifier que `menu_categories` "Boissons" a `default_station_id` = station Bar
2. **Test manuel** : Créer une commande avec boissons → vérifier qu'elle apparaît sur le KDS Bar uniquement
3. **Test fallback** : Créer un produit sans catégorie → vérifier qu'il va vers la station `is_default`
4. **Build** : `npm run build` passe sans erreur
