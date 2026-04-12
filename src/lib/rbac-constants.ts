export type AppRole = "owner" | "admin" | "manager" | "cook" | "staff";

export type AppModule =
  | "m01_dashboard"
  | "m02_reservations"
  | "m03_commandes"
  | "m04_carte"
  | "m05_stock"
  | "m06_fournisseurs"
  | "m07_personnel"
  | "m08_caisse"
  | "m09_avis"
  | "m10_marketing"
  | "m11_comptabilite"
  | "m12_documents"
  | "m13_qualite";

export type PermissionAction = "read" | "write" | "delete";

/** Maps route paths to module identifiers for permission checks */
export const ROUTE_TO_MODULE: Record<string, AppModule> = {
  "/tableau-de-bord": "m01_dashboard",
  "/reservations": "m02_reservations",
  "/commandes": "m03_commandes",
  "/carte": "m04_carte",
  "/stock": "m05_stock",
  "/fournisseurs": "m06_fournisseurs",
  "/personnel": "m07_personnel",
  "/caisse": "m08_caisse",
  "/avis": "m09_avis",
  "/marketing": "m10_marketing",
  "/comptabilite": "m11_comptabilite",
  "/documents": "m12_documents",
  "/qualite": "m13_qualite",
};

export const MODULE_LABELS: Record<AppModule, string> = {
  m01_dashboard: "Tableau de bord",
  m02_reservations: "Réservations",
  m03_commandes: "Commandes & Service",
  m04_carte: "Carte & Recettes",
  m05_stock: "Stock & Achats",
  m06_fournisseurs: "Fournisseurs",
  m07_personnel: "Personnel & Planning",
  m08_caisse: "Caisse & Facturation",
  m09_avis: "Avis & E-réputation",
  m10_marketing: "Marketing & Réseaux",
  m11_comptabilite: "Comptabilité & Reporting",
  m12_documents: "Documents & Conformité",
  m13_qualite: "Qualité H&S",
};
