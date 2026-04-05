# Resto 360 — Instructions projet

## Contexte
Plateforme modulaire web full stack pour restaurateurs français.
Client pilote : **La Cabane Qui Fume** (BBQ/Smokehouse, Saint-Saturnin, 72).
Commanditaire : JMR Digital.

## Stack technique
- **Frontend** : Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, shadcn/ui
- **State** : Zustand (stores par module)
- **Backend** : Supabase (PostgreSQL, Auth, Storage, RLS, Edge Functions, Realtime)
- **Client BDD** : Supabase JS v2 + types générés — **pas de Prisma**
- **Déploiement** : Vercel (preview par PR, production sur main)
- **Repo** : GitHub (RICHARD7235/Resto360)

## Supabase
- Projet : `Resto360-v2` (ref: `vymwkwziytcetjlvtbcc`, région: eu-west-3)
- Multi-tenant via `restaurant_id` + RLS avec `get_user_restaurant_id()`
- Realtime activé sur : reservations, orders, order_items

## Conventions
- **Langue UI** : français (routes, labels, commentaires)
- **Langue code** : anglais (variables, fonctions, composants)
- **Commits** : conventionnels (`feat(module): ...`, `fix(module): ...`)
- **Types** : TypeScript strict, zéro `any`
- **RLS** : obligatoire sur chaque table avant production
- **Tactile first** : boutons min 44×44px, viewport tablette prioritaire
- **Tests** : vitest + testing-library (composants), Playwright (E2E)

## Architecture routes
```
(auth)/           → connexion, inscription
(dashboard)/      → back-office avec sidebar
  tableau-de-bord/
  reservations/
  commandes/
  carte/
  stock/
  fournisseurs/
  personnel/
  caisse/
  avis/
  marketing/
  comptabilite/
  documents/
(public)/         → pages client (réservation en ligne)
```

## Modules (ordre de développement)
1. M01 Tableau de bord ← EN COURS
2. M02 Réservations
3. M03 Commandes & Service
4. M04 Carte & Recettes
5. M05 Stock & Achats
6. M06 Fournisseurs
7. M07 Personnel & Planning
8. M08 Caisse & Facturation
9. M09 Avis & E-réputation
10. M10 Marketing & Réseaux
11. M11 Comptabilité & Reporting
12. M12 Documents & Conformité

## Charte graphique
- Primary : #E85D26 (orange fumé)
- Secondary : #2D3436 (gris anthracite)
- Background : #F8FAFC
- Success : #27AE60 / Warning : #F39C12 / Danger : #E74C3C
- Typo titres : Inter 600-700
- Typo corps : Inter 400-500

@AGENTS.md
