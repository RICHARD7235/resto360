"use client";

import { useState } from "react";
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
import { createLeaveRequest } from "@/app/(dashboard)/personnel/actions";
import {
  LEAVE_TYPE_LABELS,
  type LeaveType,
  type LeaveRequestFormData,
  type StaffMemberWithPosition,
} from "@/types/personnel";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEAVE_TYPE_OPTIONS = Object.entries(LEAVE_TYPE_LABELS) as [LeaveType, string][];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LeaveRequestFormProps {
  open: boolean;
  staffMembers: StaffMemberWithPosition[];
  onClose: () => void;
  onSaved: () => void;
}

// ---------------------------------------------------------------------------
// Default form state
// ---------------------------------------------------------------------------

function defaultFormData(): LeaveRequestFormData {
  return {
    staff_member_id: "",
    leave_type: "",
    start_date: "",
    end_date: "",
    reason: "",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeaveRequestForm({
  open,
  staffMembers,
  onClose,
  onSaved,
}: LeaveRequestFormProps) {
  const [formData, setFormData] = useState<LeaveRequestFormData>(defaultFormData);
  const [loading, setLoading] = useState(false);

  function handleField<K extends keyof LeaveRequestFormData>(
    key: K,
    value: LeaveRequestFormData[K]
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.staff_member_id) {
      toast.error("Veuillez sélectionner un employé");
      return;
    }
    if (!formData.leave_type) {
      toast.error("Veuillez sélectionner un type de congé");
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      toast.error("Veuillez renseigner les dates");
      return;
    }
    if (formData.start_date > formData.end_date) {
      toast.error("La date de début doit être avant la date de fin");
      return;
    }

    setLoading(true);
    try {
      await createLeaveRequest(formData);
      toast.success("Demande de congé créée");
      setFormData(defaultFormData());
      onSaved();
      onClose();
    } catch (error) {
      toast.error("Erreur lors de la création de la demande");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setFormData(defaultFormData());
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nouvelle demande de congé</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5 px-1">
          {/* Employé */}
          <div className="space-y-1.5">
            <Label htmlFor="staff_member_id">Employé *</Label>
            <Select
              value={formData.staff_member_id}
              onValueChange={(value) => handleField("staff_member_id", value ?? "")}
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

          {/* Type de congé */}
          <div className="space-y-1.5">
            <Label htmlFor="leave_type">Type de congé *</Label>
            <Select
              value={formData.leave_type}
              onValueChange={(value) =>
                handleField("leave_type", (value ?? "") as LeaveType | "")
              }
            >
              <SelectTrigger id="leave_type" className="min-h-11">
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPE_OPTIONS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date de début */}
          <div className="space-y-1.5">
            <Label htmlFor="start_date">Date de début *</Label>
            <Input
              id="start_date"
              type="date"
              className="min-h-11"
              value={formData.start_date}
              onChange={(e) => handleField("start_date", e.target.value)}
            />
          </div>

          {/* Date de fin */}
          <div className="space-y-1.5">
            <Label htmlFor="end_date">Date de fin *</Label>
            <Input
              id="end_date"
              type="date"
              className="min-h-11"
              value={formData.end_date}
              onChange={(e) => handleField("end_date", e.target.value)}
            />
          </div>

          {/* Motif */}
          <div className="space-y-1.5">
            <Label htmlFor="reason">Motif</Label>
            <Textarea
              id="reason"
              placeholder="Motif de la demande (facultatif)"
              className="min-h-[80px] resize-none"
              value={formData.reason}
              onChange={(e) => handleField("reason", e.target.value)}
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
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
