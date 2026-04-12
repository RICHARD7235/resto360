# M03 Commandes & Service V2 — Spec complète

**Date** : 2026-04-12
**Auteur** : Arthur (orchestrateur Claude Code)
**Validé par** : JM
**Scope** : 7 features backlog M03 — Realtime, Sons, Split addition, Annulations, Drag-and-drop KDS, Livraison/emporter, Plan de salle dynamique

---

## 1. Contexte

Le module M03 Commandes & Service a été livré en V1 le 06/04/2026. Il couvre la prise de commande, le plan de salle (12 tables hardcodées), le KDS multi-stations, les tickets de préparation, les menus/formules et l'ajout d'articles.

Un audit comparatif (Toast, Lightspeed, TouchBistro) le 06/04 a identifié 7 améliorations prioritaires. Cette spec couvre les 7 d'un coup.

### Fichiers existants impactés

| Fichier | Rôle |
|---------|------|
| `src/app/(dashboard)/commandes/page.tsx` | Page principale, floor plan, polling 15s |
| `src/app/(dashboard)/commandes/actions.ts` | Server actions (CRUD orders, tickets, stats) |
| `src/app/(dashboard)/commandes/cuisine/page.tsx` | Page KDS, polling 15s |
| `src/app/(dashboard)/commandes/nouvelle/page.tsx` | Prise de commande |
| `src/lib/preparation-tickets.ts` | Routing tickets par station |
| `src/stores/commandes.store.ts` | Zustand store (cart, selectedTable) |
| `src/components/modules/commandes/floor-plan.tsx` | Plan de salle grille CSS |
| `src/components/modules/commandes/kitchen-board.tsx` | Board KDS flat list |
| `src/components/modules/commandes/kitchen-ticket.tsx` | Ticket individuel KDS |
| `src/components/modules/commandes/order-panel.tsx` | Panel panier commande |
| `src/components/modules/commandes/order-summary.tsx` | Résumé commande sélectionnée |
| `src/components/modules/commandes/table-card.tsx` | Carte table individuelle |

---

## 2. Schéma DB (migrations)

### 2.1 Nouvelles tables

#### `restaurant_tables`

Remplace le tableau hardcodé `RESTAURANT_TABLES` dans `page.tsx`.

| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` | |
| `restaurant_id` | uuid | FK restaurants, NOT NULL | |
| `name` | text | NOT NULL | Ex: "T1", "Terrasse 3" |
| `zone` | text | | Ex: "Salle", "Terrasse", "Bar" |
| `capacity` | int | DEFAULT 4 | Nombre de couverts |
| `shape` | text | CHECK `('square','round','rectangle')`, DEFAULT `'square'` | Forme visuelle |
| `width` | int | DEFAULT 1 | Unités grille (1-3) |
| `height` | int | DEFAULT 1 | Unités grille (1-3) |
| `pos_x` | float | DEFAULT 0 | Position X sur canvas (0-100%) |
| `pos_y` | float | DEFAULT 0 | Position Y sur canvas (0-100%) |
| `is_active` | boolean | DEFAULT true | Soft delete |
| `sort_order` | int | DEFAULT 0 | |
| `created_at` | timestamptz | DEFAULT `now()` | |

RLS : `restaurant_id = get_user_restaurant_id()`

#### `order_payments`

Paiements partiels pour le split addition.

| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` | |
| `order_id` | uuid | FK orders, NOT NULL | |
| `amount` | numeric(10,2) | NOT NULL | Montant payé |
| `method` | text | CHECK `('cash','card','transfer','other')`, NOT NULL | Moyen de paiement |
| `label` | text | | Ex: "Part de Marie", "Split 1/3" |
| `paid_at` | timestamptz | DEFAULT `now()` | |
| `created_by` | uuid | FK profiles | Qui a encaissé |

RLS : via `order.restaurant_id`

#### `order_cancellations`

Historique des annulations avec raison.

