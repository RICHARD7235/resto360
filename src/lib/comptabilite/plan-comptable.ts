import type { KpiKey } from '@/types/comptabilite';

export const PL_ROWS = [
  { key: 'ca_ht', label: "Chiffre d'affaires HT", level: 0, kind: 'product' },
  { key: 'charges_variables', label: 'Charges variables', level: 1, kind: 'charge' },
  { key: 'marge_brute', label: 'Marge brute', level: 0, kind: 'subtotal' },
  { key: 'masse_salariale', label: 'Masse salariale', level: 1, kind: 'charge' },
  { key: 'charges_fixes', label: 'Charges fixes', level: 1, kind: 'charge' },
  { key: 'ebitda', label: 'EBITDA', level: 0, kind: 'subtotal' },
  { key: 'resultat_net', label: 'Résultat net', level: 0, kind: 'total' },
] as const;

export const KPI_CARDS: { key: KpiKey; label: string; format: 'eur' | 'pct' | 'int' }[] = [
  { key: 'ca_ht', label: 'CA HT', format: 'eur' },
  { key: 'marge_brute', label: 'Marge brute', format: 'eur' },
  { key: 'food_cost', label: 'Food cost', format: 'pct' },
  { key: 'masse_salariale', label: 'Masse salariale', format: 'eur' },
  { key: 'ebitda', label: 'EBITDA', format: 'eur' },
  { key: 'resultat_net', label: 'Résultat net', format: 'eur' },
  { key: 'couverts', label: 'Couverts', format: 'int' },
  { key: 'ticket_moyen', label: 'Ticket moyen', format: 'eur' },
];

export const BUDGET_THRESHOLDS = { warning: 5, critical: 10 };
