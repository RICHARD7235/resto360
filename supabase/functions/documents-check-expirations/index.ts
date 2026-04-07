import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: docs, error } = await supabase
    .from("documents_with_status")
    .select("*")
    .not("expires_at", "is", null)
    .lte("days_until_expiry", 90);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let created = 0;
  for (const d of docs ?? []) {
    let bucket: "30d" | "60d" | "90d" | "expired";
    const days = d.days_until_expiry as number;
    if (days < 0) bucket = "expired";
    else if (days <= 30) bucket = "30d";
    else if (days <= 60) bucket = "60d";
    else bucket = "90d";

    const { data: existing } = await supabase
      .from("document_notifications")
      .select("id")
      .eq("document_id", d.id)
      .eq("notification_type", bucket)
      .maybeSingle();
    if (existing) continue;

    await supabase.from("document_notifications").insert({
      document_id: d.id,
      notification_type: bucket,
      scheduled_for: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      recipient_role: "owner,manager,admin",
      channel: "email-stub",
      payload: {
        subject: `[Resto360] Document à renouveler : ${d.title}`,
        body: `Le document "${d.title}" expire ${days < 0 ? "depuis" : "dans"} ${Math.abs(days)} jours.`,
      },
    });
    created++;
  }
  return new Response(
    JSON.stringify({ checked: docs?.length ?? 0, created }),
    { headers: { "Content-Type": "application/json" } },
  );
});
