import type { Metadata } from "next";
import { fetchInstancesForDay, fetchSettings } from "@/lib/supabase/qhs/queries";
import { getCreneauActif } from "@/lib/qhs/creneaux";
import { getUserRestaurantId } from "@/lib/qhs/auth";
import { TaskTabs } from "./_components/TaskTabs";

export const metadata: Metadata = { title: "Plan de nettoyage" };
export const dynamic = "force-dynamic";

export default async function NettoyagePage() {
  const restaurantId = await getUserRestaurantId();
  const today = new Date().toISOString().slice(0, 10);

  const [instances, settings] = await Promise.all([
    fetchInstancesForDay(restaurantId, today),
    fetchSettings(restaurantId),
  ]);

  const creneau = settings ? getCreneauActif(new Date(), settings) : null;

  const dateFr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const creneauLabel = creneau
    ? `· Créneau actuel : ${creneau.replace("_", " ")}`
    : "";

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Plan de nettoyage</h1>
        <p className="text-muted-foreground mt-1">
          {dateFr} {creneauLabel}
        </p>
      </div>
      <TaskTabs instances={instances} creneauActif={creneau} />
    </div>
  );
}
