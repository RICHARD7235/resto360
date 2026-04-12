import { requirePermission } from "@/lib/rbac";
import { getCategories, getDocumentsWithStatus } from "@/lib/documents/queries";
import { CalendrierClient } from "./_calendrier-client";

export default async function CalendrierPage() {
  const { restaurantId } = await requirePermission("m12_documents", "read");
  const [categories, allDocs] = await Promise.all([
    getCategories(),
    getDocumentsWithStatus(restaurantId),
  ]);
  const documents = allDocs.filter((d) => d.expires_at !== null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Calendrier des renouvellements
        </h1>
        <p className="text-muted-foreground">
          Visualisez les échéances de vos documents mois par mois
        </p>
      </div>
      <CalendrierClient categories={categories} documents={documents} />
    </div>
  );
}
