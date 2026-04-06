// ---------------------------------------------------------------------------
// DB Row types (manual — generated types not yet updated)
// ---------------------------------------------------------------------------

export interface StaffMember {
  id: string;
  restaurant_id: string;
  full_name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean | null;
  profile_id: string | null;
  hourly_rate: number | null;
  contract_type: string | null;
  department: string | null;
  job_position_id: string | null;
  manager_id: string | null;
  contract_hours: number | null;
  start_date: string | null;
  end_date: string | null;
  social_security_number: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  birth_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface JobPosition {
  id: string;
  restaurant_id: string;
  title: string;
  department: string | null;
  description: string | null;
  min_hourly_rate: number | null;
  max_hourly_rate: number | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ScheduleWeek {
  id: string;
  restaurant_id: string;
  week_start: string;
  week_end: string;
  status: string | null;
  notes: string | null;
  created_by: string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Shift {
  id: string;
  restaurant_id: string;
  schedule_week_id: string | null;
  staff_member_id: string;
  shift_date: string;
  start_time: string | null;
  end_time: string | null;
  break_duration: number | null;
  shift_type: string;
  period: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ScheduleTemplate {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TemplateShift {
  id: string;
  template_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_duration: number | null;
  period: string | null;
  department: string | null;
  required_count: number | null;
  created_at: string | null;
}

export interface LeaveBalance {
  id: string;
  restaurant_id: string;
  staff_member_id: string;
  year: number;
  leave_type: string;
  total_days: number | null;
  used_days: number | null;
  pending_days: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface LeaveRequest {
  id: string;
  restaurant_id: string;
  staff_member_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_days: number | null;
  status: string | null;
  reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TimeEntry {
  id: string;
  restaurant_id: string;
  staff_member_id: string;
  shift_id: string | null;
  entry_date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_duration: number | null;
  worked_minutes: number | null;
  is_validated: boolean | null;
  validated_by: string | null;
  validated_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface PayrollAdvance {
  id: string;
  restaurant_id: string;
  staff_member_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reason: string | null;
  is_repaid: boolean | null;
  repaid_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface StaffDocument {
  id: string;
  restaurant_id: string;
  staff_member_id: string;
  document_type: string;
  title: string;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  expiry_date: string | null;
  is_verified: boolean | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ---------------------------------------------------------------------------
// Enum types
// ---------------------------------------------------------------------------

export type Department =
  | "cuisine"
  | "salle"
  | "bar"
  | "direction"
  | "communication";

export type ShiftPeriod = "matin" | "midi" | "soir" | "nuit" | "journee";

export type ShiftType = "work" | "leave" | "sick" | "training" | "school";

export type LeaveType =
  | "conges_payes"
  | "rtt"
  | "maladie"
  | "maternite"
  | "paternite"
  | "sans_solde"
  | "formation"
  | "autre";

export type LeaveRequestStatus = "pending" | "approved" | "rejected";

export type ScheduleStatus = "draft" | "published" | "archived";

export type ContractType = "cdi" | "cdd" | "temps_partiel" | "apprenti" | "stage" | "extra";

export type DocumentType =
  | "contrat"
  | "avenant"
  | "bulletin_salaire"
  | "carte_identite"
  | "titre_sejour"
  | "diplome"
  | "certificat_medical"
  | "autre";

export type PaymentMethod = "virement" | "cheque" | "especes";

// ---------------------------------------------------------------------------
// Display maps
// ---------------------------------------------------------------------------

export const DEPARTMENT_LABELS: Record<Department, string> = {
  cuisine: "Cuisine",
  salle: "Salle",
  bar: "Bar",
  direction: "Direction",
  communication: "Communication",
};

export const DEPARTMENT_COLORS: Record<Department, string> = {
  cuisine: "#E85D26",
  salle: "#3B82F6",
  bar: "#8B5CF6",
  direction: "#2D3436",
  communication: "#EC4899",
};

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  work: "Travail",
  leave: "Congé",
  sick: "Maladie",
  training: "Formation",
  school: "École",
};

export const SHIFT_TYPE_COLORS: Record<ShiftType, string> = {
  work: "#E8F5E9",
  leave: "#E3F2FD",
  sick: "#FFF3E0",
  training: "#F3E5F5",
  school: "#FFF9C4",
};

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  conges_payes: "Congés payés",
  rtt: "RTT",
  maladie: "Maladie",
  maternite: "Maternité",
  paternite: "Paternité",
  sans_solde: "Sans solde",
  formation: "Formation",
  autre: "Autre",
};

export const PERIOD_LABELS: Record<ShiftPeriod, string> = {
  matin: "Matin",
  midi: "Midi",
  soir: "Soir",
  nuit: "Nuit",
  journee: "Journée",
};

// ---------------------------------------------------------------------------
// Enriched types
// ---------------------------------------------------------------------------

export interface StaffMemberWithPosition extends StaffMember {
  job_position_title?: string;
  manager_name?: string;
}

// ---------------------------------------------------------------------------
// Form data types
// ---------------------------------------------------------------------------

export interface StaffFormData {
  full_name: string;
  role: string;
  email: string;
  phone: string;
  department: Department | "";
  job_position_id: string;
  manager_id: string;
  contract_type: ContractType | "";
  contract_hours: number | null;
  hourly_rate: number | null;
  start_date: string;
  end_date: string;
  birth_date: string;
  address: string;
  social_security_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  is_active: boolean;
}

export interface ShiftFormData {
  staff_member_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  break_duration: number | null;
  shift_type: ShiftType;
  period: ShiftPeriod | "";
  notes: string;
}

export interface LeaveRequestFormData {
  staff_member_id: string;
  leave_type: LeaveType | "";
  start_date: string;
  end_date: string;
  reason: string;
}

export interface TimeEntryFormData {
  staff_member_id: string;
  entry_date: string;
  clock_in: string;
  clock_out: string;
  break_duration: number | null;
  notes: string;
}

export interface PayrollAdvanceFormData {
  staff_member_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod | "";
  reason: string;
}

export interface StaffDocumentFormData {
  staff_member_id: string;
  document_type: DocumentType | "";
  title: string;
  expiry_date: string;
  notes: string;
}
