# M08 — Caisse & Facturation (Hub Financier)

**Date** : 2026-04-06
**Module** : M08
**Statut** : Design validé, prêt pour implémentation

## Contexte

La Cabane Qui Fume (LCQF) utilise une caisse **SPIN MANF** de PI Electronique, certifiée NF525 V2.3 (Catégorie B, certificat 525/0002-5 du 27/01/2025). Ce système est fermé : aucune API publique, aucune intégration HubRise/Chift, aucun export documenté.

**Resto360 ne remplace pas la caisse** — SPIN MANF reste l'outil d'encaissement légal (NF525). M08 est le **centre de consolidation financière** qui agrège les données de la caisse et des autres modules pour offrir une vision complète de la santé financière du restaurant.

### Stratégie d'intégration

- **Phase 1 (demo 9 avril)** : import manuel (saisie Z de caisse + upload XLS/CSV relevés bancaires)
- **Phase 2 (post-demo)** : investigation export automatique avec PI Electronique (back-office Spin, base SQL locale, protocole SpinChef)

## Architecture

```
┌─────────────┐     ┌──────────────────────────────────────┐
│  SPIN MANF  │────>│  M08 — Caisse & Facturation          │
│  (NF525)    │ XLS │                                      │
│  encaisse   │ CSV │  - Import Z de caisse                │
└─────────────┘ man.│  - Import relevés bancaires          │
                    │  - Rapprochement CB/espèces           │
┌─────────────┐     │  - Ventilation TVA (5.5/10/20%)      │
│  Banque     │────>│  - Trésorerie catégorisée            │
│  (CSV)      │     │  - Dashboard financier               │
└─────────────┘     │  - Historique & export FEC            │
                    │                                      │
┌─────────────┐     │  Croisements :                       │
│  M03-M07    │────>│  - M03 Commandes (CA temps réel)     │
│  (interne)  │     │  - M05 Stock (achats fournisseurs)   │
└─────────────┘     │  - M06 Fournisseurs (labels)         │
                    │  - M07 Personnel (acomptes salaire)  │
                    └──────────────────────────────────────┘
```

## Schéma de données

### Table `cash_register_closings` (Z de caisse)

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK, gen_random_uuid() | |
| restaurant_id | uuid | FK restaurants, NOT NULL | Multi-tenant |
| closing_date | date | NOT NULL | Date du Z |
| total_ttc | numeric(10,2) | NOT NULL | CA TTC du jour |
| total_ht | numeric(10,2) | NOT NULL | CA HT calculé |
| total_cb | numeric(10,2) | DEFAULT 0 | Encaissements CB |
| total_cash | numeric(10,2) | DEFAULT 0 | Encaissements espèces |
| total_check | numeric(10,2) | DEFAULT 0 | Chèques |
| total_ticket_resto | numeric(10,2) | DEFAULT 0 | Tickets restaurant |
| total_other | numeric(10,2) | DEFAULT 0 | Autres modes |
| cover_count | integer | DEFAULT 0 | Nombre de couverts |
| ticket_count | integer | DEFAULT 0 | Nombre de tickets |
| vat_5_5 | numeric(10,2) | DEFAULT 0 | TVA collectée 5.5% |
| vat_10 | numeric(10,2) | DEFAULT 0 | TVA collectée 10% |
| vat_20 | numeric(10,2) | DEFAULT 0 | TVA collectée 20% |
| notes | text | | Commentaires libres |
| extra_data | jsonb | DEFAULT '{}' | Champs extensibles (remises, offerts, annulations, pourboires) |
| source | text | CHECK ('manual', 'import') | Origine de la saisie |
| created_at | timestamptz | DEFAULT now() | |
| created_by | uuid | FK profiles | Qui a saisi |

**Contrainte UNIQUE** : `(restaurant_id, closing_date)` — 1 seul Z par jour par restaurant.

### Table `bank_statements` (Relevés bancaires)

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK, gen_random_uuid() | |
| restaurant_id | uuid | FK restaurants, NOT NULL | |
| bank_name | text | | Nom banque (détecté ou saisi) |
| account_label | text | | Libellé du compte |
| statement_date | date | NOT NULL | Date du relevé |
| file_name | text | | Nom fichier importé |
| imported_at | timestamptz | DEFAULT now() | |
| imported_by | uuid | FK profiles | |

