// src/lib/supabase/qhs/mutations.ts
// Writes pour le module M08 QHS : validations de tâches, clôture NC,
// gestion des templates et import depuis la bibliothèque.

import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/lib/rbac";
import type { QhsTaskTemplate } from "./types";

const hashPin = (pin: string) =>
  createHash("sha256").update(pin).digest("hex");

export interface ValidateTaskInput {
  instanceId: string;
  pin: string;
  photoFile?: File | null;
  commentaire?: string;
}

export async function validateTask(
  input: ValidateTaskInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  // 1. Charger l'instance
  const { data: inst, error: e1 } = await (supabase as any)
    .from("qhs_task_instances")
    .select("id, template_id, restaurant_id, statut")
    .eq("id", input.instanceId)
    .maybeSingle();
  if (e1 || !inst) return { ok: false, error: "Instance introuvable" };
  if (inst.statut === "validee")
    return { ok: false, error: "Tâche déjà validée" };

  // 2. Charger le template (photo_required)
  const { data: tpl } = await (supabase as any)
    .from("qhs_task_templates")
    .select("photo_required")
    .eq("id", inst.template_id)
    .maybeSingle();
  const tplTyped = tpl as Pick<QhsTaskTemplate, "photo_required"> | null;

  if (tplTyped?.photo_required && !input.photoFile) {
    return { ok: false, error: "Photo obligatoire pour cette tâche" };
  }

  // 3. Vérifier le PIN contre le staff actif du restaurant
  const pinHash = hashPin(input.pin);
  const { data: perso } = await (supabase as any)
    .from("staff_members")
    .select("id, pin_hash")
    .eq("restaurant_id", inst.restaurant_id)
    .eq("is_active", true);

  const matched = (perso ?? []).find(
    (p: { pin_hash: string | null }) => p.pin_hash === pinHash,
  );
  if (!matched) return { ok: false, error: "PIN invalide" };

  // 4. Upload photo si fournie
  let photoUrl: string | null = null;
  if (input.photoFile) {
    const path = `${inst.restaurant_id}/${input.instanceId}/${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage
      .from("qhs-photos")
      .upload(path, input.photoFile, { contentType: "image/jpeg" });
    if (upErr)
      return { ok: false, error: `Upload photo échoué: ${upErr.message}` };
    photoUrl = path;
  }

  // 5. Insert validation
  const { data: val, error: e3 } = await (supabase as any)
    .from("qhs_task_validations")
    .insert({
      instance_id: input.instanceId,
      user_id: (matched as { id: string }).id,
      pin_used_hash: pinHash,
      photo_url: photoUrl,
      commentaire: input.commentaire ?? null,
    })
    .select("id")
    .single();
  if (e3 || !val) return { ok: false, error: "Insertion validation échouée" };

  // 6. Update instance
  const { error: e4 } = await (supabase as any)
    .from("qhs_task_instances")
    .update({
      statut: "validee",
      validation_id: (val as { id: string }).id,
    })
    .eq("id", input.instanceId);
  if (e4) return { ok: false, error: "Update instance échoué" };

  return { ok: true };
}

export async function closeNonConformity(
  ncId: string,
  pin: string,
  actionCorrective: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();

  const { data: nc } = await (supabase as any)
    .from("qhs_nonconformities")
    .select("id, restaurant_id")
    .eq("id", ncId)
    .maybeSingle();
  if (!nc) return { ok: false, error: "Non-conformité introuvable" };

  // Vérifie que l'utilisateur connecté a la permission write sur m13_qualite
  await requirePermission("m13_qualite", "write");

  const pinHash = hashPin(pin);
  const { data: perso } = await (supabase as any)
    .from("staff_members")
    .select("id, pin_hash")
    .eq("restaurant_id", (nc as { restaurant_id: string }).restaurant_id)
    .eq("is_active", true);

  const matched = (perso ?? []).find(
    (p: { pin_hash: string | null }) => p.pin_hash === pinHash,
  );
  if (!matched)
    return { ok: false, error: "PIN invalide" };

  const { error } = await (supabase as any)
    .from("qhs_nonconformities")
    .update({
      statut: "cloturee",
      action_corrective: actionCorrective,
      traite_par: (matched as { id: string }).id,
      traite_at: new Date().toISOString(),
    })
    .eq("id", ncId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function upsertTemplate(
  template: Partial<QhsTaskTemplate>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("qhs_task_templates")
    .upsert(template)
    .select("id")
    .single();
  if (error || !data)
    return { ok: false, error: error?.message ?? "Upsert échoué" };
  return { ok: true, id: (data as { id: string }).id };
}

export async function importFromLibrary(
  restaurantId: string,
  libraryTemplateIds: string[],
  zoneAssignments: Record<string, string>, // libTplId → zoneId
): Promise<{ ok: true; count: number }> {
  const supabase = await createClient();
  const { data: libs } = await (supabase as any)
    .from("qhs_task_templates")
    .select("*")
    .in("id", libraryTemplateIds);

  const rows = ((libs ?? []) as QhsTaskTemplate[]).map((l) => ({
    ...l,
    id: undefined,
    restaurant_id: restaurantId,
    zone_id: zoneAssignments[l.id] ?? null,
    created_at: undefined,
    updated_at: undefined,
  }));

  if (rows.length > 0) {
    await (supabase as any).from("qhs_task_templates").insert(rows);
  }
  return { ok: true, count: rows.length };
}
