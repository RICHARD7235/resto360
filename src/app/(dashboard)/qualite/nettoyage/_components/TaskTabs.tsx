"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TaskCard } from "./TaskCard";
import { ValidateTaskDialog } from "./ValidateTaskDialog";
import type {
  QhsTaskInstanceWithContext,
  QhsServiceCreneau,
} from "@/lib/supabase/qhs/types";

interface Props {
  instances: QhsTaskInstanceWithContext[];
  creneauActif: QhsServiceCreneau | null;
}

export function TaskTabs({ instances, creneauActif }: Props) {
  const [validating, setValidating] = useState<QhsTaskInstanceWithContext | null>(null);

  const now = new Date();

  // Tâche appartenant au créneau actuel, non encore échue, non validée
  const isCurrentCreneau = (i: QhsTaskInstanceWithContext): boolean =>
    creneauActif !== null &&
    i.template.service_creneau === creneauActif &&
    new Date(i.creneau_fin) > now &&
    i.statut !== "validee";

  // Tâche dont le créneau commence dans le futur et non validée
  const isLater = (i: QhsTaskInstanceWithContext): boolean =>
    new Date(i.creneau_debut) > now && i.statut !== "validee";

  // Tâche en retard ou non conforme
  const isLate = (i: QhsTaskInstanceWithContext): boolean =>
    i.statut === "en_retard" || i.statut === "non_conforme";

  // Tâche validée
  const isDone = (i: QhsTaskInstanceWithContext): boolean =>
    i.statut === "validee";

  const nowList = instances.filter(isCurrentCreneau);
  const later   = instances.filter(isLater);
  const late    = instances.filter(isLate);
  const done    = instances.filter(isDone);

  const onValidate = (id: string) => {
    const inst = instances.find((i) => i.id === id);
    if (inst) setValidating(inst);
  };

  return (
    <>
      <Tabs defaultValue="now">
        <TabsList>
          <TabsTrigger value="now">
            À faire maintenant ({nowList.length})
          </TabsTrigger>
          <TabsTrigger value="later">
            Plus tard ({later.length})
          </TabsTrigger>
          <TabsTrigger value="late">
            En retard{" "}
            {late.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {late.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="done">Faites ({done.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="now" className="space-y-3 mt-4">
          {nowList.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Aucune tâche pour ce créneau.
            </p>
          )}
          {nowList.map((i) => (
            <TaskCard key={i.id} instance={i} onValidate={onValidate} />
          ))}
        </TabsContent>

        <TabsContent value="later" className="space-y-3 mt-4">
          {later.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Aucune tâche à venir.
            </p>
          )}
          {later.map((i) => (
            <TaskCard key={i.id} instance={i} onValidate={onValidate} />
          ))}
        </TabsContent>

        <TabsContent value="late" className="space-y-3 mt-4">
          {late.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Aucun retard. Bravo !
            </p>
          )}
          {late.map((i) => (
            <TaskCard key={i.id} instance={i} onValidate={onValidate} />
          ))}
        </TabsContent>

        <TabsContent value="done" className="space-y-3 mt-4">
          {done.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Aucune tâche validée pour aujourd&apos;hui.
            </p>
          )}
          {done.map((i) => (
            <TaskCard key={i.id} instance={i} onValidate={onValidate} />
          ))}
        </TabsContent>
      </Tabs>

      <ValidateTaskDialog
        instance={validating}
        onClose={() => setValidating(null)}
      />
    </>
  );
}
