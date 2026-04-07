"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Camera, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QhsTaskInstanceWithContext } from "@/lib/supabase/qhs/types";

interface TaskCardProps {
  instance: QhsTaskInstanceWithContext;
  onValidate: (id: string) => void;
}

const statutColors: Record<string, string> = {
  a_faire:      "border-l-gray-400",
  en_cours:     "border-l-blue-500",
  validee:      "border-l-green-500",
  en_retard:    "border-l-red-500",
  non_conforme: "border-l-red-700",
};

const statutLabels: Record<string, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  validee: "Validée",
  en_retard: "En retard",
  non_conforme: "Non conforme",
};

export function TaskCard({ instance, onValidate }: TaskCardProps) {
  const { template, zone } = instance;
  const isValidated = instance.statut === "validee";
  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <Card className={cn("border-l-4", statutColors[instance.statut])}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold">{template.libelle}</h3>
              {template.photo_required && (
                <Badge variant="secondary" className="gap-1">
                  <Camera className="h-3 w-3" /> Photo
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {zone?.nom ?? "—"} · {template.frequency}
              {template.produit_utilise && ` · ${template.produit_utilise}`}
            </p>
            {template.assigned_role && (
              <p className="text-xs text-muted-foreground mt-1">
                Assigné : {template.assigned_role}
              </p>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <Clock className="h-3 w-3" />
              {fmtTime(instance.creneau_debut)} → {fmtTime(instance.creneau_fin)}
              <Badge variant="outline" className="ml-2">{statutLabels[instance.statut]}</Badge>
            </div>
          </div>
          {!isValidated && (
            <Button onClick={() => onValidate(instance.id)} size="sm">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Valider
            </Button>
          )}
          {isValidated && <CheckCircle2 className="h-6 w-6 text-green-600" />}
        </div>
      </CardContent>
    </Card>
  );
}
