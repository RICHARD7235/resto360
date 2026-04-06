"use client";

import { useState, useEffect, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Tables } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReservationFormData = {
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  date: string;
  time: string;
  end_time: string;
  party_size: number;
  type: string;
  table_number: string;
  notes: string;
  status?: string;
};

interface ReservationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation?: Tables<"reservations"> | null;
  onSubmit: (data: ReservationFormData) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusConfig: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmee",
  seated: "En salle",
  completed: "Terminee",
  cancelled: "Annulee",
  no_show: "No-show",
};

const typeLabels: Record<string, string> = {
  restaurant: "Restaurant",
  salle: "Location salle",
  seminaire: "Seminaire",
};

const EMPTY_FORM: ReservationFormData = {
  customer_name: "",
  customer_phone: "",
  customer_email: "",
  date: "",
  time: "",
  end_time: "",
  party_size: 2,
  type: "restaurant",
  table_number: "",
  notes: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReservationForm({
  open,
  onOpenChange,
  reservation,
  onSubmit,
}: ReservationFormProps) {
  const isEditing = Boolean(reservation);

  const [formData, setFormData] = useState<ReservationFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  // Reset form when dialog opens / reservation changes
  useEffect(() => {
    if (!open) return;

    if (reservation) {
      setFormData({
        customer_name: reservation.customer_name,
        customer_phone: reservation.customer_phone ?? "",
        customer_email: reservation.customer_email ?? "",
        date: reservation.date,
        time: reservation.time.slice(0, 5),
        end_time: reservation.end_time?.slice(0, 5) ?? "",
        party_size: reservation.party_size,
        type: reservation.type ?? "restaurant",
        table_number: reservation.table_number ?? "",
        notes: reservation.notes ?? "",
        status: reservation.status ?? "pending",
      });
    } else {
      setFormData(EMPTY_FORM);
    }
  }, [open, reservation]);

  function updateField<K extends keyof ReservationFormData>(
    key: K,
    value: ReservationFormData[K],
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la reservation" : "Nouvelle reservation"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifiez les informations de la reservation."
              : "Remplissez les informations pour creer une reservation."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ---- Client info ---- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="customer_name">
                Nom du client <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customer_name"
                required
                value={formData.customer_name}
                onChange={(e) => updateField("customer_name", e.target.value)}
                placeholder="Ex : Jean Dupont"
                className="min-h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customer_phone">Telephone</Label>
              <Input
                id="customer_phone"
                type="tel"
                value={formData.customer_phone}
                onChange={(e) => updateField("customer_phone", e.target.value)}
                placeholder="06 12 34 56 78"
                className="min-h-11"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="customer_email">Email</Label>
              <Input
                id="customer_email"
                type="email"
                value={formData.customer_email}
                onChange={(e) => updateField("customer_email", e.target.value)}
                placeholder="jean@exemple.fr"
                className="min-h-11"
              />
            </div>
          </div>

          {/* ---- Date & Time ---- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => updateField("date", e.target.value)}
                className="min-h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="time">
                Heure <span className="text-destructive">*</span>
              </Label>
              <Input
                id="time"
                type="time"
                required
                value={formData.time}
                onChange={(e) => updateField("time", e.target.value)}
                className="min-h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="end_time">Heure de fin</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => updateField("end_time", e.target.value)}
                className="min-h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="party_size">
                Couverts <span className="text-destructive">*</span>
              </Label>
              <Input
                id="party_size"
                type="number"
                required
                min={1}
                value={formData.party_size}
                onChange={(e) =>
                  updateField("party_size", Math.max(1, Number(e.target.value)))
                }
                className="min-h-11"
              />
            </div>
          </div>

          {/* ---- Type, Table, Status ---- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => updateField("type", v ?? "restaurant")}
              >
                <SelectTrigger className="w-full min-h-11" id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="table_number">Table</Label>
              <Input
                id="table_number"
                value={formData.table_number}
                onChange={(e) => updateField("table_number", e.target.value)}
                placeholder="Ex : T4"
                className="min-h-11"
              />
            </div>

            {isEditing && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="status">Statut</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => updateField("status", v ?? "pending")}
                >
                  <SelectTrigger className="w-full min-h-11" id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* ---- Notes ---- */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Allergies, occasion speciale, demandes particulieres..."
              rows={3}
            />
          </div>

          {/* ---- Footer ---- */}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button type="submit" className="min-h-11" disabled={loading}>
              {loading && <Loader2 className="animate-spin" />}
              {isEditing ? "Modifier la reservation" : "Creer la reservation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
