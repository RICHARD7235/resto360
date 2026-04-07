import Link from "next/link";
import { Library, CalendarDays, BookMarked, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireQhsAdmin } from "@/lib/qhs/auth";
import { getKpis, getExpiringSoon } from "@/lib/documents/queries";
import { KpiCards } from "./_components/kpi-cards";
import { AlertsList } from "./_components/alerts-list";
import { triggerExpirationCheck } from "./actions";

export default async function DocumentsPage() {
  const { restaurantId } = await requireQhsAdmin();
  const [kpis, expiring] = await Promise.all([
    getKpis(restaurantId),
    getExpiringSoon(restaurantId, 90),
  ]);

  async function handleCheck() {
    "use server";
    await triggerExpirationCheck();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Documents & Conformité
          </h1>
          <p className="text-muted-foreground">
            Coffre-fort numérique, échéances et registres légaux
          </p>
        </div>
        <form action={handleCheck}>
          <Button type="submit" variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Lancer la vérification d&apos;échéances
          </Button>
        </form>
      </div>

      <KpiCards kpis={kpis} />

      <div className="flex flex-wrap gap-3">
        <Button render={<Link href="/documents/bibliotheque" />}>
          <Library className="mr-2 h-4 w-4" />
          Bibliothèque
        </Button>
        <Button
          variant="outline"
          render={<Link href="/documents/calendrier" />}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          Calendrier
        </Button>
        <Button
          variant="outline"
          render={<Link href="/documents/registres" />}
        >
          <BookMarked className="mr-2 h-4 w-4" />
          Registres légaux
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">
          Alertes — documents à renouveler (90 prochains jours)
        </h2>
        <AlertsList documents={expiring} />
      </div>
    </div>
  );
}
