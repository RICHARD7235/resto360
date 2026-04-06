"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DEPARTMENT_LABELS,
  DEPARTMENT_COLORS,
  type Department,
  type StaffMemberWithPosition,
} from "@/types/personnel";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StaffCardProps {
  staff: StaffMemberWithPosition;
  onEdit: () => void;
  onToggleActive: () => void;
}

// ---------------------------------------------------------------------------
// Helper: generate initials from full name
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StaffCard({ staff, onEdit, onToggleActive }: StaffCardProps) {
  const initials = getInitials(staff.full_name);
  const department = staff.department as Department | null;
  const departmentLabel = department ? DEPARTMENT_LABELS[department] : null;
  const departmentColor = department ? DEPARTMENT_COLORS[department] : "#6B7280";

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Avatar + info */}
          <div className="flex items-center gap-4">
            {/* Avatar circle */}
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white text-lg font-semibold"
              style={{ backgroundColor: departmentColor }}
              aria-hidden="true"
            >
              {initials}
            </div>

            {/* Name / position / department */}
            <div>
              <h2 className="text-xl font-bold leading-tight">{staff.full_name}</h2>

              {staff.job_position_title && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {staff.job_position_title}
                </p>
              )}

              {departmentLabel && (
                <Badge
                  variant="outline"
                  className="mt-1.5 text-xs"
                  style={{ borderColor: departmentColor, color: departmentColor }}
                >
                  {departmentLabel}
                </Badge>
              )}
            </div>
          </div>

          {/* Right: Status + actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={staff.is_active ? "default" : "secondary"}>
              {staff.is_active ? "Actif" : "Inactif"}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="min-h-11"
            >
              Modifier
            </Button>

            <Button
              variant={staff.is_active ? "destructive" : "default"}
              size="sm"
              onClick={onToggleActive}
              className="min-h-11"
            >
              {staff.is_active ? "Désactiver" : "Activer"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
