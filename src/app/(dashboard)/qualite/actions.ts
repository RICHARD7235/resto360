"use server";

import { revalidatePath } from "next/cache";
import {
  validateTask,
  closeNonConformity,
  upsertTemplate,
  importFromLibrary,
} from "@/lib/supabase/qhs/mutations";
import { requireActionPermission } from "@/lib/rbac";
import type { QhsTaskTemplate } from "@/lib/supabase/qhs/types";

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

export async function validateTaskAction(formData: FormData) {
  await requireActionPermission("m13_qualite", "write");

  const instanceId = String(formData.get("instanceId"));
  const pin = String(formData.get("pin"));
  const commentaire = formData.get("commentaire")
    ? String(formData.get("commentaire"))
    : undefined;
  const photoFile = formData.get("photo") as File | null;

  const result = await validateTask({
    instanceId,
    pin,
    photoFile: photoFile && photoFile.size > 0 ? photoFile : null,
    commentaire,
  });

  if (result.ok) revalidatePath("/qualite/nettoyage");
  return result;
}

export async function closeNcAction(formData: FormData) {
  const ncId = String(formData.get("ncId"));
  const pin = String(formData.get("pin"));
  const action = String(formData.get("action_corrective"));

  const result = await closeNonConformity(ncId, pin, action);
  if (result.ok) revalidatePath("/qualite/nettoyage/admin");
  return result;
}

export async function upsertTemplateAction(template: Partial<QhsTaskTemplate>) {
  const result = await upsertTemplate(template);
  if (result.ok) revalidatePath("/qualite/nettoyage/admin");
  return result;
}

export async function importFromLibraryAction(
  libraryIds: string[],
  zoneAssignments: Record<string, string>,
) {
  const { restaurantId } = await requireActionPermission("m13_qualite", "write");
  const result = await importFromLibrary(
    restaurantId,
    libraryIds,
    zoneAssignments,
  );
  revalidatePath("/qualite/nettoyage/admin");
  return result;
}
