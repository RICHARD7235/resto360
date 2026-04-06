"use client";

import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus } from "lucide-react";
import {
  DEPARTMENT_LABELS,
  DEPARTMENT_COLORS,
  SHIFT_TYPE_COLORS,
  SHIFT_TYPE_LABELS,
  type Shift,
  type ShiftPeriod,
  type StaffMemberWithPosition,
  type Department,
} from "@/types/personnel";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScheduleGridProps {
  shifts: Shift[];
  staffMembers: StaffMemberWithPosition[];
  weekStart: Date;
  scheduleWeekId: string;
  onShiftClick: (shift: Shift) => void;
  onCellClick: (staffMemberId: string, date: string, period: ShiftPeriod) => void;
}

interface GroupedStaff {
  department: string;
  label: string;
  color: string;
  members: StaffMemberWithPosition[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByDepartment(members: StaffMemberWithPosition[]): GroupedStaff[] {
  const deptOrder: (Department | string)[] = [
    "cuisine",
    "salle",
    "bar",
    "direction",
    "communication",
  ];
  const map = new Map<string, StaffMemberWithPosition[]>();

  for (const m of members) {
    const dept = m.department ?? "autre";
    if (!map.has(dept)) map.set(dept, []);
    map.get(dept)!.push(m);
  }

  const groups: GroupedStaff[] = [];
  const deptsSorted = [
    ...deptOrder.filter((d) => map.has(d)),
    ...[...map.keys()].filter((d) => !deptOrder.includes(d)),
  ];

  for (const dept of deptsSorted) {
    const deptMembers = map.get(dept);
    if (!deptMembers) continue;
    groups.push({
      department: dept,
      label: DEPARTMENT_LABELS[dept as Department] ?? dept,
      color: DEPARTMENT_COLORS[dept as Department] ?? "#6B7280",
      members: deptMembers,
    });
  }

  return groups;
}

// ---------------------------------------------------------------------------
// ShiftPill
// ---------------------------------------------------------------------------

interface ShiftPillProps {
  shift: Shift;
  onClick: (shift: Shift) => void;
}

function ShiftPill({ shift, onClick }: ShiftPillProps) {
  const bgColor = SHIFT_TYPE_COLORS[shift.shift_type as keyof typeof SHIFT_TYPE_COLORS] ?? "#F3F4F6";
  const label = SHIFT_TYPE_LABELS[shift.shift_type as keyof typeof SHIFT_TYPE_LABELS] ?? shift.shift_type;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(shift);
      }}
      className="w-full text-left rounded px-1 py-0.5 text-xs leading-tight truncate hover:brightness-95 transition-all border border-black/10"
      style={{ backgroundColor: bgColor }}
      title={`${label} — ${shift.start_time}-${shift.end_time}`}
    >
      <span className="font-medium truncate block">
        {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// DayCell
// ---------------------------------------------------------------------------

interface DayCellProps {
  staffMemberId: string;
  date: string;
  shifts: Shift[];
  onShiftClick: (shift: Shift) => void;
  onCellClick: (staffMemberId: string, date: string, period: ShiftPeriod) => void;
}

function DayCell({ staffMemberId, date, shifts, onShiftClick, onCellClick }: DayCellProps) {
  const midiShifts = shifts.filter((s) => s.period === "midi");
  const soirShifts = shifts.filter((s) => s.period === "soir");
  const journeeShifts = shifts.filter((s) => s.period === "journee");
  const hasShifts = shifts.length > 0;

  return (
    <td
      className="border border-border p-0 align-top min-w-[90px] relative group"
      style={{ minHeight: "60px" }}
    >
      <div className="flex flex-col h-full min-h-[60px]">
        {/* Journée spans full cell */}
        {journeeShifts.length > 0 ? (
          <div className="flex flex-col gap-0.5 p-1 flex-1">
            {journeeShifts.map((s) => (
              <ShiftPill key={s.id} shift={s} onClick={onShiftClick} />
            ))}
          </div>
        ) : (
          <>
            {/* Top half: midi */}
            <div
              className="flex flex-col gap-0.5 p-1 flex-1 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => onCellClick(staffMemberId, date, "midi")}
            >
              {midiShifts.map((s) => (
                <ShiftPill key={s.id} shift={s} onClick={onShiftClick} />
              ))}
            </div>
            {/* Bottom half: soir */}
            <div
              className="flex flex-col gap-0.5 p-1 flex-1 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => onCellClick(staffMemberId, date, "soir")}
            >
              {soirShifts.map((s) => (
                <ShiftPill key={s.id} shift={s} onClick={onShiftClick} />
              ))}
            </div>
          </>
        )}

        {/* Add button on hover if no shifts */}
        {!hasShifts && (
          <button
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
            onClick={() => onCellClick(staffMemberId, date, "journee")}
            aria-label="Ajouter un shift"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </td>
  );
}

// ---------------------------------------------------------------------------
// ScheduleGrid
// ---------------------------------------------------------------------------

export function ScheduleGrid({
  shifts,
  staffMembers,
  weekStart,
  onShiftClick,
  onCellClick,
}: ScheduleGridProps) {
  const groups = groupByDepartment(staffMembers);

  // Build 7 dates for the week
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return {
      date: format(d, "yyyy-MM-dd"),
      label: `${DAYS_SHORT[i]} ${format(d, "d", { locale: fr })}`,
      isToday: format(d, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"),
    };
  });

  // Index shifts by [staff_member_id][date]
  const shiftIndex: Record<string, Record<string, Shift[]>> = {};
  for (const shift of shifts) {
    if (!shiftIndex[shift.staff_member_id]) shiftIndex[shift.staff_member_id] = {};
    if (!shiftIndex[shift.staff_member_id][shift.date]) {
      shiftIndex[shift.staff_member_id][shift.date] = [];
    }
    shiftIndex[shift.staff_member_id][shift.date].push(shift);
  }

  if (staffMembers.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Aucun employé trouvé.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-muted/50">
            {/* Sticky name column header */}
            <th className="sticky left-0 z-10 bg-muted/50 border border-border px-3 py-2 text-left font-medium text-muted-foreground min-w-[160px]">
              Employé
            </th>
            {weekDates.map(({ date, label, isToday }) => (
              <th
                key={date}
                className={`border border-border px-2 py-2 text-center font-medium min-w-[90px] ${
                  isToday ? "bg-primary/10 text-primary" : "text-muted-foreground"
                }`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <>
              {/* Department separator row */}
              <tr key={`dept-${group.department}`}>
                <td
                  colSpan={8}
                  className="px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: group.color }}
                >
                  {group.label}
                </td>
              </tr>

              {/* Staff rows */}
              {group.members.map((member) => (
                <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                  {/* Name cell */}
                  <td className="sticky left-0 z-10 bg-background border border-border px-3 py-2 font-medium text-sm whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="truncate max-w-[140px]">{member.full_name}</span>
                      {member.job_position_title && (
                        <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                          {member.job_position_title}
                        </span>
                      )}
                    </div>
                  </td>
                  {weekDates.map(({ date }) => (
                    <DayCell
                      key={date}
                      staffMemberId={member.id}
                      date={date}
                      shifts={shiftIndex[member.id]?.[date] ?? []}
                      onShiftClick={onShiftClick}
                      onCellClick={onCellClick}
                    />
                  ))}
                </tr>
              ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
