"use server";

// Server actions M12 Documents & Conformité.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireQhsAdmin } from "@/lib/qhs/auth";
import { uploadDocumentFile } from "@/lib/documents/storage";

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
