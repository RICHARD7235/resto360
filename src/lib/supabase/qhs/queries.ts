// src/lib/supabase/qhs/queries.ts
// Pattern projet : requêtes séparées (no joins), assemblage côté JS.

import { createClient } from "@/lib/supabase/server";
import type {
  QhsZone,
  QhsTaskTemplate,
  QhsTaskInstance,
  QhsTaskInstanceWithContext,
  QhsNonConformity,
  QhsSettings,
} from "./types";

export async function fetchZones(restaurantId: string): Promise<QhsZone[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("qhs_zones")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("actif", true)
    .order("nom");
  if (error) throw error;
  return (data ?? []) as QhsZone[];
}

export async function fetchTemplates(
  restaurantId: string | null,
): Promise<QhsTaskTemplate[]> {
  const supabase = await createClient();
  const query = (supabase as any)
    .from("qhs_task_templates")
    .select("*")
    .eq("actif", true);
  const { data, error } = restaurantId
    ? await query.eq("restaurant_id", restaurantId)
    : await query.is("restaurant_id", null);
  if (error) throw error;
  return (data ?? []) as QhsTaskTemplate[];
}

export async function fetchInstancesForDay(
  restaurantId: string,
  date: string,
): Promise<QhsTaskInstanceWithContext[]> {
  const supabase = await createClient();

  const { data: instances, error } = await (supabase as any)
    .from("qhs_task_instances")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("date_prevue", date);
  if (error) throw error;

  const list = (instances ?? []) as QhsTaskInstance[];
  if (list.length === 0) return [];

  const templateIds = [...new Set(list.map((i) => i.template_id))];
  const { data: templates } = await (supabase as any)
    .from("qhs_task_templates")
    .select("*")
    .in("id", templateIds);

  const tplList = (templates ?? []) as QhsTaskTemplate[];
  const tplMap = new Map(tplList.map((t) => [t.id, t]));

  const zoneIds = [
    ...new Set(
      tplList.map((t) => t.zone_id).filter(Boolean) as string[],
    ),
  ];
  const { data: zones } = zoneIds.length
    ? await (supabase as any)
        .from("qhs_zones")
        .select("*")
        .in("id", zoneIds)
    : { data: [] };

  const zoneMap = new Map(
    ((zones ?? []) as QhsZone[]).map((z) => [z.id, z]),
  );

  return list.map((inst) => {
    const template = tplMap.get(inst.template_id) as QhsTaskTemplate;
    const zone = template?.zone_id
      ? (zoneMap.get(template.zone_id) as QhsZone)
      : null;
    return { ...inst, template, zone };
  });
}

export async function fetchNonConformities(
  restaurantId: string,
  statut?: "ouverte" | "en_cours" | "cloturee",
): Promise<QhsNonConformity[]> {
  const supabase = await createClient();
  let q = (supabase as any)
    .from("qhs_nonconformities")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("date_constat", { ascending: false });
  if (statut) q = q.eq("statut", statut);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as QhsNonConformity[];
}

export async function fetchSettings(
  restaurantId: string,
): Promise<QhsSettings | null> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("qhs_settings")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (error) throw error;
  return data as QhsSettings | null;
}

export async function fetchConformiteJour(
  restaurantId: string,
  date: string,
): Promise<{ total: number; validees: number; tauxPct: number }> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("qhs_task_instances")
    .select("statut")
    .eq("restaurant_id", restaurantId)
    .eq("date_prevue", date);
  if (error) throw error;
  const list = (data ?? []) as { statut: string }[];
  const total = list.length;
  const validees = list.filter((i) => i.statut === "validee").length;
  return {
    total,
    validees,
    tauxPct: total === 0 ? 100 : Math.round((validees / total) * 100),
  };
}
