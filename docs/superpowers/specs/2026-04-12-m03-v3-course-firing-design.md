# M03 V3 — Course Firing / Envoi par service

**Date** : 2026-04-12
**Module** : M03 Commandes & Service
**Statut** : Design validé
**Auteur** : Arthur (Claude Code) — validé JM

---

## 1. Problème

Aujourd'hui, quand une commande est envoyée (ex: Table 5 — salade César + côte de bœuf + tarte tatin), **tous les items apparaissent immédiatement en cuisine** sur un seul ticket par station. Le cuisinier voit la tarte tatin en même temps que la salade. Il doit mentalement ignorer les desserts, source d'erreurs et de stress en coup de feu.

Le standard de l'industrie (Toast, Fresh KDS, Lightspeed, Zelty, L'Addition) est le modèle **Hold & Fire** : les items sont groupés par **service** (course), et seul le service courant est actif en cuisine. Le serveur contrôle le rythme depuis la salle.

## 2. Solution

Implémenter le modèle **Hold & Fire avec auto-fire optionnel** :

1. Chaque item est assigné à un **course** (0=immédiat, 1=entrées, 2=plats, 3=desserts)
2. À la création de commande, seul le **course 1** est "fired" → visible en cuisine
3. Les courses suivants sont en **HOLD** → tickets créés mais non visibles
4. Le serveur appuie sur **"Envoyer le service suivant"** depuis la page salle
5. **Auto-fire optionnel** : si le serveur n'a pas fire après un délai configurable, le course suivant part automatiquement (filet de sécurité)

### Exceptions

- **Commandes à emporter / livraison** (`takeaway` / `delivery`) : course firing désactivé. Tous les items sont en course 0 (immédiat) — tout doit être prêt en même temps.
- **Boissons** (station Bar) : course 0 — toujours immédiates, indépendamment du séquençage cuisine.

## 3. Modèle de données

### 3.1 Migration : `menu_categories.default_course`

```sql
ALTER TABLE menu_categories
  ADD COLUMN default_course int NOT NULL DEFAULT 1;

-- Seed pour LCQF
UPDATE menu_categories SET default_course = 0 WHERE name = 'Boissons';
UPDATE menu_categories SET default_course = 1 WHERE name IN ('Entrées', 'Salades');
UPDATE menu_categories SET default_course = 2 WHERE name IN ('Plats', 'Burgers', 'Menu Enfant');
UPDATE menu_categories SET default_course = 3 WHERE name = 'Desserts';
```

Convention des valeurs :
- `0` = immédiat (fired avec le premier service, pas de hold)
- `1` = entrées / premier service
- `2` = plats / deuxième service
- `3` = desserts / troisième service

### 3.2 Migration : `order_items.course_number`

```sql
ALTER TABLE order_items
  ADD COLUMN course_number int NOT NULL DEFAULT 1;
```

Assigné automatiquement à la création via `menu_categories.default_course` du produit. Pour les commandes takeaway/delivery, forcé à `0`.

### 3.3 Migration : `preparation_tickets` — refactoring

Aujourd'hui : contrainte `UNIQUE (order_id, station_id)` — 1 ticket par commande × station.

Nouveau : **1 ticket par commande × station × course**.

```sql
-- Supprimer l'ancienne contrainte
ALTER TABLE preparation_tickets
  DROP CONSTRAINT preparation_tickets_order_id_station_id_key;

-- Ajouter course_number et fired_at
ALTER TABLE preparation_tickets
  ADD COLUMN course_number int NOT NULL DEFAULT 1,
  ADD COLUMN fired_at timestamptz;  -- NULL = HOLD, non-null = FIRED

-- Nouvelle contrainte unique
ALTER TABLE preparation_tickets
  ADD CONSTRAINT preparation_tickets_order_station_course_key
    UNIQUE (order_id, station_id, course_number);
```

### 3.4 Migration : `restaurant_settings` (auto-fire)

```sql
-- Ajouter le délai auto-fire au niveau restaurant (en minutes, null = désactivé)
ALTER TABLE restaurants
  ADD COLUMN auto_fire_delay_minutes int DEFAULT NULL;
```

Quand non-null (ex: 20), un course est automatiquement fired si le précédent est "ready" depuis plus de X minutes. Géré côté client via un timer.

## 4. Logique métier

### 4.1 Création de commande (`createOrder`)

```
Pour chaque item :
  1. Résoudre course_number :
     - Si order_type = 'takeaway' ou 'delivery' → course_number = 0
     - Sinon → produit.category → menu_categories.default_course
     - Boissons (course 0) toujours immédiat

  2. Insérer order_item avec course_number

Pour chaque ticket créé :
  - course 0 ou course == min_course → fired_at = now() (FIRED)
  - course > min_course → fired_at = NULL (HOLD)
```

Le `min_course` est le plus petit course_number > 0 présent dans la commande (typiquement 1 si il y a des entrées, 2 sinon).

### 4.2 Fire du course suivant (`fireNextCourse`)

Nouvelle server action :

```typescript
export async function fireNextCourse(orderId: string): Promise<void>
```

Logique :
1. Trouver le plus petit `course_number` parmi les tickets HOLD (`fired_at IS NULL`) de cette commande
2. Mettre à jour `fired_at = now()` sur tous les tickets de ce course
3. Les tickets apparaissent en cuisine via Realtime

