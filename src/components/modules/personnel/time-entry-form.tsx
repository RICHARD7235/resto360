"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
import {
  createTimeEntry,
  updateTimeEntry,
} from "@/app/(dashboard)/personnel/actions";
import {
  PERIOD_LABELS,
  type ShiftPeriod,
  type TimeEntry,
  type TimeEntryFormData,
  type StaffMemberWithPosition,
} from "@/types/personnel";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS = Object.entries(PERIOD_LABELS) as [ShiftPeriod, string][];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TimeEntryFormProps {
  open: boolean;
  staffMembers: StaffMemberWithPosition[];
  /** Pass an existing TimeEntry to enable edit mode. */
  editEntry?: TimeEntry | null;
  /** Pre-fill the date field (ISO YYYY-MM-DD). */
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

// ---------------------------------------------------------------------------
// Default form state
// ---------------------------------------------------------------------------

function defaultFormData(date?: string): TimeEntryFormData {
  return {
    staff_member_id: "",
    date: date ?? "",
    period: "midi",
    clock_in: "",
    clock_out: "",
    break_minutes: 0,
    notes: "",
  };
}

function entryToFormData(entry: TimeEntry): TimeEntryFormData {
  return {
    staff_member_id: entry.staff_member_id,
    date: entry.date,
    period: entry.period as ShiftPeriod,
    clock_in: entry.clock_in?.slice(0, 5) ?? "",
    clock_out: entry.clock_out?.slice(0, 5) ?? "",
    break_minutes: entry.break_minutes ?? 0,
    notes: entry.notes ?? "",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TimeEntryForm({
  open,
  staffMembers,
  editEntry,
  defaultDate,
  onClose,
  onSaved,
}: TimeEntryFormProps) {
  const isEditing = editEntry != null;

  const [formData, setFormData] = useState<TimeEntryFormData>(
    () => (isEditing ? entryToFormData(editEntry) : defaultFormData(defaultDate))
  );
  const [loading, setLoading] = useState(false);

  // Sync form when editEntry or defaultDate changes
  useEffect(() => {
    if (open) {
      setFormData(
        isEditing ? entryToFormData(editEntry) : defaultFormData(defaultDate)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editEntry, defaultDate]);

  function handleField<K extends keyof TimeEntryFormData>(
    key: K,
    value: TimeEntryFormData[K]
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.staff_member_id) {
      toast.error("Veuillez sélectionner un employé");
      return;
    }
    if (!formData.date) {
      toast.error("Veuillez renseigner la date");
      return;
    }
    if (!formData.clock_in) {
      toast.error("Veuillez renseigner l'heure d'entrée");
      return;
    }

    setLoading(true);
    try {
      if (isEditing) {
        await updateTimeEntry(editEntry.id, formData);
        toast.success("Pointage mis à jour");
      } else {
        await createTimeEntry(formData);
        toast.success("Pointage créé");
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error(
        isEditing
          ? "Erreur lors de la mise à jour du pointage"
          : "Erreur lors de la création du pointage"
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setFormData(defaultFormData(defaultDate));
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Modifier le pointage" : "Nouveau pointage"}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5 px-1">
          {/* Employé */}
          <div className="space-y-1.5">
            <Label htmlFor="staff_member_id">Employé *</Label>
            <Select
              value={formData.staff_member_id}
              onValueChange={(value) =>
                handleField("staff_member_id", value ?? "")
              }
            >
              <SelectTrigger id="staff_member_id" className="min-h-11">
                <SelectValue placeholder="Sélectionner un employé" />
              </SelectTrigger>
              <SelectContent>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              className="min-h-11"
              value={formData.date}
              onChange={(e) => handleField("date", e.target.value)}
            />
          </div>

          {/* Période */}
          <div className="space-y-1.5">
            <Label htmlFor="period">Période *</Label>
            <Select
              value={formData.period}
              onValueChange={(value) =>
                handleField("period", (value ?? "midi") as ShiftPeriod)
              }
            >
              <SelectTrigger id="period" className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Heure d'entrée */}
          <div className="space-y-1.5">
            <Label htmlFor="clock_in">Heure d&apos;entrée *</Label>
            <Input
              id="clock_in"
              type="time"
              className="min-h-11"
              value={formData.clock_in}
              onChange={(e) => handleField("clock_in", e.target.value)}
            />
          </div>

          {/* Heure de sortie */}
          <div className="space-y-1.5">
            <Label htmlFor="clock_out">Heure de sortie</Label>
            <Input
              id="clock_out"
              type="time"
              className="min-h-11"
              value={formData.clock_out}
              onChange={(e) => handleField("clock_out", e.target.value)}
            />
          </div>

          {/* Pause */}
          <div className="space-y-1.5">
            <Label htmlFor="break_minutes">Pause (minutes)</Label>
            <Input
              id="break_minutes"
              type="number"
              min={0}
              step={5}
              className="min-h-11"
              value={formData.break_minutes}
              onChange={(e) =>
                handleField("break_minutes", parseInt(e.target.value, 10) || 0)
              }
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Observations (facultatif)"
              className="min-h-[80px] resize-none"
              value={formData.notes ?? ""}
              onChange={(e) => handleField("notes", e.target.value)}
            />
          </div>

          <SheetFooter className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1"
              onClick={handleClose}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="min-h-11 flex-1"
              disabled={loading}
            >
              {loading
                ? "Enregistrement..."
                : isEditing
                ? "Mettre à jour"
                : "Enregistrer"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
