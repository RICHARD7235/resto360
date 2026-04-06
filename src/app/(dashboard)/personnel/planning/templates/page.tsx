"use client";

import { useEffect, useState, useCallback } from "react";
import { PersonnelTabs } from "@/components/modules/personnel/personnel-tabs";
import { TemplateManager } from "@/components/modules/personnel/template-manager";
import { getScheduleTemplates, getTemplateShifts } from "../../actions";
import type { ScheduleTemplate } from "@/types/personnel";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [employeeCountByTemplate, setEmployeeCountByTemplate] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getScheduleTemplates();
      setTemplates(data);

      // Compute distinct employee count per template
      const counts: Record<string, number> = {};
      await Promise.all(
        data.map(async (t) => {
          try {
            const shifts = await getTemplateShifts(t.id);
            const uniqueStaff = new Set(shifts.map((s) => s.staff_member_id));
            counts[t.id] = uniqueStaff.size;
          } catch {
            counts[t.id] = 0;
          }
        })
      );
      setEmployeeCountByTemplate(counts);
    } catch (error) {
      console.error("Erreur chargement modèles:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Personnel & Planning</h1>
        <p className="text-muted-foreground">Gestion du personnel, plannings et pointages</p>
      </div>

      <PersonnelTabs />

      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Modèles de planning</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Créez et appliquez des plannings types pour gagner du temps chaque semaine.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <TemplateManager
            templates={templates}
            employeeCountByTemplate={employeeCountByTemplate}
            onRefresh={fetchData}
          />
        )}
      </div>
    </div>
  );
}
