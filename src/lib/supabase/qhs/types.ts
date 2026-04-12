// src/lib/supabase/qhs/types.ts
// Types manuels — règle projet : pas de joins Supabase, types non générés.
// Source de vérité : migration 20260407120000_qhs_module.sql

export type QhsFrequency =
  | "quotidien" | "hebdo" | "mensuel" | "trimestriel" | "annuel";

export type QhsServiceCreneau =
  | "avant_midi" | "midi" | "apres_midi"
  | "avant_soir" | "soir" | "apres_soir"
  | "fin_journee" | "libre";

export type QhsInstanceStatut =
  | "a_faire" | "en_cours" | "validee" | "en_retard" | "non_conforme";

export type QhsNcStatut = "ouverte" | "en_cours" | "cloturee";

export interface QhsZone {
  id: string;
  restaurant_id: string;
  nom: string;
  code: string;
  critique: boolean;
  actif: boolean;
  created_at: string;
}

export interface QhsTaskTemplate {
  id: string;
  restaurant_id: string | null;
  zone_id: string | null;
  libelle: string;
  description: string | null;
  produit_utilise: string | null;
  frequency: QhsFrequency;
  service_creneau: QhsServiceCreneau | null;
  jour_semaine: number | null;
  jour_mois: number | null;
  mois_annee: number | null;
  assigned_role: string | null;
  assigned_user_id: string | null;
  photo_required: boolean;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface QhsTaskInstance {
  id: string;
  template_id: string;
  restaurant_id: string;
  date_prevue: string;       // ISO date YYYY-MM-DD
  creneau_debut: string;     // ISO timestamp
  creneau_fin: string;       // ISO timestamp
  statut: QhsInstanceStatut;
  validation_id: string | null;
  created_at: string;
}

export interface QhsTaskValidation {
  id: string;
  instance_id: string;
  user_id: string;
  validated_at: string;
  pin_used_hash: string;
  photo_url: string | null;
  commentaire: string | null;
}

export interface QhsNonConformity {
  id: string;
  restaurant_id: string;
  instance_id: string | null;
  template_id: string | null;
  zone_id: string | null;
  date_constat: string;
  gravite: 1 | 2 | 3;
  description: string;
  action_corrective: string | null;
  traite_par: string | null;
  traite_at: string | null;
  statut: QhsNcStatut;
}

export interface QhsSettings {
  restaurant_id: string;
  service_midi_debut: string;   // HH:MM:SS
  service_midi_fin: string;
  service_soir_debut: string;
  service_soir_fin: string;
  delai_alerte_manager_min: number;
  delai_creation_nc_min: number;
  email_rapport_quotidien: string | null;
  updated_at: string;
}

// Vue assemblée côté client (zone, template, instance ensemble)
export interface QhsTaskInstanceWithContext extends QhsTaskInstance {
  template: QhsTaskTemplate;
  zone: QhsZone | null;
}
