"use server";

// Server actions M12 Documents & Conformité.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requirePermission } from "@/lib/rbac";
import {
  uploadDocumentFile,
  deleteDocumentFiles,
  getSignedUrl,
} from "@/lib/documents/storage";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  category_id: z.string().uuid(),
  expires_at: z.string().regex(dateRegex).optional(),
  issued_at: z.string().regex(dateRegex).optional(),
});

const addVersionSchema = z.object({
  change_notes: z.string().max(1000).optional(),
});

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
  try {
    await requirePermission("m12_documents", "write");
    const supabase = await createClient();
    const { data, error } = await supabase.functions.invoke(
      "documents-check-expirations",
    );
    if (error) {
      return { ok: false, checked: 0, created: 0, error: error.message };
    }
    const payload = (data ?? {}) as { checked?: number; created?: number };
    return {
      ok: true,
      checked: payload.checked ?? 0,
      created: payload.created ?? 0,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue.";
    return { ok: false, checked: 0, created: 0, error: msg };
  }
}

export async function createDocument(
  formData: FormData
): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const { restaurantId } = await requirePermission("m12_documents", "write");
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

    createDocumentSchema.parse({
      title,
      category_id: category_id ?? "",
      ...(expires_at ? { expires_at } : {}),
      ...(issued_at ? { issued_at } : {}),
    });

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
    const { restaurantId } = await requirePermission("m12_documents", "write");
    const supabase = await untyped();

    const file = formData.get("file");
    const change_notes =
      String(formData.get("change_notes") ?? "").trim() || null;

    addVersionSchema.parse({
      ...(change_notes ? { change_notes } : {}),
    });

    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Fichier requis." };
    }

    // 0. Verify document belongs to restaurant
    const { data: docCheck } = await supabase
      .from("documents")
      .select("id")
      .eq("id", documentId)
      .eq("restaurant_id", restaurantId)
      .single();
    if (!docCheck) return { ok: false, error: "Document introuvable." };

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
      .eq("id", documentId)
      .eq("restaurant_id", restaurantId);
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
    const { restaurantId } = await requirePermission("m12_documents", "write");
    const supabase = await untyped();
    const { error } = await supabase
      .from("documents")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("restaurant_id", restaurantId);
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
    const { restaurantId } = await requirePermission("m12_documents", "delete");
    const supabase = await untyped();

    // 1. SELECT all versions (via document ownership check)
    const { data: doc } = await supabase
      .from("documents")
      .select("id")
      .eq("id", id)
      .eq("restaurant_id", restaurantId)
      .single();
    if (!doc) return { ok: false, error: "Document introuvable." };

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
      .eq("id", id)
      .eq("restaurant_id", restaurantId);

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
      .eq("id", id)
      .eq("restaurant_id", restaurantId);
    if (delErr) return { ok: false, error: delErr.message };

    revalidatePath("/documents");
    revalidatePath("/documents/bibliotheque");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue.";
    return { ok: false, error: msg };
  }
}

const REGISTER_SEEDS: Array<{
  slug: string;
  label: string;
  description: string;
  source_module: "M05" | "M07" | "M11" | "M12" | "M13";
  source_url: string;
}> = [
  {
    slug: "registre-personnel",
    label: "Registre du personnel",
    description:
      "Liste obligatoire des salariés (entrées/sorties, contrats, qualifications).",
    source_module: "M07",
    source_url: "/personnel",
  },
  {
    slug: "registre-haccp",
    label: "Registre HACCP",
    description:
      "Plan de maîtrise sanitaire, traçabilité, températures, nettoyage.",
    source_module: "M13",
    source_url: "/qhs",
  },
  {
    slug: "duerp",
    label: "DUERP",
    description:
      "Document Unique d'Évaluation des Risques Professionnels (mise à jour annuelle).",
    source_module: "M12",
    source_url: "/documents/bibliotheque?cat=legal",
  },
  {
    slug: "registre-entrees-sorties",
    label: "Registre entrées / sorties marchandises",
    description:
      "Suivi des achats, livraisons et sorties de stock pour la traçabilité.",
    source_module: "M05",
    source_url: "/stock",
  },
  {
    slug: "bilans-comptables",
    label: "Bilans comptables",
    description:
      "Bilans, comptes de résultat et liasses fiscales annuelles.",
    source_module: "M11",
    source_url: "/comptabilite",
  },
];

export async function seedRegistersIfMissing(
  restaurantId: string
): Promise<{ ok: boolean; created: number; error?: string }> {
  try {
    await requirePermission("m12_documents", "write");
    const supabase = await untyped();
    const { data: existing, error: selErr } = await supabase
      .from("legal_registers")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .limit(1);
    if (selErr) return { ok: false, created: 0, error: selErr.message };
    if ((existing ?? []).length > 0) return { ok: true, created: 0 };

    const rows = REGISTER_SEEDS.map((s) => ({
      restaurant_id: restaurantId,
      slug: s.slug,
      label: s.label,
      description: s.description,
      source_module: s.source_module,
      source_url: s.source_url,
      status: "a-verifier",
    }));
    const { error: insErr } = await supabase.from("legal_registers").insert(rows);
    if (insErr) return { ok: false, created: 0, error: insErr.message };
    revalidatePath("/documents/registres");
    return { ok: true, created: rows.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue.";
    return { ok: false, created: 0, error: msg };
  }
}

export async function getDownloadUrl(
  versionId: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const { restaurantId } = await requirePermission("m12_documents", "read");
    const supabase = await untyped();
    const { data, error } = await supabase
      .from("document_versions")
      .select("storage_path, document_id")
      .eq("id", versionId)
      .single();
    if (error || !data) {
      return { ok: false, error: error?.message ?? "Version introuvable." };
    }
    // Verify document belongs to restaurant
    const { data: docCheck } = await supabase
      .from("documents")
      .select("id")
      .eq("id", (data as { document_id: string }).document_id)
      .eq("restaurant_id", restaurantId)
      .single();
    if (!docCheck) {
      return { ok: false, error: "Document introuvable." };
    }
    const path = (data as { storage_path: string }).storage_path;
    const url = await getSignedUrl(path, 300);
    return { ok: true, url };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur inconnue.";
    return { ok: false, error: msg };
  }
}