### Table `bank_transactions` (Lignes de relevé)

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK, gen_random_uuid() | |
| statement_id | uuid | FK bank_statements, NOT NULL | |
| restaurant_id | uuid | FK restaurants, NOT NULL | |
| transaction_date | date | NOT NULL | Date opération |
| value_date | date | | Date de valeur |
| label | text | NOT NULL | Libellé bancaire |
| amount | numeric(10,2) | NOT NULL | Montant (+crédits / -débits) |
| category | text | DEFAULT 'other' | Catégorie (encaissement, fournisseur, salaire, charge, autre) |
| is_reconciled | boolean | DEFAULT false | Rapproché ? |
| reconciled_with | uuid | | FK vers closing ou treasury_entry |
| reconciled_at | timestamptz | | |

### Table `treasury_entries` (Flux de trésorerie)

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK, gen_random_uuid() | |
| restaurant_id | uuid | FK restaurants, NOT NULL | |
| entry_date | date | NOT NULL | |
| type | text | CHECK ('income', 'expense'), NOT NULL | |
| category | text | CHECK ('sales', 'supplier', 'salary', 'tax', 'rent', 'insurance', 'equipment', 'investment', 'maintenance', 'other'), NOT NULL | |
| label | text | NOT NULL | Description |
| amount | numeric(10,2) | NOT NULL | Montant (toujours positif) |
| source_module | text | | 'M05_stock', 'M06_supplier', 'M07_personnel', 'M08_closing', null |
| source_id | uuid | | ID de l'entité source |
| created_at | timestamptz | DEFAULT now() | |

**Catégories trésorerie** :
- `sales` — Encaissements (depuis Z de caisse)
- `supplier` — Achats fournisseurs alimentaires (depuis M05/M06)
- `salary` — Salaires et acomptes (depuis M07)
- `tax` — Impôts, cotisations
- `rent` — Loyer
- `insurance` — Assurances
- `equipment` — Petit matériel (vaisselle, ustensiles, linge)
- `investment` — Immobilisations (mobilier, gros équipement, travaux)
- `maintenance` — Entretien, réparations
- `other` — Divers

### Table `vat_periods` (Périodes TVA)

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | uuid | PK, gen_random_uuid() | |
| restaurant_id | uuid | FK restaurants, NOT NULL | |
| period_start | date | NOT NULL | Début période |
| period_end | date | NOT NULL | Fin période |
| vat_5_5_collected | numeric(10,2) | DEFAULT 0 | TVA 5.5% collectée |
| vat_10_collected | numeric(10,2) | DEFAULT 0 | TVA 10% collectée |
| vat_20_collected | numeric(10,2) | DEFAULT 0 | TVA 20% collectée |
| vat_deductible | numeric(10,2) | DEFAULT 0 | TVA déductible (achats) |
| vat_due | numeric(10,2) | DEFAULT 0 | TVA nette à payer |
| status | text | CHECK ('draft', 'validated', 'declared'), DEFAULT 'draft' | |
| declared_at | timestamptz | | Date déclaration |
| notes | text | | |

**Contrainte UNIQUE** : `(restaurant_id, period_start, period_end)`.

### RLS (Row Level Security)

Toutes les tables suivent le pattern existant :
- `SELECT` : `restaurant_id = get_user_restaurant_id()`
- `INSERT` : `restaurant_id = get_user_restaurant_id()`
- `UPDATE` : `restaurant_id = get_user_restaurant_id()`
- `DELETE` : `restaurant_id = get_user_restaurant_id()`

## Écrans & UI

### Navigation

Route : `/caisse` avec 6 onglets via Tabs (même pattern que M05 Stock).

### Onglet 1 — Dashboard financier (tab par défaut)

- **4 KPI cards** : CA du jour, CA du mois, marge estimée (CA - achats M05/M06), solde trésorerie
- **Graphique barres Recharts** : CA 30 derniers jours + ligne de tendance
- **Donut chart** : répartition modes de paiement du mois (CB / espèces / chèques / tickets resto)
- **Alertes** : Z manquants, écarts rapprochement non résolus, TVA à déclarer

### Onglet 2 — Z de caisse

- **Saisie manuelle** (Dialog) : date, total TTC, ventilation paiements, couverts, tickets, TVA par taux, notes. Validation : somme modes de paiement = total TTC.
- **Import XLS/CSV** : upload → parser → preview tableau → validation. Réutilise le pattern d'import de M05 (xlsx).
- **Liste** : tableau des Z triés par date desc. Indicateur de rapprochement (badge vert/orange/rouge).

### Onglet 3 — Rapprochement bancaire

- **Import relevé CSV** : upload → parser générique (détection auto colonnes date/libellé/montant) → preview → import.
- **Écran rapprochement 2 colonnes** :
  - Gauche : transactions bancaires non rapprochées
  - Droite : Z de caisse / entrées trésorerie non rapprochées
  - Clic gauche + clic droite → match proposé → bouton "Rapprocher"
