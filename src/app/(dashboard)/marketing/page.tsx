import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getCampaigns,
  getPromotions,
  getSocialPosts,
  computeMarketingKpis,
} from "@/lib/marketing/queries";
import { MarketingKpiCards } from "@/components/marketing/kpi-cards";
import { CampaignPerformanceChart } from "@/components/marketing/campaign-performance-chart";
import { MarketingActivityFeed } from "@/components/marketing/activity-feed";
import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, Ticket, Share2, ArrowRight } from "lucide-react";

export default async function MarketingPage() {
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

  const [campaigns, promotions, posts] = await Promise.all([
    getCampaigns(profile.restaurant_id),
    getPromotions(profile.restaurant_id),
    getSocialPosts(profile.restaurant_id),
  ]);
  const kpis = computeMarketingKpis(campaigns, promotions, posts);

  const quickLinks = [
    {
      href: "/marketing/campagnes",
      label: "Campagnes",
      desc: "Emails et SMS",
      icon: <Megaphone className="h-5 w-5 text-[#E85D26]" />,
    },
    {
      href: "/marketing/promotions",
      label: "Promotions",
      desc: "Codes promo",
      icon: <Ticket className="h-5 w-5 text-[#F39C12]" />,
    },
    {
      href: "/marketing/reseaux",
      label: "Réseaux sociaux",
      desc: "Calendrier éditorial",
      icon: <Share2 className="h-5 w-5 text-pink-600" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Marketing & Réseaux</h1>
        <p className="text-muted-foreground">
          Pilotez vos campagnes, promotions et présence en ligne
        </p>
      </div>

      <MarketingKpiCards kpis={kpis} />

      <div className="grid gap-4 md:grid-cols-3">
        {quickLinks.map((q) => (
          <Link key={q.href} href={q.href}>
            <Card className="transition hover:border-[#E85D26]/50 hover:shadow-sm">
              <CardContent className="flex items-center gap-4 p-5">
                <div className="rounded-lg bg-muted/50 p-3">{q.icon}</div>
                <div className="flex-1">
                  <p className="font-semibold">{q.label}</p>
                  <p className="text-xs text-muted-foreground">{q.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CampaignPerformanceChart campaigns={campaigns} />
        <MarketingActivityFeed
          campaigns={campaigns}
          promotions={promotions}
          posts={posts}
        />
      </div>
    </div>
  );
}
