# M09 — Avis & E-réputation — Design

**Date** : 2026-04-07
**Cible démo** : 2026-04-09 (LCQF)
**Statut** : validé

## Objectif
Module de suivi des avis clients et d'e-réputation pour Resto360. MVP sans API externe (Google Business prévu v2), saisie manuelle + import CSV + seeds LCQF réalistes.

## Scope MVP
- Liste des avis avec filtres (source, note, période, recherche)
- Réponse restaurateur (avec templates rapides)
- Onglet "À traiter" pour avis ≤ 2★ non répondus
- Vue d'ensemble : KPIs (moyenne, total, % réponses, évolution), distribution 1-5★, graph tendance 30/90j, top mots-clés positifs/négatifs
- Import CSV (SheetJS) + formulaire manuel
- 30 avis seed LCQF répartis sur 90 jours

## Hors scope (v2)
- Synchronisation API Google Business, TripAdvisor, TheFork, Facebook
- Notifications email/push sur avis négatif
- Réponse automatique IA
- Analyse sentiment avancée (LLM)

## Architecture données

### Table `reviews`
```sql
create table reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  source text not null check (source in ('manual','google','tripadvisor','thefork','facebook')),
  external_id text,
  external_url text,
  author_name text not null,
  author_avatar_url text,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  review_date date not null,
  response text,
  response_date timestamptz,
  responded_by uuid references profiles(id),
  status text not null default 'new' check (status in ('new','to_handle','handled','archived')),
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reviews_restaurant_date_idx on reviews(restaurant_id, review_date desc);
create index reviews_status_idx on reviews(restaurant_id, status);
```

### Règles métier (triggers)
- À l'insertion : si `rating <= 2` → `status = 'to_handle'`
- À l'update : si `response` passe de null à non-null → `status = 'handled'`, `response_date = now()`
- `updated_at` auto via trigger standard

### RLS
- Lecture/écriture limitée au `restaurant_id` du user (via `get_user_restaurant_id()`)
- Policies : select/insert/update/delete all restreintes

## Routes & composants

```
/avis                              → page.tsx avec Tabs shadcn
  ├─ tab "Vue d'ensemble" (default)
  ├─ tab "Tous les avis"
  ├─ tab "À traiter" (badge count)
  └─ tab "Import"
```

**Composants** (dans `components/reviews/`) :
- `ReviewKpiCards` — 4 cards : moyenne, total, % répondus, évolution 30j
- `RatingDistributionChart` — barres horizontales 1★-5★
- `RatingTrendChart` — recharts line chart, toggle 30/90j
- `TopKeywordsCloud` — 2 colonnes (positifs vert / négatifs rouge), taille = fréquence
- `ReviewCard` — card avec étoiles, auteur, date, source badge, commentaire, réponse, bouton "Répondre"
- `ReviewList` — grille de cards
- `ReviewFilters` — select source, range note, date range, search
- `ResponseDialog` — textarea + templates rapides FR
- `ImportReviewsDialog` — upload CSV (SheetJS, colonnes source/author/rating/comment/date)
- `NewReviewForm` — saisie manuelle (dialog)

## Analyse mots-clés (rule-based)

Fichier : `lib/reviews/keywords.ts`

Dictionnaires FR hardcodés :
- `POSITIVE_KEYWORDS` : ~25 mots (excellent, parfait, délicieux, savoureux, tendre, accueil, chaleureux, rapide, recommande, reviendrai, top, ambiance, frais, qualité…)
- `NEGATIVE_KEYWORDS` : ~20 mots (froid, fade, sec, dur, lent, attente, déçu, cher, sale, bruyant…)
- `STOP_WORDS` : liste FR standard

Fonction `extractKeywords(reviews)` :
1. Concat tous les `comment`, normalise (lowercase, sans accents)
2. Match contre listes, compte occurrences
3. Retourne `{ positive: Array<{word, count}>, negative: Array<{word, count}> }` top 10

Exécutée **côté server component** au render de `/avis`, non stockée en DB.

## Seeds LCQF (30 avis)

Répartition :
- Sources : 18 Google, 8 TripAdvisor, 3 TheFork, 1 Facebook
- Période : étalés sur 90 derniers jours
- Notes : ~60% 5★, ~25% 4★, ~8% 3★, ~5% 2★, ~2% 1★
- Commentaires FR réalistes BBQ/smokehouse (brisket, ribs, pulled pork, accueil Pascal, ambiance cabane, attente weekend, menu midi)
- ~40% déjà répondus
- Avis ≤ 2★ → status `to_handle`

## Plan d'exécution (chunks)

Après chaque chunk : `git add . && git commit -m "feat(m09): ..." && git push && npm run build`.

- **A** — Migration DB + types : table `reviews`, RLS, triggers, types Supabase régénérés
- **B** — Seeds : script `scripts/seed-reviews.ts` + 30 avis LCQF
- **C** — Data layer : `lib/reviews/queries.ts` (no-joins), `lib/reviews/keywords.ts`
- **D** — Server actions : create, update, respond, importCsv
- **E** — Hub + Vue d'ensemble : page tabs, KPIs, charts, keywords
- **F** — Liste + filtres + réponse : ReviewList, ReviewFilters, ResponseDialog
- **G** — À traiter + Import : tab alertes, ImportReviewsDialog, NewReviewForm
- **H** — Polish : types, lint, seed run, deploy preview

## Conventions
- Types stricts, pas de `any`
- Pas de joins Supabase (requêtes séparées — cf. feedback_supabase_no_joins)
- Composants tactile-first (boutons ≥ 44px)
- Labels FR, code EN
- shadcn v4 : `render` au lieu de `asChild`
