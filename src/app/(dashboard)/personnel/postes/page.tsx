"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PersonnelTabs } from "@/components/modules/personnel/personnel-tabs";
import { PositionCard } from "@/components/modules/personnel/position-card";
import { PositionForm } from "@/components/modules/personnel/position-form";
import { getJobPositions } from "../actions";
import {
  DEPARTMENT_LABELS,
  type JobPosition,
  type Department,
} from "@/types/personnel";

export default function PostesPage() {
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<JobPosition | undefined>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getJobPositions();
      setPositions(data);
    } catch (error) {
      console.error("Erreur chargement postes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleCreate() {
    setEditingPosition(undefined);
    setFormOpen(true);
  }

  function handleEdit(position: JobPosition) {
    setEditingPosition(position);
    setFormOpen(true);
  }

  // Build lookup map for "reports to" position titles
  const positionTitleById = Object.fromEntries(
    positions.map((p) => [p.id, p.title])
  );

  // Group positions by department
  const grouped = positions.reduce<Record<string, JobPosition[]>>((acc, pos) => {
    const dept = pos.department || "__other__";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(pos);
    return acc;
  }, {});

  const departmentOrder: string[] = [
    "cuisine",
    "salle",
    "bar",
    "direction",
    "communication",
    "__other__",
  ];

  const sortedDepts = [
    ...departmentOrder.filter((d) => grouped[d]),
    ...Object.keys(grouped).filter(
      (d) => !departmentOrder.includes(d) && grouped[d]
    ),
  ];

  function getDeptLabel(dept: string): string {
    if (dept === "__other__") return "Autre";
    return DEPARTMENT_LABELS[dept as Department] ?? dept;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personnel & Planning</h1>
          <p className="text-muted-foreground">Gestion du personnel, plannings et pointages</p>
        </div>
        <Button onClick={handleCreate} className="min-h-11 gap-2">
          <Plus className="h-4 w-4" />
          Nouveau poste
        </Button>
      </div>

      <PersonnelTabs />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-lg font-medium">Aucun poste défini</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Créez vos premiers postes pour structurer votre équipe.
          </p>
          <Button onClick={handleCreate} className="mt-4 min-h-11 gap-2">
            <Plus className="h-4 w-4" />
            Nouveau poste
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDepts.map((dept) => (
            <section key={dept}>
              <h2 className="mb-4 text-lg font-semibold">{getDeptLabel(dept)}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[dept].map((pos) => (
                  <PositionCard
                    key={pos.id}
                    position={pos}
                    reportsToTitle={
                      pos.reports_to_position_id
                        ? positionTitleById[pos.reports_to_position_id]
                        : undefined
                    }
                    onEdit={() => handleEdit(pos)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <PositionForm
        open={formOpen}
        position={editingPosition}
        allPositions={positions}
        onClose={() => setFormOpen(false)}
        onSaved={fetchData}
      />
    </div>
  );
}
