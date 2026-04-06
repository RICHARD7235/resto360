"use client";

import { Briefcase, ChevronUp, ListChecks, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEPARTMENT_LABELS,
  DEPARTMENT_COLORS,
  type Department,
  type JobPosition,
} from "@/types/personnel";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PositionCardProps {
  position: JobPosition;
  /** Title of the position this role reports to (optional) */
  reportsToTitle?: string;
  onEdit: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PositionCard({ position, reportsToTitle, onEdit }: PositionCardProps) {
  const department = position.department as Department | null;
  const departmentLabel = department ? (DEPARTMENT_LABELS[department] ?? position.department) : position.department;
  const departmentColor = department ? (DEPARTMENT_COLORS[department] ?? "#6B7280") : "#6B7280";

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 shrink-0 text-muted-foreground" />
            <CardTitle className="text-base leading-tight">{position.title}</CardTitle>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 text-xs"
            style={{ borderColor: departmentColor, color: departmentColor }}
          >
            {departmentLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Reports to */}
        {reportsToTitle && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <ChevronUp className="h-4 w-4" />
            <span>Sous la responsabilité de : <strong>{reportsToTitle}</strong></span>
          </div>
        )}

        {/* Counts */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <ListChecks className="h-4 w-4" />
            <span>
              {position.responsibilities.length} responsabilité{position.responsibilities.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Wrench className="h-4 w-4" />
            <span>
              {position.required_skills.length} compétence{position.required_skills.length !== 1 ? "s" : ""} requise{position.required_skills.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Edit button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="min-h-11 w-full"
        >
          Modifier
        </Button>
      </CardContent>
    </Card>
  );
}
