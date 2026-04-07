import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSocialPosts } from "@/lib/marketing/queries";
import { NewSocialPostForm } from "@/components/marketing/new-social-post-form";
import { SocialPostList } from "@/components/marketing/social-post-list";
import { SocialCalendar } from "@/components/marketing/social-calendar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function ReseauxPage() {
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

  const posts = await getSocialPosts(profile.restaurant_id);
  const scheduled = posts.filter((p) => p.status === "scheduled");
  const published = posts.filter((p) => p.status === "published");
  const drafts = posts.filter((p) => p.status === "draft");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/marketing">
            <Button variant="ghost" size="sm" className="mb-2 -ml-3">
              <ArrowLeft className="mr-1 h-4 w-4" /> Marketing
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Réseaux sociaux</h1>
          <p className="text-muted-foreground">
            Planifiez vos publications Instagram et Facebook
          </p>
        </div>
        <NewSocialPostForm />
      </div>

      <Tabs defaultValue="calendar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="calendar">Calendrier</TabsTrigger>
          <TabsTrigger value="scheduled">
            Planifiés ({scheduled.length})
          </TabsTrigger>
          <TabsTrigger value="published">
            Publiés ({published.length})
          </TabsTrigger>
          <TabsTrigger value="drafts">Brouillons ({drafts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <SocialCalendar posts={posts} />
        </TabsContent>
        <TabsContent value="scheduled">
          <SocialPostList posts={scheduled} />
        </TabsContent>
        <TabsContent value="published">
          <SocialPostList posts={published} />
        </TabsContent>
        <TabsContent value="drafts">
          <SocialPostList posts={drafts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