| Colonne | Type | Contrainte | Description |
|---------|------|------------|-------------|
| `id` | uuid | PK, default `gen_random_uuid()` | |
| `order_id` | uuid | FK orders, nullable | Annulation commande entière |
| `order_item_id` | uuid | FK order_items, nullable | Annulation article |
| `reason` | text | NOT NULL | Raison de l'annulation |
| `cancelled_by` | uuid | FK profiles, NOT NULL | Qui a annulé |
| `cancelled_at` | timestamptz | DEFAULT `now()` | |

CHECK : au moins un des deux (`order_id`, `order_item_id`) doit être NOT NULL.
RLS : via `order.restaurant_id`

### 2.2 Modifications tables existantes

#### `orders`

```sql
ALTER TABLE orders
  ADD COLUMN order_type text CHECK (order_type IN ('dine_in','takeaway','delivery')) DEFAULT 'dine_in',
  ADD COLUMN customer_name text,
  ADD COLUMN customer_phone text,
  ADD COLUMN delivery_address text,
  ADD COLUMN paid_amount numeric(10,2) DEFAULT 0,
  ALTER COLUMN table_number DROP NOT NULL;
```

#### `preparation_tickets`

```sql
ALTER TABLE preparation_tickets
  ADD COLUMN position int DEFAULT 0;
```

### 2.3 Seed LCQF

Migration de données : créer 12 lignes dans `restaurant_tables` pour La Cabane Qui Fume :
- T1 à T12, zone "Salle", shape "square", width 1, height 1
- Positions en grille 4x3 (pos_x/pos_y calculés pour un rendu initial propre)
- capacity : 4 par défaut

---

## 3. Realtime Supabase

### 3.1 Architecture

Remplacement de **tous** les `setInterval(fetchData, 15000)` par des subscriptions Supabase Realtime.

4 canaux par restaurant :

| Canal | Table | Pages concernées | Event |
|-------|-------|------------------|-------|
| `orders-rt` | `orders` | Commandes, Floor Plan, Stats | `*` (INSERT/UPDATE/DELETE) |
| `order-items-rt` | `order_items` | Panel détail commande | `*` |
| `prep-tickets-rt` | `preparation_tickets` | KDS Cuisine | `*` |
| `reservations-rt` | `reservations` | Floor Plan | `*` |

