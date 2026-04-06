"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarCheck, Star, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ScheduleTemplate } from "@/types/personnel";
import {
  applyTemplate,
  setDefaultTemplate,
  deleteScheduleTemplate,
} from "@/app/(dashboard)/personnel/actions";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TemplateManagerProps {
  templates: ScheduleTemplate[];
  /** employee count per template id */
  employeeCountByTemplate?: Record<string, number>;
  onRefresh: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TemplateManager({
  templates,
  employeeCountByTemplate = {},
  onRefresh,
}: TemplateManagerProps) {
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null);
  const [weekStart, setWeekStart] = useState(() => {
    // Default to this Monday
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split("T")[0];
  });
  const [applying, setApplying] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);

  // Open apply dialog
  function handleOpenApply(template: ScheduleTemplate) {
    setSelectedTemplate(template);
    setApplyDialogOpen(true);
  }

  // Apply template to a week
  async function handleApply() {
    if (!selectedTemplate || !weekStart) return;
    setApplying(true);
    try {
      await applyTemplate(selectedTemplate.id, weekStart);
      toast.success(`Modèle "${selectedTemplate.name}" appliqué à la semaine du ${weekStart}`);
      setApplyDialogOpen(false);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'application du modèle");
    } finally {
      setApplying(false);
    }
  }

  // Set template as default
  async function handleSetDefault(template: ScheduleTemplate) {
    if (template.is_default) return;
    setSettingDefaultId(template.id);
    try {
      await setDefaultTemplate(template.id);
      toast.success(`"${template.name}" défini comme modèle par défaut`);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    } finally {
      setSettingDefaultId(null);
    }
  }

  // Delete template
  async function handleDelete(template: ScheduleTemplate) {
    if (!confirm(`Supprimer le modèle "${template.name}" ?`)) return;
    setDeletingId(template.id);
    try {
      await deleteScheduleTemplate(template.id);
      toast.success(`Modèle "${template.name}" supprimé`);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <CalendarCheck className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">Aucun modèle de planning</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Les modèles vous permettent de réutiliser un planning type chaque semaine.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => {
          const employeeCount = employeeCountByTemplate[template.id] ?? 0;
          return (
            <Card key={template.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{template.name}</CardTitle>
                  {template.is_default && (
                    <Badge variant="default" className="shrink-0 text-xs">
                      Par défaut
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Employee count */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {employeeCount} employé{employeeCount !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="min-h-11 flex-1"
                    onClick={() => handleOpenApply(template)}
                  >
                    <CalendarCheck className="mr-1.5 h-4 w-4" />
                    Appliquer
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11"
                    disabled={template.is_default || settingDefaultId === template.id}
                    onClick={() => handleSetDefault(template)}
                    title={template.is_default ? "Déjà le modèle par défaut" : "Définir par défaut"}
                  >
                    <Star
                      className="h-4 w-4"
                      fill={template.is_default ? "currentColor" : "none"}
                    />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-11 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    disabled={deletingId === template.id}
                    onClick={() => handleDelete(template)}
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Apply to week dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appliquer le modèle</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Le modèle <strong>{selectedTemplate?.name}</strong> sera appliqué à la semaine
              sélectionnée. Les créneaux existants seront remplacés.
            </p>
            <div className="space-y-2">
              <Label htmlFor="week-start">Semaine (lundi)</Label>
              <Input
                id="week-start"
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="min-h-11"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setApplyDialogOpen(false)}
              className="min-h-11"
            >
              Annuler
            </Button>
            <Button
              onClick={handleApply}
              disabled={applying || !weekStart}
              className="min-h-11"
            >
              {applying ? "Application…" : "Appliquer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
