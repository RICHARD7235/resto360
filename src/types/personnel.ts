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
  department: string;
  responsibilities: string[];
  required_skills: string[];
  reports_to_position_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ScheduleWeek {
  id: string;
  restaurant_id: string;
  week_start: string;
  status: string;
  created_by: string | null;
  notes: string | null;
  template_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Shift {
  id: string;
  schedule_week_id: string;
  staff_member_id: string;
  date: string;
  period: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  shift_type: string;
  notes: string | null;
  created_at: string | null;
}

export interface ScheduleTemplate {
  id: string;
  restaurant_id: string;
  name: string;
  is_default: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface TemplateShift {
  id: string;
  template_id: string;
  staff_member_id: string;
  day_of_week: number;
  period: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
}

export interface LeaveBalance {
  id: string;
  staff_member_id: string;
  year: number;
  leave_type: string;
  acquired_days: number;
  taken_days: number;
  carried_over: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface LeaveRequest {
  id: string;
  staff_member_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string;
  approved_by: string | null;
  reason: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TimeEntry {
  id: string;
  staff_member_id: string;
  restaurant_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  break_minutes: number;
  period: string;
  is_manual: boolean;
  validated_by: string | null;
  notes: string | null;
  created_at: string | null;
}

export interface PayrollAdvance {
  id: string;
  staff_member_id: string;
  restaurant_id: string;
  date: string;
  amount: number;
  payment_method: string;
  notes: string | null;
  created_at: string | null;
}

export interface StaffDocument {
  id: string;
  staff_member_id: string;
  restaurant_id: string;
  type: string;
  name: string;
  file_url: string;
  date: string | null;
  expiry_date: string | null;
  created_at: string | null;
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

export type ShiftPeriod = "midi" | "soir" | "journee";

export type ShiftType = "work" | "leave" | "sick" | "training" | "school";

export type LeaveType = "cp" | "maladie" | "formation" | "cours" | "sans_solde";

export type LeaveRequestStatus = "pending" | "approved" | "rejected";

export type ScheduleStatus = "draft" | "published";

export type ContractType = "cdi" | "cdd" | "temps_partiel" | "apprenti" | "stage" | "extra";

export type DocumentType = "contrat" | "fiche_paie" | "attestation" | "autre";

export type PaymentMethod = "virement" | "especes";

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
  cp: "Congés payés",
  maladie: "Maladie",
  formation: "Formation",
  cours: "Cours (apprenti)",
  sans_solde: "Sans solde",
};

export const PERIOD_LABELS: Record<ShiftPeriod, string> = {
  midi: "Midi",
  soir: "Soir",
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
  date: string;
  period: ShiftPeriod;
  start_time: string;
  end_time: string;
  break_minutes: number;
  shift_type: ShiftType;
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
  date: string;
  period: ShiftPeriod;
  clock_in: string;
  clock_out: string;
  break_minutes: number;
  notes: string;
}

export interface PayrollAdvanceFormData {
  staff_member_id: string;
  date: string;
  amount: number;
  payment_method: PaymentMethod;
  notes: string;
}

export interface StaffDocumentFormData {
  staff_member_id: string;
  type: DocumentType;
  name: string;
  file_url: string;
  date: string;
  expiry_date: string;
}
