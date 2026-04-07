import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getReviews,
  computeKpis,
  computeTrend,
} from "@/lib/reviews/queries";
import { extractKeywords } from "@/lib/reviews/keywords";
import { ReviewKpiCards } from "@/components/reviews/kpi-cards";
import { RatingDistributionChart } from "@/components/reviews/distribution-chart";
import { RatingTrendChart } from "@/components/reviews/trend-chart";
import { TopKeywordsCloud } from "@/components/reviews/keywords-cloud";
import { ReviewList } from "@/components/reviews/review-list";
import { ReviewCard } from "@/components/reviews/review-card";
import { ImportReviewsDialog } from "@/components/reviews/import-dialog";
import { NewReviewForm } from "@/components/reviews/new-review-form";

export default async function AvisPage() {
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

  const reviews = await getReviews(profile.restaurant_id);
  const kpis = computeKpis(reviews);
  const trend30 = computeTrend(reviews, 30);
  const trend90 = computeTrend(reviews, 90);
  const keywords = extractKeywords(reviews);
  const toHandle = reviews.filter((r) => r.status === "to_handle");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Avis & E-réputation</h1>
          <p className="text-muted-foreground">
            Suivi des avis clients et gestion de l&apos;e-réputation
          </p>
        </div>
        <div className="flex gap-2">
          <NewReviewForm />
          <ImportReviewsDialog />
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="all">Tous les avis</TabsTrigger>
          <TabsTrigger value="to-handle">
            À traiter
            {kpis.toHandleCount > 0 && (
              <span className="ml-2 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                {kpis.toHandleCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ReviewKpiCards kpis={kpis} />
          <div className="grid gap-6 lg:grid-cols-2">
            <RatingDistributionChart kpis={kpis} />
            <RatingTrendChart trend30={trend30} trend90={trend90} />
          </div>
          <TopKeywordsCloud keywords={keywords} />
        </TabsContent>

        <TabsContent value="all">
          <ReviewList reviews={reviews} />
        </TabsContent>

        <TabsContent value="to-handle" className="space-y-4">
          {toHandle.length === 0 ? (
            <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
              Aucun avis à traiter. Bravo !
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {toHandle.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
