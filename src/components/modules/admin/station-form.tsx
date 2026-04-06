"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/types/database.types";

type Station = Tables<"preparation_stations">;

const PRESET_COLORS = [
  "#E85D26", "#3B82F6", "#10B981", "#F59E0B",
  "#8B5CF6", "#EC4899", "#6B7280", "#EF4444",
];

interface StationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: Station | null;
  onSubmit: (data: { name: string; color: string; display_order: number }) => void;
  loading?: boolean;
  nextOrder: number;
}

export function StationForm({
  open,
  onOpenChange,
  station,
  onSubmit,
  loading = false,
  nextOrder,
}: StationFormProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (station) {
      setName(station.name);
      setColor(station.color ?? PRESET_COLORS[0]);
    } else {
      setName("");
      setColor(PRESET_COLORS[0]);
    }
  }, [station, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      color,
      display_order: station?.display_order ?? nextOrder,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {station ? "Modifier le poste" : "Nouveau poste"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="station-name">Nom du poste *</Label>
            <Input
              id="station-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Grill, Desserts..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Couleur</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`size-8 rounded-full border-2 transition-all ${
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Couleur ${c}`}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !name}>
              {loading ? "Enregistrement..." : station ? "Mettre a jour" : "Creer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
