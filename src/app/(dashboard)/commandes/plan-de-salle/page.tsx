"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FloorPlanEditor } from "@/components/modules/commandes/floor-plan-editor";
import type { EditableTable } from "@/components/modules/commandes/table-edit-panel";
import {
  getRestaurantTables,
  upsertRestaurantTables,
  deleteRestaurantTable,
  type RestaurantTable,
} from "../actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toEditable(t: RestaurantTable): EditableTable {
  return {
    id: t.id,
    name: t.name,
    zone: t.zone,
    capacity: t.capacity,
    shape: t.shape,
    width: t.width,
    height: t.height,
    pos_x: t.pos_x,
    pos_y: t.pos_y,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function PlanDeSallePage() {
  const [tables, setTables] = useState<EditableTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

  useEffect(() => {
    getRestaurantTables()
      .then((data) => setTables(data.map(toEditable)))
      .catch((err) => {
        console.error(err);
        toast.error("Impossible de charger les tables");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(
    async (updatedTables: EditableTable[]) => {
      try {
        // Soft-delete removed tables
        const currentIds = new Set(updatedTables.map((t) => t.id));
        const removedIds = deletedIds.filter((id) => !currentIds.has(id));
        // Also detect tables that were in initial load but now removed
        const allPreviousIds = tables.map((t) => t.id);
        const newlyRemoved = allPreviousIds.filter((id) => !currentIds.has(id));
        const idsToDelete = [...new Set([...removedIds, ...newlyRemoved])];

        await Promise.all(idsToDelete.map(deleteRestaurantTable));

        // Upsert remaining
        await upsertRestaurantTables(updatedTables);

        setTables(updatedTables);
        setDeletedIds([]);
        toast.success("Plan de salle enregistre");
      } catch (err) {
        console.error(err);
        toast.error("Erreur lors de la sauvegarde");
      }
    },
    [tables, deletedIds]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="min-h-[44px] min-w-[44px]"
          render={<Link href="/commandes" />}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Editeur du plan de salle
          </h1>
          <p className="text-sm text-muted-foreground">
            Glissez les tables pour les positionner, modifiez leurs proprietes dans le panneau lateral
          </p>
        </div>
      </div>

      <FloorPlanEditor initialTables={tables} onSave={handleSave} />
    </div>
  );
}
