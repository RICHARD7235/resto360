"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEPARTMENT_LABELS,
  type Department,
  type JobPosition,
} from "@/types/personnel";
import { createJobPosition, updateJobPosition } from "@/app/(dashboard)/personnel/actions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEPARTMENTS = Object.entries(DEPARTMENT_LABELS) as [Department, string][];

// ---------------------------------------------------------------------------
// Dynamic list item component
// ---------------------------------------------------------------------------

interface DynamicListProps {
  label: string;
  items: string[];
  addLabel?: string;
  placeholder?: string;
  onChange: (items: string[]) => void;
}

function DynamicList({ label, items, addLabel = "Ajouter", placeholder, onChange }: DynamicListProps) {
  function handleChange(index: number, value: string) {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  }

  function handleRemove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function handleAdd() {
    onChange([...items, ""]);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={item}
              placeholder={placeholder}
              onChange={(e) => handleChange(index, e.target.value)}
              className="min-h-11"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemove(index)}
              className="min-h-11 min-w-11 shrink-0 text-destructive hover:bg-destructive/10"
              aria-label="Supprimer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="min-h-11 gap-1.5"
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PositionFormProps {
  open: boolean;
  /** Existing position to edit; undefined = create mode */
  position?: JobPosition;
  /** All positions for the "reports to" select */
  allPositions: JobPosition[];
  onClose: () => void;
  onSaved: () => void;
}

// ---------------------------------------------------------------------------
// Form state type
// ---------------------------------------------------------------------------

interface FormState {
  title: string;
  department: Department | "";
  responsibilities: string[];
  required_skills: string[];
  reports_to_position_id: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PositionForm({
  open,
  position,
  allPositions,
  onClose,
  onSaved,
}: PositionFormProps) {
  const isEdit = !!position;

  const defaultState = (): FormState => ({
    title: position?.title ?? "",
    department: (position?.department as Department | "") ?? "",
    responsibilities: position?.responsibilities ?? [],
    required_skills: position?.required_skills ?? [],
    reports_to_position_id: position?.reports_to_position_id ?? null,
  });

  const [form, setForm] = useState<FormState>(defaultState);
  const [saving, setSaving] = useState(false);

  // Reset form when the sheet opens/position changes
  useEffect(() => {
    if (open) setForm(defaultState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, position?.id]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Le titre du poste est obligatoire");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        department: form.department || undefined,
        responsibilities: form.responsibilities.filter((r) => r.trim()),
        required_skills: form.required_skills.filter((s) => s.trim()),
        reports_to_position_id: form.reports_to_position_id,
      };

      if (isEdit && position) {
        await updateJobPosition(position.id, payload);
        toast.success("Poste mis à jour");
      } else {
        await createJobPosition(payload);
        toast.success("Poste créé");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  // Positions available as "reports to" (exclude current position when editing)
  const reportToOptions = allPositions.filter((p) => !position || p.id !== position.id);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Modifier le poste" : "Nouveau poste"}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6 pb-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="pos-title">Titre du poste *</Label>
            <Input
              id="pos-title"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Ex : Chef de partie"
              className="min-h-11"
              required
            />
          </div>

          {/* Department */}
          <div className="space-y-2">
            <Label htmlFor="pos-department">Département</Label>
            <Select
              value={form.department || ""}
              onValueChange={(value) =>
                setField("department", (value === "__none__" ? "" : value) as Department | "")
              }
            >
              <SelectTrigger id="pos-department" className="min-h-11">
                <SelectValue placeholder="Sélectionner un département" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Aucun</SelectItem>
                {DEPARTMENTS.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reports to */}
          <div className="space-y-2">
            <Label htmlFor="pos-reports-to">Sous la responsabilité de</Label>
            <Select
              value={form.reports_to_position_id ?? "__none__"}
              onValueChange={(value) =>
                setField("reports_to_position_id", value === "__none__" ? null : value)
              }
            >
              <SelectTrigger id="pos-reports-to" className="min-h-11">
                <SelectValue placeholder="Aucune hiérarchie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Aucune hiérarchie</SelectItem>
                {reportToOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Responsibilities */}
          <DynamicList
            label="Responsabilités"
            items={form.responsibilities}
            placeholder="Ex : Gestion de la mise en place"
            addLabel="Ajouter une responsabilité"
            onChange={(items) => setField("responsibilities", items)}
          />

          {/* Required skills */}
          <DynamicList
            label="Compétences requises"
            items={form.required_skills}
            placeholder="Ex : Maîtrise des cuissons"
            addLabel="Ajouter une compétence"
            onChange={(items) => setField("required_skills", items)}
          />

          <SheetFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="min-h-11 w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="min-h-11 w-full sm:w-auto"
            >
              {saving ? "Sauvegarde…" : isEdit ? "Enregistrer" : "Créer le poste"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
