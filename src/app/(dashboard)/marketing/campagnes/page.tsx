import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCampaigns, getSegments } from "@/lib/marketing/queries";
import { NewCampaignForm } from "@/components/marketing/new-campaign-form";
import { CampaignList } from "@/components/marketing/campaign-list";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function CampagnesPage() {
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

  const [campaigns, segments] = await Promise.all([
    getCampaigns(profile.restaurant_id),
    getSegments(profile.restaurant_id),
  ]);

  const drafts = campaigns.filter((c) => c.status === "draft");
  const scheduled = campaigns.filter((c) => c.status === "scheduled");
  const sent = campaigns.filter((c) => c.status === "sent");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/marketing">
            <Button variant="ghost" size="sm" className="mb-2 -ml-3">
              <ArrowLeft className="mr-1 h-4 w-4" /> Marketing
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Campagnes</h1>
          <p className="text-muted-foreground">
            Créez et suivez vos campagnes email et SMS
          </p>
        </div>
        <NewCampaignForm segments={segments} />
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">Toutes ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="draft">Brouillons ({drafts.length})</TabsTrigger>
          <TabsTrigger value="scheduled">
            Planifiées ({scheduled.length})
          </TabsTrigger>
          <TabsTrigger value="sent">Envoyées ({sent.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <CampaignList campaigns={campaigns} segments={segments} />
        </TabsContent>
        <TabsContent value="draft">
          <CampaignList campaigns={drafts} segments={segments} />
        </TabsContent>
        <TabsContent value="scheduled">
          <CampaignList campaigns={scheduled} segments={segments} />
        </TabsContent>
        <TabsContent value="sent">
          <CampaignList campaigns={sent} segments={segments} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
