import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  fetchTemplates,
  fetchNonConformities,
  fetchZones,
  fetchInstancesForDay,
} from "@/lib/supabase/qhs/queries";
import { getUserRestaurantId } from "@/lib/qhs/auth";
import { TemplatesTable } from "./_components/TemplatesTable";
import { NonConformitiesTable } from "./_components/NonConformitiesTable";
import { Dashboard } from "./_components/Dashboard";

export const metadata = { title: "Admin — Plan de nettoyage" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const restaurantId = await getUserRestaurantId();
  const today = new Date().toISOString().slice(0, 10);

  const [templates, library, ncs, zones, todayInstances] = await Promise.all([
    fetchTemplates(restaurantId),
    fetchTemplates(null),
    fetchNonConformities(restaurantId),
    fetchZones(restaurantId),
    fetchInstancesForDay(restaurantId, today),
  ]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin — Plan de nettoyage</h1>
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
          <TabsTrigger value="templates">
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="library">
            Bibliothèque ({library.length})
          </TabsTrigger>
          <TabsTrigger value="nc">
            Non-conformités ({ncs.filter((n) => n.statut !== "cloturee").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <Dashboard
            restaurantId={restaurantId}
            todayInstances={todayInstances}
            ncs={ncs}
          />
        </TabsContent>
        <TabsContent value="templates" className="mt-6">
          <TemplatesTable templates={templates} zones={zones} />
        </TabsContent>
        <TabsContent value="library" className="mt-6">
          <TemplatesTable
            templates={library}
            zones={zones}
            libraryMode
            restaurantId={restaurantId}
          />
        </TabsContent>
        <TabsContent value="nc" className="mt-6">
          <NonConformitiesTable ncs={ncs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
