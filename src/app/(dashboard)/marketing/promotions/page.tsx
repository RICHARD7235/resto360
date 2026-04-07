import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getPromotions } from "@/lib/marketing/queries";
import { NewPromotionForm } from "@/components/marketing/new-promotion-form";
import { PromotionList } from "@/components/marketing/promotion-list";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function PromotionsPage() {
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
  if (!profile?.restaurant_id) redirect("/connexion");

  const promotions = await getPromotions(profile.restaurant_id);
  const today = new Date().toISOString().slice(0, 10);
  const active = promotions.filter(
    (p) => p.is_active && p.starts_at <= today && p.ends_at >= today,
  );
  const totalUses = promotions.reduce((acc, p) => acc + p.uses_count, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/marketing">
            <Button variant="ghost" size="sm" className="mb-2 -ml-3">
              <ArrowLeft className="mr-1 h-4 w-4" /> Marketing
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Promotions</h1>
          <p className="text-muted-foreground">
            {active.length} code{active.length > 1 ? "s" : ""} actif
            {active.length > 1 ? "s" : ""} · {totalUses.toLocaleString("fr-FR")}{" "}
            utilisation{totalUses > 1 ? "s" : ""} au total
          </p>
        </div>
        <NewPromotionForm />
      </div>

      <PromotionList promotions={promotions} />
    </div>
  );
}
