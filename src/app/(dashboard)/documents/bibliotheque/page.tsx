import { requirePermission } from "@/lib/rbac";
import { getCategories, getDocumentsWithStatus } from "@/lib/documents/queries";
import { BibliothequeClient } from "./_bibliotheque-client";

export default async function BibliothequePage() {
  const { restaurantId } = await requirePermission("m12_documents", "read");
  const [categories, documents] = await Promise.all([
    getCategories(),
    getDocumentsWithStatus(restaurantId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bibliothèque</h1>
        <p className="text-muted-foreground">
          Tous vos documents de conformité, classés par catégorie
        </p>
      </div>
      <BibliothequeClient categories={categories} documents={documents} />
    </div>
  );
}
