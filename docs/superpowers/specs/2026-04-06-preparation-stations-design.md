# Postes de preparation et tickets par poste

**Date :** 2026-04-06
**Statut :** Approuve
**Approche :** B — Tickets par poste (modele relationnel)

## Contexte

Resto360 dispose d'un KDS (Kitchen Display System) unifie ou tous les items d'une commande (nourriture et boissons) arrivent sur un seul ecran cuisine. En restauration reelle, les commandes doivent etre dispatches vers des postes de preparation distincts (cuisine, bar, grill, etc.). Chaque poste recoit uniquement les items qui le concernent.

## Decisions cles

| Decision | Choix |
|---|---|
| Postes de preparation | Flexibles, crees via admin par restaurant |
| Rattachement produit → poste | Categorie par defaut + override au niveau produit |
| Ecrans KDS | URL dediee par poste + vue superviseur |
| Tickets | Splittes par poste (un ticket par poste par commande) |
| Synchronisation | Independante par poste, commande "ready" quand tous les postes ont fini |
| Notifications serveur | Badge visuel floor plan + push navigateur optionnel |
| Module admin | Administration operationnelle (distinct de l'admin de gestion future) |

## 1. Modele de donnees

### Nouvelle table `preparation_stations`

| Colonne | Type | Description |
|---|---|---|
| id | uuid (PK) | |
| restaurant_id | uuid (FK restaurants) | Multi-tenant |
| name | text NOT NULL | Ex: "Cuisine", "Bar", "Grill" |
| display_order | int NOT NULL DEFAULT 0 | Ordre d'affichage |
| color | text NOT NULL DEFAULT '#6B7280' | Code couleur hex pour le KDS |
| is_active | boolean NOT NULL DEFAULT true | Activer/desactiver un poste |
| created_at | timestamptz NOT NULL DEFAULT now() | |

RLS : filtre par `restaurant_id` comme les autres tables.

### Nouvelle table `preparation_tickets`

| Colonne | Type | Description |
|---|---|---|
| id | uuid (PK) | |
| order_id | uuid (FK orders) NOT NULL | Commande parente |
| station_id | uuid (FK preparation_stations) NOT NULL | Poste destinataire |
| status | text NOT NULL DEFAULT 'pending' | `pending` / `in_progress` / `ready` / `served` |
| started_at | timestamptz | Quand le poste commence la preparation |
| ready_at | timestamptz | Quand le poste a fini |
| created_at | timestamptz NOT NULL DEFAULT now() | |

Contrainte unique : `(order_id, station_id)` — un seul ticket par poste par commande.

### Modifications aux tables existantes

- **`menu_categories`** : ajouter `default_station_id uuid REFERENCES preparation_stations(id) ON DELETE SET NULL`
- **`products`** : ajouter `station_id uuid REFERENCES preparation_stations(id) ON DELETE SET NULL`
- **`order_items`** : ajouter `preparation_ticket_id uuid REFERENCES preparation_tickets(id) ON DELETE SET NULL`

### Logique de resolution du poste

```
station = product.station_id ?? category.default_station_id ?? null
```

Si `null`, l'item apparait sur tous les ecrans KDS (fallback securite).

### Seed data

A la creation d'un restaurant, deux postes par defaut :
- "Cuisine" (color: "#E85D26", display_order: 1)
- "Bar" (color: "#3B82F6", display_order: 2)

## 2. Logique de split des tickets

### A la validation d'une commande

Apres l'insertion des `order_items` dans `createOrder()` :

1. Resoudre le poste de chaque item : `product.station_id ?? category.default_station_id ?? null`
2. Grouper les items par station resolue
3. Creer un `preparation_ticket` par station distincte (status: `pending`)
4. Rattacher chaque `order_item` a son `preparation_ticket_id`
5. Items sans station resolue : un `preparation_ticket` special est cree avec `station_id` du premier poste par defaut (Cuisine). Ces items apparaissent egalement sur la vue superviseur avec un badge "non assigne" pour inciter l'admin a configurer le rattachement

### Cycle de vie d'un ticket de preparation

```
pending → in_progress → ready → served
```

- **pending** : le ticket vient d'arriver au poste
- **in_progress** : premier item coche ou bouton "Commencer"
- **ready** : tous les items du ticket sont marques prets
- **served** : le serveur a recupere les items

### Agregation sur la commande globale

| Condition | Status commande |
|---|---|
| Au moins un ticket `pending`, aucun `in_progress` | `pending` |
| Au moins un ticket `in_progress` | `in_progress` |
| Tous les tickets `ready` ou `served` | `ready` |
| Tous les tickets `served` | `served` |

L'update du statut commande se fait automatiquement a chaque changement de statut d'un ticket via `updatePreparationTicketStatus()`.

### Ajout d'items en cours de commande

Extension de `addItemsToOrder()` :
- Resoudre le poste des nouveaux items
- Si un ticket existe deja pour ce poste et n'est pas `served` → rattacher au ticket existant (repasser en `in_progress` si necessaire)
- Sinon → creer un nouveau ticket pour ce poste

## 3. Ecrans KDS et routing

### Routes

| Route | Usage |
|---|---|
| `/commandes/cuisine?station={id}` | Ecran dedie a un poste (tablette fixe) |
| `/commandes/cuisine` | Vue superviseur (tous les postes, filtrable) |
| `/commandes/cuisine/setup` | Selection du poste pour tablette fixe |

### Ecran dedie par poste (`?station=xxx`)

- Affiche uniquement les `preparation_tickets` de ce poste
- Layout Kanban 3 colonnes : Nouvelles / En preparation / Pretes
- Ticket affiche : numero de table, items du poste uniquement, timer, boutons d'action
- Header avec nom et couleur du poste (barre coloree)

### Vue superviseur (sans query param)

- Onglets horizontaux : un par poste actif + "Tous"
- Onglet "Tous" : commandes completes avec badge colore par poste indiquant le statut de chaque ticket
- Cliquer sur un onglet poste → meme vue que l'ecran dedie

### Setup tablette

Page `/commandes/cuisine/setup` : selection du poste, sauvegarde en `localStorage`, redirection automatique vers `?station={id}`.

Solution transitoire : quand le module Personnel (M07) arrivera, l'affectation poste sera liee au profil utilisateur et remplacera le `localStorage`.

### Adaptation du composant `KitchenTicket`

- Accepte un `preparation_ticket` au lieu d'un `order` complet
- N'affiche que les items rattaches a ce ticket
- Les actions (Commencer / Pret / Servi) agissent sur le `preparation_ticket`

## 4. Notifications serveur et floor plan

### Badges visuels sur le floor plan

Chaque table avec commande active affiche des mini-badges colores par poste :
- Couleur du poste (definie dans `preparation_stations.color`)
- Initiale ou icone du poste + statut :
  - Gris = `pending`
  - Orange pulsant = `in_progress`
  - Vert = `ready` (items a recuperer)
  - Disparu = `served`
- Exemple : Table T3 → `[C: en cours] [B: pret]`

### Notifications push navigateur (optionnelles)

- Declenchees quand un `preparation_ticket` passe en `ready`
- Ciblent le serveur assigne a la commande (`orders.server_id`)
- Format : "Table T3 — Bar pret" avec couleur du poste
- Implementation via `Notification.requestPermission()` + API Notifications
- Configurable dans les settings restaurant : activer/desactiver, avec ou sans son

### Transport

- Polling existant (15s) detecte les changements et declenche les notifications cote client
- Compatible avec future migration vers Supabase Realtime (reportee, voir memoire projet)

## 5. Administration operationnelle

### Page de gestion des postes

Nouvelle section dans le module "Administration operationnelle" :

- Liste des postes avec drag & drop pour l'ordre d'affichage
- Creation : nom, couleur (color picker), actif/inactif
- Modification / desactivation
- Pas de suppression si des tickets non `served` y sont lies

Ce module est distinct de l'administration de gestion future (comptabilite, RH, budget — modules M07, M11, M12).

### Rattachement categorie → poste

Dans la page Carte (`/carte`), edition d'une `menu_category` :
- Nouveau champ select : "Poste de preparation par defaut" (stations actives, optionnel)

### Override produit → poste

Dans le formulaire produit (`product-form`) :
- Nouveau champ select : "Poste de preparation" (stations actives, optionnel)
- Label : "Laissez vide pour utiliser le poste de la categorie"

### Garde-fous

- Poste non supprimable si `preparation_tickets` non `served` existent
- Desactiver un poste : nouveaux items ne lui sont plus routes, tickets en cours restent visibles
- Suppression (soft) : `station_id` sur produits/categories remis a `null`

## Hors scope

- Migration vers Supabase Realtime (prevue version future)
- Affectation poste via profil utilisateur (module Personnel M07)
- Administration de gestion (comptabilite, RH, budget)
- Bug des caracteres accentues (traite separement)
