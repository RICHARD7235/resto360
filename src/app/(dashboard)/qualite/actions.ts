"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  validateTask,
  closeNonConformity,
  upsertTemplate,
  importFromLibrary,
} from "@/lib/supabase/qhs/mutations";
import type { QhsTaskTemplate } from "@/lib/supabase/qhs/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getUserRestaurantId(): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.restaurant_id) {
    throw new Error("Aucun restaurant associé à votre compte.");
  }

  return profile.restaurant_id;
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

export async function validateTaskAction(formData: FormData) {
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
  const restaurantId = await getUserRestaurantId();
  const result = await importFromLibrary(
    restaurantId,
    libraryIds,
    zoneAssignments,
  );
  revalidatePath("/qualite/nettoyage/admin");
  return result;
}