- **Auto-match** : si date ±1j et montant CB correspond → suggestion automatique.
- **Indicateurs** : nb lignes rapprochées / non rapprochées, écart total.

### Onglet 4 — TVA

- **Période courante** : TVA collectée par taux (5.5%, 10%, 20%), TVA déductible (depuis M05/M06), TVA nette à payer.
- **Historique** : tableau des périodes passées avec statut (brouillon / validé / déclaré).
- **Actions** : valider une période, marquer comme déclarée.

### Onglet 5 — Trésorerie

- **Tableau des flux** : entrées/sorties filtrable par catégorie et période. Catégories avec icônes distinctes. Badge module source (M05, M07, etc.) pour les entrées auto-alimentées.
- **Saisie manuelle** : formulaire "Nouvelle dépense/recette" avec select catégorie (incluant equipment, investment, maintenance).
- **Graphique line chart** : évolution solde sur 3/6/12 mois.
- **Résumé mensuel** : card total entrées, total sorties, solde net.

### Onglet 6 — Historique & Export

- **Journal** : liste chronologique de toutes les écritures, filtrable par type/période/catégorie.
- **Export FEC** : fichier .txt tab-separated, encodage ISO 8859-15, 18 colonnes normalisées (JournalCode, EcritureDate, CompteNum, Debit, Credit, etc.).
- **Export CSV** : export générique pour Excel.
- **Filtre par période** avant export.

## Flux de données

### Import Z de caisse

1. Saisie manuelle ou upload XLS/CSV
2. Parser (réutilise xlsx de M05)
3. Preview tableau → validation utilisateur
4. `INSERT cash_register_closings`
5. Création automatique `treasury_entries` (type: income, category: sales, source_module: M08_closing)
6. Recalcul `vat_periods` du mois concerné

### Import relevé bancaire

1. Upload CSV
2. Parser générique (détection auto colonnes)
3. Preview → validation utilisateur
4. `INSERT bank_statements` + `bank_transactions`
5. Auto-match : recherche Z avec date ±1j et montant CB correspondant
6. Match trouvé → proposition rapprochement automatique
7. Pas de match → reste "non rapproché"

### Alimentation automatique trésorerie

| Événement déclencheur | Entrée trésorerie créée |
|---|---|
| Nouveau Z de caisse | income / sales / source: M08_closing |
| Bon de commande M05 reçu | expense / supplier / source: M05_stock |
| Acompte salaire M07 validé | expense / salary / source: M07_personnel |
| Saisie manuelle | type/catégorie selon formulaire / source: null |

Les charges fixes (loyer, assurance, investissements, maintenance) sont en saisie manuelle.

### Calcul TVA automatique

```
vat_periods.vat_X_collected = SUM(cash_register_closings.vat_X) sur la période
vat_periods.vat_deductible  = SUM(TVA sur purchase_orders M05 reçus sur la période)
vat_periods.vat_due         = collectée - déductible
```

Recalculé à chaque ajout/modification d'un Z ou réception d'un bon de commande.

### Croisements modules

| Module | Données récupérées | Utilisé dans |
|---|---|---|
| M03 Commandes | Commandes `status=paid`, totaux, nb couverts | Dashboard (CA temps réel avant Z) |
| M05 Stock | Bons de commande reçus (montants TTC + TVA) | Trésorerie (sorties fournisseurs), TVA déductible |
| M06 Fournisseurs | Infos fournisseurs | Labels dans trésorerie |
| M07 Personnel | Acomptes salaire (payroll_advances) | Trésorerie (sorties salaires) |

## Structure fichiers

```
src/app/(dashboard)/caisse/
├── page.tsx                    # Page principale avec 6 onglets
├── actions.ts                  # Server actions (~25-30 actions)
└── (pas de sous-routes pour la demo)

src/components/modules/caisse/
├── caisse-dashboard.tsx        # KPIs + graphiques
├── closing-form.tsx            # Formulaire saisie Z
├── closing-import.tsx          # Import XLS/CSV Z de caisse
├── closing-list.tsx            # Tableau des Z
├── bank-import.tsx             # Import relevé bancaire
├── bank-parser.tsx             # Parser générique CSV banque
├── reconciliation-panel.tsx    # Écran rapprochement 2 colonnes
├── reconciliation-match.tsx    # Composant match unitaire
├── vat-period-card.tsx         # Card période TVA
├── vat-history.tsx             # Historique périodes TVA
├── treasury-table.tsx          # Tableau flux trésorerie
├── treasury-form.tsx           # Saisie manuelle dépense/recette
├── treasury-chart.tsx          # Graphique évolution solde
├── treasury-summary.tsx        # Résumé mensuel
├── journal-list.tsx            # Journal historique
├── export-fec.tsx              # Génération export FEC
└── export-csv.tsx              # Génération export CSV

src/stores/caisse.store.ts      # Zustand store
src/lib/bank-parser.ts          # Logique parsing CSV banque générique
src/lib/fec-export.ts           # Logique génération FEC
```

