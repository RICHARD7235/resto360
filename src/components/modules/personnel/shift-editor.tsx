"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
  SHIFT_TYPE_LABELS,
  PERIOD_LABELS,
  type Shift,
  type ShiftFormData,
  type ShiftPeriod,
  type ShiftType,
  type StaffMemberWithPosition,
} from "@/types/personnel";
import {
  createShift,
  updateShift,
  deleteShift,
} from "@/app/(dashboard)/personnel/actions";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ShiftEditorProps {
  open: boolean;
  onClose: () => void;
  scheduleWeekId: string;
  shift?: Shift;
  defaultStaffMemberId?: string;
  defaultDate?: string;
  defaultPeriod?: ShiftPeriod;
  staffMembers: StaffMemberWithPosition[];
  onSave: () => void;
}

// ---------------------------------------------------------------------------
// Default form values
// ---------------------------------------------------------------------------

const DEFAULT_FORM: ShiftFormData = {
  staff_member_id: "",
  date: "",
  period: "journee",
  start_time: "10:00",
  end_time: "18:00",
  break_minutes: 30,
  shift_type: "work",
  notes: "",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShiftEditor({
  open,
  onClose,
  scheduleWeekId,
  shift,
  defaultStaffMemberId,
  defaultDate,
  defaultPeriod,
  staffMembers,
  onSave,
}: ShiftEditorProps) {
  const isEdit = Boolean(shift);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [form, setForm] = useState<ShiftFormData>(() =>
    buildInitialForm(shift, defaultStaffMemberId, defaultDate, defaultPeriod)
  );

  // Reset form when sheet opens
  useEffect(() => {
    if (open) {
      setForm(buildInitialForm(shift, defaultStaffMemberId, defaultDate, defaultPeriod));
      setConfirmDelete(false);
    }
  }, [open, shift, defaultStaffMemberId, defaultDate, defaultPeriod]);

  // ---- handlers ----

  function handleText(field: keyof ShiftFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  function handleSelect(field: keyof ShiftFormData) {
    return (value: string | null) => {
      setForm((prev) => ({ ...prev, [field]: value ?? "" }));
    };
  }

  function handleNumber(field: "break_minutes") {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: parseInt(e.target.value, 10) || 0 }));
    };
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.staff_member_id || !form.date) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setLoading(true);
    try {
      if (isEdit && shift) {
        await updateShift(shift.id, form);
        toast.success("Shift mis à jour.");
      } else {
        await createShift(scheduleWeekId, form);
        toast.success("Shift créé.");
      }
      onSave();
      onClose();
    } catch (err) {
      toast.error((err as Error).message ?? "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!shift) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setLoading(true);
    try {
      await deleteShift(shift.id);
      toast.success("Shift supprimé.");
      onSave();
      onClose();
    } catch (err) {
      toast.error((err as Error).message ?? "Erreur lors de la suppression.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="overflow-y-auto w-full sm:max-w-md">
        <SheetHeader className="pb-0">
          <SheetTitle>{isEdit ? "Modifier le shift" : "Nouveau shift"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSave} className="flex flex-col gap-4 p-4 pb-0">
          {/* Staff */}
          <div className="space-y-1.5">
            <Label htmlFor="staff_member_id">
              Employé <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.staff_member_id || null}
              onValueChange={handleSelect("staff_member_id")}
            >
              <SelectTrigger className="w-full min-h-11">
                <SelectValue placeholder="Sélectionner un employé" />
              </SelectTrigger>
              <SelectContent>
                {staffMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="date">
              Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="date"
              type="date"
              className="min-h-11"
              value={form.date}
              onChange={handleText("date")}
              required
            />
          </div>

          {/* Period */}
          <div className="space-y-1.5">
            <Label>Période</Label>
            <Select
              value={form.period || null}
              onValueChange={handleSelect("period")}
            >
              <SelectTrigger className="w-full min-h-11">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PERIOD_LABELS) as [ShiftPeriod, string][]).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Start / End time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_time">Début</Label>
              <Input
                id="start_time"
                type="time"
                className="min-h-11"
                value={form.start_time}
                onChange={handleText("start_time")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_time">Fin</Label>
              <Input
                id="end_time"
                type="time"
                className="min-h-11"
                value={form.end_time}
                onChange={handleText("end_time")}
              />
            </div>
          </div>

          {/* Break */}
          <div className="space-y-1.5">
            <Label htmlFor="break_minutes">Pause (min)</Label>
            <Input
              id="break_minutes"
              type="number"
              min={0}
              step={5}
              className="min-h-11"
              value={form.break_minutes}
              onChange={handleNumber("break_minutes")}
            />
          </div>

          {/* Shift type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={form.shift_type || null}
              onValueChange={handleSelect("shift_type")}
            >
              <SelectTrigger className="w-full min-h-11">
                <SelectValue placeholder="Type de shift" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(SHIFT_TYPE_LABELS) as [ShiftType, string][]).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              className="min-h-[80px] resize-none"
              value={form.notes}
              onChange={handleText("notes")}
              placeholder="Remarques optionnelles…"
            />
          </div>
        </form>

        <SheetFooter className="flex-col gap-2 p-4">
          <Button
            type="submit"
            className="w-full min-h-11"
            disabled={loading}
            onClick={handleSave}
          >
            {loading ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer le shift"}
          </Button>

          {isEdit && (
            <Button
              type="button"
              variant={confirmDelete ? "destructive" : "outline"}
              className="w-full min-h-11"
              disabled={loading}
              onClick={handleDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {confirmDelete ? "Confirmer la suppression" : "Supprimer"}
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            className="w-full min-h-11"
            disabled={loading}
            onClick={onClose}
          >
            Annuler
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function buildInitialForm(
  shift?: Shift,
  defaultStaffMemberId?: string,
  defaultDate?: string,
  defaultPeriod?: ShiftPeriod
): ShiftFormData {
  if (shift) {
    return {
      staff_member_id: shift.staff_member_id,
      date: shift.date,
      period: shift.period as ShiftPeriod,
      start_time: shift.start_time,
      end_time: shift.end_time,
      break_minutes: shift.break_minutes,
      shift_type: shift.shift_type as ShiftType,
      notes: shift.notes ?? "",
    };
  }
  return {
    ...DEFAULT_FORM,
    staff_member_id: defaultStaffMemberId ?? "",
    date: defaultDate ?? "",
    period: defaultPeriod ?? "journee",
  };
}
