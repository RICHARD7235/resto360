import { Construction } from "lucide-react";

export default function StockPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Stock & Achats</h1>
        <p className="text-muted-foreground">Gestion des stocks, inventaires et commandes fournisseurs</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24">
        <Construction className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-lg font-semibold text-muted-foreground">Module à venir</h2>
        <p className="text-sm text-muted-foreground/70 mt-1">Ce module sera bientôt disponible.</p>
      </div>
    </div>
  );
}
