"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { StationList } from "@/components/modules/admin/station-list";
import {
  getStations,
  createStation,
  updateStation,
  deleteStation,
} from "./actions";
import type { Tables } from "@/types/database.types";

type Station = Tables<"preparation_stations">;

export default function AdminOperationnellePage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStations = useCallback(async () => {
    try {
      const data = await getStations();
      setStations(data);
    } catch (error) {
      console.error("Erreur chargement postes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  async function handleCreate(data: { name: string; color: string; display_order: number }) {
    try {
      await createStation(data);
      await fetchStations();
      toast.success("Poste créé");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors de la création";
      toast.error(message);
    }
  }

  async function handleUpdate(id: string, updates: { name?: string; color?: string; is_active?: boolean }) {
    try {
      await updateStation(id, updates);
      await fetchStations();
      toast.success("Poste mis à jour");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors de la mise à jour";
      toast.error(message);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteStation(id);
      await fetchStations();
      toast.success("Poste supprimé");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors de la suppression";
      toast.error(message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Administration opérationnelle
        </h1>
        <p className="text-muted-foreground">
          Configuration des postes de préparation et du service
        </p>
      </div>

      <StationList
        stations={stations}
        onCreateStation={handleCreate}
        onUpdateStation={handleUpdate}
        onDeleteStation={handleDelete}
      />
    </div>
  );
}
