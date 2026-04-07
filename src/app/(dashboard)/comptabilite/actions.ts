"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AccountingSnapshot } from "@/types/comptabilite";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, any, any>;

async function createUntypedClient(): Promise<UntypedClient> {
  return (await createClient()) as unknown as UntypedClient;
}

export async function getAllSnapshots(): Promise<AccountingSnapshot[]> {
  const supabase = await createUntypedClient();
  const { data, error } = await supabase
    .from("accounting_snapshots")
    .select("*")
    .order("period", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AccountingSnapshot[];
}
