"use client";

import { useState } from "react";
import { Circle, RectangleHorizontal, Square, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RestaurantTable } from "@/app/(dashboard)/commandes/actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EditableTable = Omit<
  RestaurantTable,
  "restaurant_id" | "created_at" | "updated_at" | "is_active"
>;

interface TableEditPanelProps {
  table: EditableTable;
  zones: string[];
  onChange: (table: EditableTable) => void;
  onDelete: (tableId: string) => void;
}

// ---------------------------------------------------------------------------
// Shape picker
// ---------------------------------------------------------------------------

const SHAPES: { value: EditableTable["shape"]; icon: typeof Square; label: string }[] = [
  { value: "square", icon: Square, label: "Carre" },
  { value: "round", icon: Circle, label: "Rond" },
  { value: "rectangle", icon: RectangleHorizontal, label: "Rectangle" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TableEditPanel({
  table,
  zones,
  onChange,
  onDelete,
}: TableEditPanelProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleField<K extends keyof EditableTable>(
    key: K,
    value: EditableTable[K]
  ) {
    onChange({ ...table, [key]: value });
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="text-sm font-semibold">Proprietes de la table</h3>

      {/* Name */}
      <div className="space-y-1">
        <Label htmlFor="table-name">Nom</Label>
        <Input
          id="table-name"
          value={table.name}
          onChange={(e) => handleField("name", e.target.value)}
          className="min-h-[44px]"
        />
      </div>

      {/* Zone */}
      <div className="space-y-1">
        <Label htmlFor="table-zone">Zone</Label>
        <Input
          id="table-zone"
          list="zone-suggestions"
          value={table.zone}
          onChange={(e) => handleField("zone", e.target.value)}
          className="min-h-[44px]"
        />
        <datalist id="zone-suggestions">
          {zones.map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
      </div>

      {/* Capacity */}
      <div className="space-y-1">
        <Label htmlFor="table-capacity">Capacite (couverts)</Label>
        <Input
          id="table-capacity"
          type="number"
          min={1}
          max={20}
          value={table.capacity}
          onChange={(e) => handleField("capacity", Math.max(1, Math.min(20, Number(e.target.value))))}
          className="min-h-[44px]"
        />
      </div>

      {/* Shape */}
      <div className="space-y-1">
        <Label>Forme</Label>
        <div className="flex gap-2">
          {SHAPES.map((s) => {
            const Icon = s.icon;
            return (
              <Button
                key={s.value}
                type="button"
                variant={table.shape === s.value ? "default" : "outline"}
                size="icon"
                className="min-h-[44px] min-w-[44px]"
                onClick={() => handleField("shape", s.value)}
                aria-label={s.label}
              >
                <Icon className="size-5" />
              </Button>
            );
          })}
        </div>
      </div>

      {/* Size */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="table-width">Largeur (1-3)</Label>
          <Input
            id="table-width"
            type="number"
            min={1}
            max={3}
            value={table.width}
            onChange={(e) => handleField("width", Math.max(1, Math.min(3, Number(e.target.value))))}
            className="min-h-[44px]"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="table-height">Hauteur (1-3)</Label>
          <Input
            id="table-height"
            type="number"
            min={1}
            max={3}
            value={table.height}
            onChange={(e) => handleField("height", Math.max(1, Math.min(3, Number(e.target.value))))}
            className="min-h-[44px]"
          />
        </div>
      </div>

      {/* Delete */}
      <div className="pt-2 border-t">
        {confirmDelete ? (
          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="min-h-[44px] flex-1"
              onClick={() => onDelete(table.id)}
            >
              Confirmer
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px] flex-1"
              onClick={() => setConfirmDelete(false)}
            >
              Annuler
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="min-h-[44px] w-full gap-2 text-destructive hover:bg-destructive/10"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" />
            Supprimer la table
          </Button>
        )}
      </div>
    </div>
  );
}