Restrictions RBAC : `owner`, `admin`, `manager`, `staff` (pas `cook` — c'est la salle qui fire).

### 4.3 KDS — Filtrage des tickets

Le KDS (`getPreparationTickets`) ne retourne que les tickets où `fired_at IS NOT NULL`. Les tickets HOLD sont invisibles pour la cuisine.

Exception : l'écran **expéditeur** (si implémenté plus tard) verrait les tickets HOLD en grisé.

### 4.4 Auto-fire (timer côté client)

Sur la page salle (`page.tsx`), un `useEffect` vérifie périodiquement (toutes les 60s) :

```
Pour chaque commande active :
  Si auto_fire_delay_minutes est configuré :
    Si tous les tickets du course courant sont "ready"
    ET ready_at du dernier ticket ready > auto_fire_delay_minutes :
      → appeler fireNextCourse(orderId)
```

C'est un filet de sécurité — le serveur garde le contrôle en temps normal.

### 4.5 Agrégation statut commande (mise à jour)

L'agrégation existante dans `updatePreparationTicketStatus` reste la même, mais ne considère **que les tickets FIRED** (`fired_at IS NOT NULL`) :

- Tous FIRED tickets `served` → order `"served"` (seulement si aucun ticket HOLD restant)
- Tous FIRED tickets `ready` ou `served` → order `"ready"`
- Au moins un FIRED ticket `in_progress` → order `"preparing"`

Un ticket HOLD ne compte pas dans l'agrégation — la commande n'est pas "ready" tant qu'il reste des courses non-firés.

## 5. Interface utilisateur

### 5.1 Page salle (`/commandes`) — Bouton Fire

Pour chaque commande sélectionnée qui a des tickets HOLD :

```
┌─────────────────────────────────────────┐
│  Table 5 — En cours                     │
│                                         │
│  Service 1 (Entrées)  ✅ PRÊT          │
│  Service 2 (Plats)    ⏸️  EN ATTENTE    │
│  Service 3 (Desserts) ⏸️  EN ATTENTE    │
│                                         │
│  [🔥 Envoyer les Plats]                │
│                                         │
│  Temps écoulé depuis PRÊT : 3 min      │
└─────────────────────────────────────────┘
```

Le bouton affiche le nom du prochain course à fire. Désactivé si le course courant n'est pas encore ready.

### 5.2 KDS (`/commandes/cuisine`) — Affichage

Aucun changement visuel majeur. Les tickets HOLD ne sont simplement pas retournés par la query. Quand un course est fired, les tickets apparaissent naturellement via Realtime.

Ajout mineur : un **badge course** sur chaque ticket (ex: "Service 1", "Service 2") pour que le cuisinier sache dans quel service il se situe.

### 5.3 Order Summary — Indicateur services

Le composant `OrderSummary` affiche les items groupés par course avec un indicateur visuel :

- 🟢 Course fired + tous items ready
- 🟡 Course fired + en préparation
- ⏸️ Course en HOLD (grisé)

### 5.4 Prise de commande (`/commandes/nouvelle`)

Pas de changement UX. Le course est assigné automatiquement via la catégorie du produit. Le serveur ne voit pas le course — c'est transparent.

## 6. Fichiers impactés

### Nouveaux fichiers
- `supabase/migrations/20260412_m03v3_course_firing.sql`

### Fichiers modifiés
- `src/app/(dashboard)/commandes/actions.ts` — `createOrder`, `getPreparationTickets`, `updatePreparationTicketStatus`, nouvelle action `fireNextCourse`
- `src/lib/preparation-tickets.ts` — `createPreparationTickets` (ajout course_number + fired_at)
- `src/app/(dashboard)/commandes/page.tsx` — bouton fire, indicateurs services, timer auto-fire
- `src/components/modules/commandes/order-summary.tsx` — groupement par course, indicateurs
- `src/components/modules/commandes/kitchen-ticket.tsx` — badge course
- `src/components/modules/commandes/kitchen-board.tsx` — aucun changement structurel (les tickets HOLD ne sont pas retournés)
- `src/app/(dashboard)/commandes/cuisine/page.tsx` — aucun changement (filtrage fait côté action)
- `src/stores/commandes.store.ts` — pas de changement
- `src/types/database.types.ts` — regénérer après migration

### Fichiers non impactés
- `src/app/(dashboard)/commandes/nouvelle/page.tsx` — transparent (course auto)
- `src/hooks/use-realtime.ts` — aucun changement
- `src/components/modules/commandes/floor-plan*.tsx` — aucun changement
- `src/components/modules/commandes/cancellation-dialog.tsx` — aucun changement
- `src/components/modules/commandes/payment-dialog.tsx` — aucun changement

## 7. Périmètre exclus (v4+)

- Écran expéditeur dédié (tickets HOLD grisés)
- Override manuel du course par le serveur à la prise de commande
- Temps de préparation estimé par produit pour optimiser le pacing
- Notification push au serveur quand un course est ready
- Course firing par siège (seat management type MICROS Simphony)

## 8. Estimation

- **Migration DB** : 1 migration, ~30 lignes
- **Backend** : 4 actions modifiées + 1 nouvelle (`fireNextCourse`)
- **Frontend** : 3 composants modifiés (page.tsx, order-summary, kitchen-ticket)
- **Complexité** : Moyenne — le gros du travail est dans `createPreparationTickets` et `page.tsx`
- **Estimation** : 1 lot unique, exécutable en parallèle (migration → backend → frontend)
