"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StationForm } from "./station-form";
import type { Tables } from "@/types/database.types";

type Station = Tables<"preparation_stations">;

interface StationListProps {
  stations: Station[];
  onCreateStation: (data: { name: string; color: string; display_order: number }) => Promise<void>;
  onUpdateStation: (id: string, updates: { name?: string; color?: string; is_active?: boolean }) => Promise<void>;
  onDeleteStation: (id: string) => Promise<void>;
}

export function StationList({
  stations,
  onCreateStation,
  onUpdateStation,
  onDeleteStation,
}: StationListProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: { name: string; color: string; display_order: number }) {
    setLoading(true);
    try {
      if (editingStation) {
        await onUpdateStation(editingStation.id, { name: data.name, color: data.color });
      } else {
        await onCreateStation(data);
      }
      setFormOpen(false);
      setEditingStation(null);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(station: Station) {
    setEditingStation(station);
    setFormOpen(true);
  }

  function handleCreate() {
    setEditingStation(null);
    setFormOpen(true);
  }

  async function handleToggle(station: Station) {
    await onUpdateStation(station.id, { is_active: !(station.is_active ?? true) });
  }

  async function handleDelete(station: Station) {
    if (!confirm(`Supprimer le poste "${station.name}" ?`)) return;
    await onDeleteStation(station.id);
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Postes de preparation</CardTitle>
          <Button className="min-h-11 gap-2" onClick={handleCreate}>
            <Plus className="h-4 w-4" />
            Nouveau poste
          </Button>
        </CardHeader>
        <CardContent>
          {stations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucun poste configure
            </p>
          ) : (
            <div className="space-y-2">
              {stations.map((station) => (
                <div
                  key={station.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div
                    className="size-4 shrink-0 rounded-full"
                    style={{ backgroundColor: station.color ?? "#6B7280" }}
                  />
                  <span className="flex-1 font-medium">{station.name}</span>
                  <Switch
                    checked={station.is_active ?? true}
                    onCheckedChange={() => handleToggle(station)}
                    aria-label={`Activer ${station.name}`}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-[44px] min-w-[44px]"
                    onClick={() => handleEdit(station)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-[44px] min-w-[44px] text-destructive"
                    onClick={() => handleDelete(station)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <StationForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingStation(null);
        }}
        station={editingStation}
        onSubmit={handleSubmit}
        loading={loading}
        nextOrder={stations.length + 1}
      />
    </>
  );
}
