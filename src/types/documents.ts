export type UrgencyLevel = "expired" | "critical" | "warning" | "info" | "ok";
export type RegisterStatus = "a-jour" | "a-verifier" | "manquant";
export type SourceModule = "M05" | "M07" | "M11" | "M12" | "M13";
export type NotificationType = "30d" | "60d" | "90d" | "expired";

export interface DocumentCategory {
  id: string;
  slug: string;
  label: string;
  icon: string | null;
  sort_order: number;
}

export interface DocumentRow {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  current_version_id: string | null;
  issued_at: string | null;
  expires_at: string | null;
  reference_number: string | null;
  issuer: string | null;
  tags: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentWithStatus extends DocumentRow {
  days_until_expiry: number | null;
  urgency_level: UrgencyLevel;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  storage_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  change_notes: string | null;
}

export interface LegalRegister {
  id: string;
  restaurant_id: string;
  slug: string;
  label: string;
  description: string | null;
  source_module: SourceModule | null;
  source_url: string | null;
  last_updated_at: string | null;
  status: RegisterStatus;
}

export interface DocumentNotification {
  id: string;
  document_id: string;
  notification_type: NotificationType;
  scheduled_for: string | null;
  sent_at: string | null;
  recipient_role: string | null;
  channel: string;
  payload: Record<string, unknown> | null;
}

export interface DocumentKpis {
  total: number;
  critical: number;
  warning: number;
  info: number;
}