## Seed data LCQF (demo)

- **30 Z de caisse** : CA réaliste BBQ restaurant (800-2500€/jour, plus haut weekends)
- **1 relevé bancaire** : ~40 transactions (encaissements CB, prélèvements, virements)
- **10-15 rapprochements** : pré-matchés pour montrer la fonctionnalité
- **2 périodes TVA** : février + mars 2026 (1 validée, 1 brouillon)
- **~50 entrées trésorerie** : mix auto (ventes, fournisseurs M05, salaires M07) + manuelles (loyer, assurance, achat chaises)

## Server actions (~25-30)

### Z de caisse
- `getClosings(filters?)` — liste des Z avec filtres période
- `getClosingByDate(date)` — Z d'un jour
- `createClosing(data)` — saisie manuelle + auto-create treasury_entry
- `importClosings(rows[])` — import batch depuis XLS/CSV
- `updateClosing(id, data)` — modification
- `deleteClosing(id)` — suppression (si non rapproché)

### Banque
- `getBankStatements()` — liste des relevés importés
- `getBankTransactions(filters?)` — transactions avec filtres
- `importBankStatement(file)` — import CSV → statement + transactions
- `categorizeTransaction(id, category)` — catégoriser manuellement
- `getUnreconciledTransactions()` — transactions non rapprochées
- `getUnreconciledClosings()` — Z non rapprochés

### Rapprochement
- `autoMatchTransactions()` — auto-match date ±1j + montant
- `reconcile(transactionId, closingId)` — rapprocher manuellement
- `unreconcile(transactionId)` — annuler un rapprochement

### TVA
- `getVatPeriods()` — liste périodes
- `getVatPeriod(id)` — détail avec calculs
- `recalculateVatPeriod(id)` — recalcul depuis Z + achats
- `createVatPeriod(start, end)` — nouvelle période
- `validateVatPeriod(id)` — passer en validé
- `declareVatPeriod(id)` — marquer comme déclaré

### Trésorerie
- `getTreasuryEntries(filters?)` — flux avec filtres
- `getTreasurySummary(period)` — totaux entrées/sorties/solde
- `createTreasuryEntry(data)` — saisie manuelle
- `updateTreasuryEntry(id, data)` — modification
- `deleteTreasuryEntry(id)` — suppression (si source manuelle uniquement)

### Dashboard
- `getDashboardKpis()` — CA jour/mois, marge, solde
- `getDailyRevenue(days)` — CA par jour pour graphique
- `getPaymentBreakdown(period)` — ventilation paiements

### Export
- `generateFEC(periodStart, periodEnd)` — génère fichier FEC
- `generateCSV(periodStart, periodEnd)` — génère export CSV

## Contraintes techniques

- **Types Supabase** : suivre le pattern M07 — types manuels dans `src/types/caisse.ts` si `supabase gen types` pas relancé, sinon utiliser les types générés.
- **Pas de joins Supabase** : requêtes séparées + groupement JS (cf. feedback existant).
- **shadcn/ui v4** : `render` au lieu de `asChild`.
- **xlsx** : déjà installé (utilisé par M05), réutiliser pour parsing XLS/CSV.
- **Recharts** : déjà installé (utilisé par M01), réutiliser pour graphiques.
- **Zustand** : 1 store `caisse.store.ts` pour l'état UI du module.
- **Tactile first** : boutons min 44×44px, viewport tablette prioritaire (cf. CLAUDE.md).
- **Next.js 16** : lire les docs dans `node_modules/next/dist/docs/` avant tout code (cf. AGENTS.md). Utilise `proxy.ts` au lieu de `middleware.ts`.
- **bank_transactions.reconciled_with** : FK polymorphe (pointe vers `cash_register_closings.id` OU `treasury_entries.id`). Pas de FK déclarée en DB — intégrité gérée côté application.
- **Encodage FEC** : ISO 8859-15 obligatoire (pas UTF-8). Géré côté serveur dans `fec-export.ts`.
