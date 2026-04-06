"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Shift, StaffMember, Department, ShiftPeriod } from "@/types/personnel";
import {
  DEPARTMENT_LABELS,
  DEPARTMENT_COLORS,
  PERIOD_LABELS,
} from "@/types/personnel";

interface TodayScheduleProps {
  shifts: Shift[];
  staffMembers: StaffMember[];
}

function formatTime(time: string | null): string {
  if (!time) return "--:--";
  return time.slice(0, 5);
}

export function TodaySchedule({ shifts, staffMembers }: TodayScheduleProps) {
  const staffMap = new Map(staffMembers.map((s) => [s.id, s]));

  // Group work shifts by department
  const workShifts = shifts.filter((s) => s.shift_type === "work");

  const byDepartment = new Map<string, Shift[]>();
  for (const shift of workShifts) {
    const member = staffMap.get(shift.staff_member_id);
    const dept = member?.department ?? "autre";
    const existing = byDepartment.get(dept) ?? [];
    existing.push(shift);
    byDepartment.set(dept, existing);
  }

  // Sort departments by label
  const sortedDepartments = [...byDepartment.entries()].sort(([a], [b]) => {
    const labelA = DEPARTMENT_LABELS[a as Department] ?? a;
    const labelB = DEPARTMENT_LABELS[b as Department] ?? b;
    return labelA.localeCompare(labelB);
  });

  // Group shifts within a department by period
  function groupByPeriod(deptShifts: Shift[]): Map<string, Shift[]> {
    const result = new Map<string, Shift[]>();
    for (const shift of deptShifts) {
      const period = shift.period ?? "journee";
      const existing = result.get(period) ?? [];
      existing.push(shift);
      result.set(period, existing);
    }
    return result;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Planning du jour</CardTitle>
      </CardHeader>
      <CardContent>
        {workShifts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun shift programme aujourd&apos;hui.
          </p>
        ) : (
          <div className="space-y-6">
            {sortedDepartments.map(([dept, deptShifts]) => {
              const color = DEPARTMENT_COLORS[dept as Department] ?? "#6B7280";
              const label = DEPARTMENT_LABELS[dept as Department] ?? dept;
              const byPeriod = groupByPeriod(deptShifts);
              const sortedPeriods = [...byPeriod.entries()].sort(([a], [b]) => {
                const order = ["matin", "midi", "soir", "nuit", "journee"];
                return order.indexOf(a) - order.indexOf(b);
              });

              return (
                <div key={dept} className="space-y-2">
                  <Badge
                    variant="outline"
                    className="border-transparent font-semibold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {label}
                  </Badge>

                  {sortedPeriods.map(([period, periodShifts]) => (
                    <div key={period} className="ml-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        {PERIOD_LABELS[period as ShiftPeriod] ?? period}
                      </p>
                      <ul className="space-y-0.5">
                        {periodShifts.map((shift) => {
                          const member = staffMap.get(shift.staff_member_id);
                          const name = member?.full_name ?? "Inconnu";
                          return (
                            <li key={shift.id} className="text-sm">
                              {name}{" "}
                              <span className="text-muted-foreground">
                                ({formatTime(shift.start_time)}-{formatTime(shift.end_time)})
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