Filtre sur chaque canal : `restaurant_id=eq.${restaurantId}` (sauf `order_items` et `preparation_tickets` qui n'ont pas de `restaurant_id` direct — on filtre côté client après refetch).

### 3.2 Hook réutilisable

Nouveau fichier `src/hooks/use-realtime.ts` :

```ts
interface RealtimeConfig {
  channel: string;
  table: string;
  filter?: string;
  onUpdate: () => void;
}

function useRealtimeSubscription(config: RealtimeConfig): void
```

- Subscribe dans `useEffect`, cleanup sur unmount
- Debounce de 100ms sur `onUpdate` pour éviter les rafales (ex: création commande = INSERT order + N INSERT order_items)
- Fallback polling 30s en cas de déconnexion WebSocket (détection via `channel.on('system', ...)`)

### 3.3 Activation Realtime

Supabase Realtime est déjà activé sur `orders`, `order_items`, `reservations` (cf CLAUDE.md). Il faut activer Realtime sur `preparation_tickets` via :

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE preparation_tickets;
```

### 3.4 Refacto pages

**`commandes/page.tsx`** : supprimer le `setInterval`, ajouter `useRealtimeSubscription` sur les 4 canaux, `fetchData` devient le callback.

**`commandes/cuisine/page.tsx`** : supprimer le `setInterval`, ajouter `useRealtimeSubscription` sur le canal `prep-tickets-rt`.

---

## 4. Sons d'alerte

### 4.1 Fichier audio

`/public/sounds/kitchen-bell.mp3` — son de cloche cuisine, ~2 secondes, format MP3.

### 4.2 Déclenchement

Intégré dans le hook `useTicketReadyNotifications` existant (`commandes/page.tsx`). Quand un ticket passe à `ready` (nouveau dans le set `currentReady`) :
1. Notification browser (déjà en place)
2. `new Audio('/sounds/kitchen-bell.mp3').play()`

### 4.3 Toggle mute

- Clé localStorage : `kds-sound-enabled` (default: `true`)
- Bouton icône volume/mute dans le header du KDS (`cuisine/page.tsx`)
- Même toggle accessible sur la page commandes principale

### 4.4 AudioContext unlock

Le browser bloque l'autoplay audio sans interaction utilisateur. Pattern de déblocage :
- Au premier clic sur la page KDS, appeler `new Audio('/sounds/kitchen-bell.mp3').play()` avec volume 0
- Stocker un flag `audioUnlocked` dans un ref pour ne le faire qu'une fois

---

## 5. Plan de salle dynamique

### 5.1 Deux modes

| Mode | Route | Rôles | Description |
|------|-------|-------|-------------|
| Service | `/commandes` | tous | Canvas read-only, tables positionnées, statuts temps réel |
| Édition | `/commandes/plan-de-salle` | owner/admin/manager | Éditeur drag-and-drop |

### 5.2 Éditeur (mode édition)

**Canvas** : `<div>` position relative, ratio 16:10, responsive. Les tables sont des éléments `position: absolute` en pourcentages (`pos_x%`, `pos_y%`).

**Interactions** :
- **Drag-and-drop** via `@dnd-kit/core` : déplacer une table → update `pos_x`/`pos_y`
- **Clic sur table** : ouvre un panel latéral d'édition (nom, zone, capacité, forme, taille)
- **Bouton "Ajouter table"** : crée une table au centre (50%, 50%) avec valeurs par défaut
- **Suppression** : soft delete (`is_active = false`) avec confirmation

**Panel d'édition table** :
- Champ `name` (text)
- Champ `zone` (select/combobox avec les zones existantes + saisie libre)
- Champ `capacity` (number, 1-20)
- Champ `shape` (3 boutons visuels : carré, rond, rectangle)
- Champ `width` x `height` (1-3 chacun, sliders ou boutons)

**Persistance** : bouton "Enregistrer" → batch `upsert` de toutes les tables modifiées. Pas de save auto.

### 5.3 Rendu des tables (composant `table-shape.tsx`)

| Shape | Rendu | CSS |
|-------|-------|-----|
| `square` | Carré coins arrondis | `border-radius: 12px`, aspect-ratio 1:1 |
| `round` | Cercle | `border-radius: 50%`, aspect-ratio 1:1 |
| `rectangle` | Rectangle | `border-radius: 12px`, aspect-ratio width:height |

Taille de base : `width * 60px` x `height * 60px` (responsive avec clamp).
Couleur de fond : palette existante du `table-card.tsx` (vert=libre, bleu=occupé, ambre=attente, orange=prêt, violet=réservé).
Contenu : numéro de table centré + capacité en petit.

### 5.4 Mode Service (canvas read-only)

Le composant `floor-plan.tsx` actuel (grille CSS) est remplacé par `floor-plan-canvas.tsx` :
- Même canvas que l'éditeur mais sans drag-and-drop
- Les tables sont cliquables (sélection → affichage commande dans le panel latéral)
- Statuts mis à jour en realtime (canal `orders-rt`)
- Badges stations sur chaque table (déjà existant dans `table-card.tsx`)

**Encart commandes emporter/livraison** : sous le canvas, un bloc dédié listant les commandes sans table (`order_type != 'dine_in'`) avec nom client, type (badge), statut, total.

### 5.5 Zones

Filtre par zone au-dessus du canvas : "Toutes" / zones distinctes tirées de la DB. Le filtre masque les tables des autres zones sur le canvas (opacity 0.2 ou hidden, selon ce qui rend le mieux visuellement).

### 5.6 Nouveaux composants

| Composant | Fichier | Rôle |
|-----------|---------|------|
| Floor Plan Canvas | `floor-plan-canvas.tsx` | Canvas mode service (read-only, positions DB) |
| Floor Plan Editor | `floor-plan-editor.tsx` | Canvas mode édition avec dnd-kit |
| Table Shape | `table-shape.tsx` | Rendu visuel d'une table (forme, taille, couleur) |
| Table Edit Panel | `table-edit-panel.tsx` | Panel latéral édition propriétés |
| Takeaway Orders Bar | `takeaway-orders-bar.tsx` | Encart commandes emporter/livraison |

### 5.7 Migration du code existant

- Supprimer le tableau `RESTAURANT_TABLES` de `page.tsx`
- Nouvelle server action `getRestaurantTables()` dans `actions.ts`
- `floor-plan.tsx` → remplacé par `floor-plan-canvas.tsx`
- `table-card.tsx` → conservé comme wrapper mais utilise `table-shape.tsx` pour le rendu

---

## 6. Annulations avec raison tracée

### 6.1 Annulation d'article

**Déclencheur** : bouton "Annuler" par article dans `order-summary.tsx`.

**Dialog** :
- Titre : "Annuler [nom article]"
- Select : raisons prédéfinies ("Rupture de stock", "Erreur de commande", "Demande client", "Autre")
- Textarea : visible si "Autre" sélectionné
- Boutons : "Confirmer l'annulation" (destructive) / "Retour"

**Actions serveur** (`cancelOrderItem(itemId, reason)`) :
1. `order_items.status → 'cancelled'`
2. INSERT `order_cancellations` (avec `order_item_id`)
3. Recalcul `orders.total` (soustraction article annulé)
4. Ticket de préparation : retirer l'item, supprimer le ticket s'il est vide
5. Re-évaluer le statut agrégé de la commande

**Permissions** : tous les rôles avec accès au module commandes.

### 6.2 Annulation de commande entière

**Déclencheur** : bouton "Annuler la commande" dans `order-summary.tsx` (visible si statut != `paid`/`cancelled`).

**Même dialog** que pour un article.

**Actions serveur** (`cancelOrder(orderId, reason)`) :
1. `orders.status → 'cancelled'`
2. INSERT `order_cancellations` (avec `order_id`, sans `order_item_id`)
3. Tous les `order_items.status → 'cancelled'`
4. Tous les tickets associés : `status → 'served'` (libérés du KDS)

**Permissions** : `owner`/`admin`/`manager` uniquement (vérification via `role_permissions`).

### 6.3 Historique annulations

Nouvelle page `/commandes/annulations` (accès owner/admin/manager) :
- Tableau : date, commande (lien), article (si applicable), raison, annulé par
- Filtres : plage de dates, type (article / commande entière)
- Pas de pagination pour le MVP (les annulations sont rares)

---

## 7. Support livraison / emporter

### 7.1 Sélecteur de type

En haut de `/commandes/nouvelle`, avant la sélection de table :

```
[Sur place]  [A emporter]  [Livraison]
```

3 boutons toggle (un seul actif). Default : "Sur place".

### 7.2 Comportement par type

| Champ | Sur place | A emporter | Livraison |
|-------|-----------|------------|-----------|
| `order_type` | `dine_in` | `takeaway` | `delivery` |
| Table | obligatoire | masqué | masqué |
| `customer_name` | optionnel | obligatoire | obligatoire |
| `customer_phone` | masqué | optionnel | obligatoire |
| `delivery_address` | masqué | masqué | obligatoire |

### 7.3 Modifications `createOrder`

- Accepte les nouveaux champs (`order_type`, `customer_name`, `customer_phone`, `delivery_address`)
- Validation : si `takeaway` → `customer_name` requis, si `delivery` → nom + téléphone + adresse requis
- `table_number` nullable

### 7.4 Affichage KDS

Les tickets emporter/livraison affichent :
- Badge type : orange "A emporter" / violet "Livraison" (à la place du numéro de table)
- Nom client en gras
- Pour livraison : adresse en petite ligne sous le nom

### 7.5 Affichage plan de salle

Encart dédié sous le canvas (composant `takeaway-orders-bar.tsx`) :
- Section "A emporter" : liste des commandes `takeaway` actives avec nom client, statut, total
- Section "Livraison" : liste des commandes `delivery` actives avec nom, adresse, statut, total
- Chaque commande cliquable → affiche le détail dans le panel latéral

### 7.6 Stats enrichies

`getOrderStats` retourne en plus :
```ts
breakdown: {
  dine_in: { count: number; revenue: number };
  takeaway: { count: number; revenue: number };
  delivery: { count: number; revenue: number };
}
```

Affichage optionnel dans les stats cards (ou tooltip sur le CA).

---

## 8. Split addition (paiement partiel mixte)

### 8.1 Accès

Bouton "Encaisser" dans `order-summary.tsx`, visible quand :
- Statut `ready` ou `served`
- `paid_amount < total` (pas encore entièrement payé)

Ouvre un dialog plein écran (optimisé tactile).

### 8.2 Interface — 3 tabs

#### Tab "Par articles"

- Liste tous les `order_items` (non annulés) avec nom, quantité, prix
- Checkbox tactile (44px) par article
- Articles déjà payés : grisés, badge "Payé"
- Sous-total sélection en bas
- Sélecteur méthode paiement : CB / Espèces / Virement / Autre
- Si espèces : champ "Montant reçu" → affichage rendu monnaie
- Bouton "Valider ce paiement"

#### Tab "Split égal"

- Sélecteur nombre de convives : 2-12 (boutons +/-)
- Affichage : `total restant / N` = montant par part
- Bouton "Payer 1 part" (crée un `order_payment` par clic)
- Compteur visuel : "3/4 parts payées"
- Sélecteur méthode paiement par part

#### Tab "Mixte"

- Phase 1 : sélection d'articles individuels → paiement (comme tab 1)
- Phase 2 : sur le solde restant, proposer split égal (comme tab 2)
- Transition automatique quand au moins un article a été payé individuellement

### 8.3 Actions serveur

**`createPayment(orderId, { amount, method, label, itemIds? })`** :
1. INSERT `order_payments`
2. UPDATE `orders.paid_amount += amount`
3. Si `itemIds` fournis : marquer ces items comme payés (nouveau champ ? ou tracking via la table `order_payments` avec une table de liaison)
4. Si `paid_amount >= total` → `orders.status = 'paid'`

**Note de design** : pour tracker quel article est payé par quel paiement, on ajoute une colonne `payment_id uuid FK order_payments` nullable sur `order_items`. Quand un article est payé via le tab "Par articles", on set son `payment_id`. Pour le split égal, les `payment_id` restent null (le paiement couvre une fraction du total, pas des articles spécifiques).

### 8.4 Modification `order_items`

```sql
ALTER TABLE order_items ADD COLUMN payment_id uuid REFERENCES order_payments(id);
```

### 8.5 Clôture

Quand `paid_amount >= total` :
- `orders.status → 'paid'` automatiquement
- Toast "Commande encaissée"
- Fermeture du dialog
- La table passe à "libre" sur le plan de salle

---

## 9. Drag-and-drop KDS

### 9.1 Dépendance

`@dnd-kit/core` + `@dnd-kit/sortable` — même lib que le plan de salle.

### 9.2 Layout Kanban

Le `kitchen-board.tsx` passe d'une flat list à 3 colonnes :

| Colonne | Statut | Couleur header |
|---------|--------|----------------|
| A faire | `pending` | Gris |
| En cours | `in_progress` | Ambre |
| Prêt | `ready` | Vert |

Chaque colonne affiche un compteur de tickets.

### 9.3 Drag-and-drop

**Intra-colonne** : réordonne les tickets. Persiste `position` via batch update.

**Inter-colonnes** : déplacer un ticket d'une colonne à l'autre = changement de statut.
- `pending → in_progress` : set `started_at`
- `in_progress → ready` : set `ready_at` + déclenche son d'alerte
- `ready → served` : libère le ticket du board (via bouton existant, pas drag — pour éviter les erreurs tactiles)

**Handle** : icône grip (6 points) en haut à gauche du ticket. Le reste du ticket reste cliquable pour les boutons de statut.

**Tri** : `ORDER BY position ASC, created_at ASC`. Les tickets non déplacés (position = 0) sont triés par ancienneté.

### 9.4 Realtime + DnD

Quand un nouveau ticket arrive via realtime :
- S'insère en bas de la colonne "A faire" (position = 0)
- Animation d'entrée (fade-in + slide)

Quand un ticket est déplacé par un autre écran :
- Le board se met à jour sans casser l'ordre local du drag en cours
- Si l'utilisateur est en train de drag, le update realtime est bufferisé et appliqué au drop

---

## 10. Lots d'implémentation

Spec structurée pour exécution parallèle via Agent Teams.

### Lot A — Infra (Hugo + Rémi)

| # | Tâche |
|---|-------|
| A1 | Migration DB : `preparation_tickets.position`, Realtime sur `preparation_tickets` |
| A2 | Hook `use-realtime.ts` avec fallback polling |
| A3 | Refacto `commandes/page.tsx` : remplacer setInterval par realtime (4 canaux) |
| A4 | Refacto `cuisine/page.tsx` : remplacer setInterval par realtime |
| A5 | Sons d'alerte : fichier audio + intégration dans `useTicketReadyNotifications` + toggle mute |

**Fichiers touchés** : `hooks/use-realtime.ts` (new), `commandes/page.tsx`, `cuisine/page.tsx`, `public/sounds/` (new)
**Pas de conflit** avec les autres lots.

### Lot B — Core (Victor + Léo)

| # | Tâche |
|---|-------|
| B1 | Migration DB : `order_payments`, `order_cancellations`, colonnes `orders` (order_type, customer_*, paid_amount), `order_items.payment_id` |
| B2 | Server actions : `cancelOrderItem`, `cancelOrder`, `createPayment` |
| B3 | UI annulations : dialog raison dans `order-summary.tsx` + page historique `/commandes/annulations` |
| B4 | UI livraison/emporter : sélecteur type dans `/commandes/nouvelle` + champs conditionnels |
| B5 | Modification `createOrder` + `getActiveOrders` pour supporter les 3 types |
| B6 | UI split addition : dialog encaissement 3 tabs |
| B7 | Stats enrichies avec breakdown par type |

**Fichiers touchés** : `actions.ts`, `order-summary.tsx`, `nouvelle/page.tsx`, `commandes.store.ts`, nouveau composant `payment-dialog.tsx`, nouvelle page `annulations/page.tsx`

### Lot C — UX (Léo + Jules)

| # | Tâche |
|---|-------|
| C1 | Migration DB : `restaurant_tables` + seed LCQF 12 tables |
| C2 | Install `@dnd-kit/core` + `@dnd-kit/sortable` |
| C3 | Composant `table-shape.tsx` (rendu forme/taille/couleur) |
| C4 | Composant `floor-plan-canvas.tsx` (mode service, positions DB) |
| C5 | Composant `floor-plan-editor.tsx` (mode édition, drag-and-drop) |
| C6 | Composant `table-edit-panel.tsx` (panel latéral propriétés) |
| C7 | Page `/commandes/plan-de-salle` (éditeur) |
| C8 | Server actions CRUD `restaurant_tables` |
| C9 | Composant `takeaway-orders-bar.tsx` (encart emporter/livraison) |
| C10 | Refacto `kitchen-board.tsx` : layout Kanban 3 colonnes + drag-and-drop |
| C11 | Intégration `floor-plan-canvas.tsx` dans `commandes/page.tsx` (remplace `floor-plan.tsx`) |

**Fichiers touchés** : 6 nouveaux composants, `kitchen-board.tsx`, `kitchen-ticket.tsx`, `commandes/page.tsx`, `actions.ts`

### Dépendances inter-lots

- Lot B (B4 livraison/emporter) et Lot C (C9 takeaway bar + C4 canvas) partagent le concept `order_type`. La migration DB (B1) doit être mergée avant que C9 ne puisse lire `order_type`.
- Lot A (realtime) est indépendant — peut être mergé en premier.
- **Ordre de merge recommandé** : A → B → C (ou A en parallèle de B, puis C après B).

---

## 11. Hors scope

- Impression tickets / addition (futur M08 Caisse)
- Tracking livreur / calcul frais livraison
- Intégration plateformes (UberEats, Deliveroo)
- Réservation en ligne publique (M02 backlog)
- Optimistic updates UI (backlog transversal)
- Archivage commandes anciennes (backlog transversal)
