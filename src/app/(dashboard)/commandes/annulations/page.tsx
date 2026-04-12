"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCancellations } from "../actions";
import type { OrderCancellation } from "../actions";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AnnulationsPage() {
  const [cancellations, setCancellations] = useState<OrderCancellation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCancellations()
      .then(setCancellations)
      .catch((err) => console.error("Erreur chargement annulations:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11"
          render={<Link href="/commandes" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Historique des annulations
          </h1>
          <p className="text-muted-foreground">
            {cancellations.length} annulation{cancellations.length > 1 ? "s" : ""} enregistree{cancellations.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {cancellations.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune annulation enregistree.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Article</TableHead>
                <TableHead>Raison</TableHead>
                <TableHead>Par</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cancellations.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDate(c.cancelled_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.order_item_id ? "secondary" : "destructive"}>
                      {c.order_item_id ? "Article" : "Commande"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.table_number ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.product_name ?? "Commande entiere"}
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">
                    {c.reason}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.cancelled_by_name ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
