export type AccountingSnapshot = {
  id: string;
  restaurant_id: string;
  period: string;
  ca_ht: number;
  ca_ttc: number;
  couverts: number;
  ticket_moyen: number;
  food_cost: number;
  charges_variables: number;
  marge_brute: number;
  masse_salariale: number;
  charges_fixes: number;
  ebitda: number;
  resultat_net: number;
  budget_ca: number | null;
  budget_charges: number | null;
  created_at: string;
};

export type KpiKey =
  | 'ca_ht' | 'marge_brute' | 'food_cost' | 'masse_salariale'
  | 'ebitda' | 'resultat_net' | 'couverts' | 'ticket_moyen';

export type KpiDelta = { current: number; previous: number | null; variationPct: number | null };
