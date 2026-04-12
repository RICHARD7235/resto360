import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DocumentCategory,
  DocumentWithStatus,
  DocumentVersion,
  LegalRegister,
  DocumentNotification,
  DocumentKpis,
  UrgencyLevel,
} from "@/types/documents";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, any, any>;

async function untyped(): Promise<UntypedClient> {
  return (await createClient()) as unknown as UntypedClient;
}

export async function getCategories(): Promise<DocumentCategory[]> {
  const supabase = await untyped();
  const { data, error } = await supabase
    .from("document_categories")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DocumentCategory[];
}

export async function getDocumentsWithStatus(
  restaurantId: string
): Promise<DocumentWithStatus[]> {
  const supabase = await untyped();
  const { data, error } = await supabase
    .from("documents_with_status")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocumentWithStatus[];
}

export async function getDocumentById(
  id: string,
  restaurantId: string
): Promise<DocumentWithStatus | null> {
  const supabase = await untyped();
  const { data, error } = await supabase
    .from("documents_with_status")
    .select("*")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();
  if (error) return null;
  return data as DocumentWithStatus;
}

export async function getVersions(
  documentId: string,
  restaurantId: string
): Promise<DocumentVersion[]> {
  const supabase = await untyped();
  // Join through document to ensure tenant isolation
  const { data: doc } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("restaurant_id", restaurantId)
    .single();
  if (!doc) return [];

  const { data, error } = await supabase
    .from("document_versions")
    .select("*")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocumentVersion[];
}

export async function getRegisters(
  restaurantId: string
): Promise<LegalRegister[]> {
  const supabase = await untyped();
  const { data, error } = await supabase
    .from("legal_registers")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("label", { ascending: true });
  if (error) throw error;
  return (data ?? []) as LegalRegister[];
}

export async function getNotifications(
  documentId: string,
  restaurantId: string
): Promise<DocumentNotification[]> {
  const supabase = await untyped();
  // Verify document belongs to restaurant before returning notifications
  const { data: doc } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("restaurant_id", restaurantId)
    .single();
  if (!doc) return [];

  const { data, error } = await supabase
    .from("document_notifications")
    .select("*")
    .eq("document_id", documentId)
    .order("scheduled_for", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocumentNotification[];
}

export async function getKpis(restaurantId: string): Promise<DocumentKpis> {
  const docs = await getDocumentsWithStatus(restaurantId);
  const kpis: DocumentKpis = {
    total: docs.length,
    critical: 0,
    warning: 0,
    info: 0,
  };
  for (const d of docs) {
    const lvl: UrgencyLevel = d.urgency_level;
    if (lvl === "expired" || lvl === "critical") kpis.critical += 1;
    else if (lvl === "warning") kpis.warning += 1;
    else if (lvl === "info") kpis.info += 1;
  }
  return kpis;
}

export async function getExpiringSoon(
  restaurantId: string,
  days = 90
): Promise<DocumentWithStatus[]> {
  const supabase = await untyped();
  const { data, error } = await supabase
    .from("documents_with_status")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .not("expires_at", "is", null)
    .lte("days_until_expiry", days)
    .order("expires_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DocumentWithStatus[];
}
