"use server";

// Server actions M12 Documents & Conformité.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireQhsAdmin } from "@/lib/qhs/auth";
import {
  uploadDocumentFile,
  deleteDocumentFiles,
  getSignedUrl,
} from "@/lib/documents/storage";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, any, any>;
async function untyped(): Promise<UntypedClient> {
  return (await createClient()) as unknown as UntypedClient;
}

export async function triggerExpirationCheck(): Promise<{
  ok: boolean;
  checked: number;
  created: number;
  error?: string;
}> {
  // Stub : la vraie implémentation invoquera l'edge function
  // documents-check-expirations dans Task 8.
  return { ok: true, checked: 0, created: 0 };
}

export async function createDocument(
  formData: FormData
): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const { restaurantId } = await requireQhsAdmin();
    const supabase = await untyped();

    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim() || null;
    const category_id = String(formData.get("category_id") ?? "") || null;
    const expires_at = String(formData.get("expires_at") ?? "") || null;
    const issued_at = String(formData.get("issued_at") ?? "") || null;
    const reference_number =
      String(formData.get("reference_number") ?? "").trim() || null;
    const issuer = String(formData.get("issuer") ?? "").trim() || null;
    const file = formData.get("file");

    if (!title) return { ok: false, error: "Titre requis." };
    if (!category_id) return { ok: false, error: "Catégorie requise." };
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Fichier requis." };
    }

    // 1. INSERT documents
    const { data: doc, error: insertErr } = await supabase
      .from("documents")
      .insert({
        restaurant_id: restaurantId,
        category_id,
        title,
        description,
        issued_at,
        expires_at,
        reference_number,
        issuer,
      })
      .select("id")
      .single();
    if (insertErr || !doc) {
      return { ok: false, error: insertErr?.message ?? "Insertion échouée." };
    }

    const docId = (doc as { id: string }).id;

    // 2. Upload Storage
    let uploaded: Awaited<ReturnType<typeof uploadDocumentFile>>;
    try {
      uploaded = await uploadDocumentFile(restaurantId, docId, 1, file);
    } catch (e) {
      // Rollback document
      await supabase.from("documents").delete().eq("id", docId);
      const msg = e instanceof Error ? e.message : "Upload échoué.";
      return { ok: false, error: `Storage: ${msg}` };
    }

    // 3. INSERT document_versions
    const { data: version, error: vErr } = await supabase
      .from("document_versions")
      .insert({
        document_id: docId,
        version_number: 1,
        storage_path: uploaded.path,
        file_name: uploaded.name,
        file_size: uploaded.size,
        mime_type: uploaded.mime,
      })
      .select("id")
      .single();
    if (vErr || !version) {
      await supabase.from("documents").delete().eq("id", docId);
      return { ok: false, error: vErr?.message ?? "Version échouée." };
    }

    // 4. UPDATE current_version_id
    const versionId = (version as { id: string }).id;
    const { error: updErr } = await supabase
      .from("documents")
      .update({ current_version_id: versionId })
      .eq("id", docId);
    if (updErr) return { ok: false, error: updErr.message };

    revalidatePath("/documents");
    revalidatePath("/documents/bibliotheque");

    return { ok: true, id: docId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue.";
    return { ok: false, error: msg };
  }
}

export async function addVersion(
  documentId: string,
  formData: FormData
): Promise<{ ok: boolean; error?: string; versionId?: string }> {
  try {
    const { restaurantId } = await requireQhsAdmin();
    const supabase = await untyped();

    const file = formData.get("file");
    const change_notes =
      String(formData.get("change_notes") ?? "").trim() || null;

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Fichier requis." };
    }

    // 1. SELECT max(version_number)
    const { data: maxRow, error: maxErr } = await supabase
      .from("document_versions")
      .select("version_number")
      .eq("document_id", documentId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxErr) return { ok: false, error: maxErr.message };

    const next =
      ((maxRow as { version_number: number } | null)?.version_number ?? 0) + 1;

    // 2. Upload
    let uploaded: Awaited<ReturnType<typeof uploadDocumentFile>>;
    try {
      uploaded = await uploadDocumentFile(restaurantId, documentId, next, file);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload échoué.";
      return { ok: false, error: `Storage: ${msg}` };
    }

    // 3. INSERT version
    const { data: version, error: vErr } = await supabase
      .from("document_versions")
      .insert({
        document_id: documentId,
        version_number: next,
        storage_path: uploaded.path,
        file_name: uploaded.name,
        file_size: uploaded.size,
        mime_type: uploaded.mime,
        change_notes,
      })
      .select("id")
      .single();
    if (vErr || !version) {
      return { ok: false, error: vErr?.message ?? "Version échouée." };
    }

    const versionId = (version as { id: string }).id;

    // 4. UPDATE current_version_id + updated_at
    const { error: updErr } = await supabase
      .from("documents")
      .update({
        current_version_id: versionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);
    if (updErr) return { ok: false, error: updErr.message };

    revalidatePath("/documents");
    revalidatePath("/documents/bibliotheque");
    revalidatePath(`/documents/${documentId}`);

    return { ok: true, versionId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue.";
    return { ok: false, error: msg };
  }
}

export async function updateDocument(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    category_id?: string | null;
    issued_at?: string | null;
    expires_at?: string | null;
    reference_number?: string | null;
    issuer?: string | null;
  }
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireQhsAdmin();
    const supabase = await untyped();
    const { error } = await supabase
      .from("documents")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/documents");
    revalidatePath("/documents/bibliotheque");
    revalidatePath(`/documents/${id}`);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue.";
    return { ok: false, error: msg };
  }
}

export async function deleteDocument(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireQhsAdmin();
    const supabase = await untyped();

    // 1. SELECT all versions
    const { data: versions, error: vErr } = await supabase
      .from("document_versions")
      .select("storage_path")
      .eq("document_id", id);
    if (vErr) return { ok: false, error: vErr.message };

    const paths = ((versions ?? []) as { storage_path: string }[]).map(
      (v) => v.storage_path
    );

    // 2. Nullifier current_version_id pour éviter blocage FK
    await supabase
      .from("documents")
      .update({ current_version_id: null })
      .eq("id", id);

    // 3. Delete files
    try {
      await deleteDocumentFiles(paths);
    } catch {
      // on continue même si cleanup storage échoue partiellement
    }

    // 4. DELETE document (cascade versions + notifications)
    const { error: delErr } = await supabase
      .from("documents")
      .delete()
      .eq("id", id);
    if (delErr) return { ok: false, error: delErr.message };

    revalidatePath("/documents");
    revalidatePath("/documents/bibliotheque");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue.";
    return { ok: false, error: msg };
  }
}

export async function getDownloadUrl(
  versionId: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    await requireQhsAdmin();
    const supabase = await untyped();
    const { data, error } = await supabase
      .from("document_versions")
      .select("storage_path")
      .eq("id", versionId)
      .single();
    if (error || !data) {
      return { ok: false, error: error?.message ?? "Version introuvable." };
    }
    const path = (data as { storage_path: string }).storage_path;
    const url = await getSignedUrl(path, 300);
    return { ok: true, url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue.";
    return { ok: false, error: msg };
  }
}
