"use client";

import { useState, useRef } from "react";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  DEPARTMENT_LABELS,
  DEPARTMENT_COLORS,
  SHIFT_TYPE_COLORS,
  SHIFT_TYPE_LABELS,
  PERIOD_LABELS,
  type Shift,
  type StaffMemberWithPosition,
  type Department,
} from "@/types/personnel";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Timeline spans 06:00 to 24:00 = 18 hours */
const TIMELINE_START_HOUR = 6;
const TIMELINE_END_HOUR = 24;
const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR; // 18

const HOUR_LABELS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 0];

const DAYS_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const ROW_HEIGHT = 40; // px

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert "HH:MM:SS" or "HH:MM" to fractional hours */
function timeToHours(t: string): number {
  const parts = t.split(":");
  const h = parseInt(parts[0] ?? "0", 10);
  const m = parseInt(parts[1] ?? "0", 10);
  return h + m / 60;
}

/** Clamp hours within timeline range */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Convert absolute hours to percentage within timeline */
function hoursToPercent(hours: number): number {
  const clamped = clamp(hours, TIMELINE_START_HOUR, TIMELINE_END_HOUR);
  return ((clamped - TIMELINE_START_HOUR) / TIMELINE_HOURS) * 100;
}

interface ShiftLayout {
  left: number;  // %
  width: number; // %
}

function computeShiftLayout(shift: Shift): ShiftLayout {
  const startH = timeToHours(shift.start_time);
  const endH = timeToHours(shift.end_time);

  // Handle overnight shifts (e.g. 22:00 → 02:00): end < start → add 24
  const effectiveEnd = endH <= startH ? endH + 24 : endH;

  const left = hoursToPercent(startH);
  const right = hoursToPercent(Math.min(effectiveEnd, TIMELINE_END_HOUR));
  return { left, width: Math.max(right - left, 0.5) };
}

interface GroupedStaff {
  department: string;
  label: string;
  color: string;
  members: StaffMemberWithPosition[];
}

function groupByDepartment(members: StaffMemberWithPosition[]): GroupedStaff[] {
  const deptOrder: string[] = ["cuisine", "salle", "bar", "direction", "communication"];
  const map = new Map<string, StaffMemberWithPosition[]>();

  for (const m of members) {
    const dept = m.department ?? "autre";
    if (!map.has(dept)) map.set(dept, []);
    map.get(dept)!.push(m);
  }

  const deptsSorted = [
    ...deptOrder.filter((d) => map.has(d)),
    ...[...map.keys()].filter((d) => !deptOrder.includes(d)),
  ];

  return deptsSorted
    .map((dept) => {
      const deptMembers = map.get(dept);
      if (!deptMembers) return null;
      return {
        department: dept,
        label: DEPARTMENT_LABELS[dept as Department] ?? dept,
        color: DEPARTMENT_COLORS[dept as Department] ?? "#6B7280",
        members: deptMembers,
      };
    })
    .filter((g): g is GroupedStaff => g !== null);
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipData {
  shift: Shift;
  memberName: string;
  x: number;
  y: number;
}

function ShiftTooltip({ data }: { data: TooltipData }) {
  const { shift, memberName } = data;
  const label = SHIFT_TYPE_LABELS[shift.shift_type as keyof typeof SHIFT_TYPE_LABELS] ?? shift.shift_type;
  const period = PERIOD_LABELS[shift.period as keyof typeof PERIOD_LABELS] ?? shift.period;
  const bgColor = SHIFT_TYPE_COLORS[shift.shift_type as keyof typeof SHIFT_TYPE_COLORS] ?? "#F3F4F6";

  return (
    <div
      className="fixed z-50 pointer-events-none rounded-lg border border-border bg-background shadow-lg px-3 py-2 text-sm min-w-[180px]"
      style={{ left: data.x + 12, top: data.y - 8 }}
    >
      <div className="font-semibold text-foreground truncate">{memberName}</div>
      <div className="flex items-center gap-1.5 mt-1">
        <span
          className="inline-block w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: bgColor }}
        />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <div className="text-muted-foreground mt-0.5">
        {shift.start_time.slice(0, 5)} – {shift.end_time.slice(0, 5)}
      </div>
      <div className="text-muted-foreground">{period}</div>
      {shift.notes && (
        <div className="text-muted-foreground text-xs mt-1 italic truncate">{shift.notes}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShiftBar
// ---------------------------------------------------------------------------

interface ShiftBarProps {
  shift: Shift;
  memberName: string;
  onTooltipShow: (data: TooltipData | null) => void;
}

function ShiftBar({ shift, memberName, onTooltipShow }: ShiftBarProps) {
  const bgColor = SHIFT_TYPE_COLORS[shift.shift_type as keyof typeof SHIFT_TYPE_COLORS] ?? "#F3F4F6";
  const layout = computeShiftLayout(shift);
  const timeLabel = `${shift.start_time.slice(0, 5)}–${shift.end_time.slice(0, 5)}`;

  // Only show label if bar is wide enough (> 8%)
  const showLabel = layout.width >= 8;

  return (
    <div
      className="absolute inset-y-1 rounded border border-black/10 cursor-default transition-brightness hover:brightness-95 select-none overflow-hidden flex items-center px-1"
      style={{
        left: `${layout.left}%`,
        width: `${layout.width}%`,
        backgroundColor: bgColor,
        minWidth: "4px",
      }}
      onMouseEnter={(e) =>
        onTooltipShow({ shift, memberName, x: e.clientX, y: e.clientY })
      }
      onMouseMove={(e) =>
        onTooltipShow({ shift, memberName, x: e.clientX, y: e.clientY })
      }
      onMouseLeave={() => onTooltipShow(null)}
    >
      {showLabel && (
        <span className="text-xs font-medium text-foreground/80 truncate leading-none whitespace-nowrap">
          {timeLabel}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScheduleTimeline
// ---------------------------------------------------------------------------

export interface ScheduleTimelineProps {
  shifts: Shift[];
  staffMembers: StaffMemberWithPosition[];
  weekStart: Date;
  selectedDay?: string;
}

export function ScheduleTimeline({
  shifts,
  staffMembers,
  weekStart,
  selectedDay: initialSelectedDay,
}: ScheduleTimelineProps) {
  // Build the 7 days of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    const dateStr = format(d, "yyyy-MM-dd");
    const todayStr = format(new Date(), "yyyy-MM-dd");
    return {
      date: dateStr,
      label: DAYS_SHORT[i],
      dayNum: format(d, "d", { locale: fr }),
      isToday: dateStr === todayStr,
    };
  });

  // Default selected day: today if in the week, otherwise first day
  const todayInWeek = weekDays.find((d) => d.isToday);
  const defaultDay = initialSelectedDay ?? todayInWeek?.date ?? weekDays[0]!.date;

  const [activeDay, setActiveDay] = useState(defaultDay);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  // Index shifts by [staff_member_id] for the active day
  const dayShifts = shifts.filter((s) => s.date === activeDay);
  const shiftsByMember: Record<string, Shift[]> = {};
  for (const s of dayShifts) {
    if (!shiftsByMember[s.staff_member_id]) shiftsByMember[s.staff_member_id] = [];
    shiftsByMember[s.staff_member_id].push(s);
  }

  const groups = groupByDepartment(staffMembers);

  // Compute hour tick positions
  const ticks = HOUR_LABELS.map((h) => {
    const effectiveH = h === 0 ? 24 : h;
    return {
      label: `${h}h`,
      percent: ((effectiveH - TIMELINE_START_HOUR) / TIMELINE_HOURS) * 100,
    };
  });

  const NAME_COL_WIDTH = 160; // px

  if (staffMembers.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Aucun employé trouvé.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Day selector tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {weekDays.map((d) => (
          <button
            key={d.date}
            onClick={() => setActiveDay(d.date)}
            className={[
              "flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors min-w-[56px] min-h-[52px] border",
              activeDay === d.date
                ? "bg-primary text-primary-foreground border-primary"
                : d.isToday
                ? "border-primary/40 text-primary bg-primary/5 hover:bg-primary/10"
                : "border-border text-muted-foreground hover:bg-muted/50 bg-background",
            ].join(" ")}
          >
            <span className="text-xs">{d.label}</span>
            <span className="text-base font-semibold leading-tight">{d.dayNum}</span>
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <div style={{ minWidth: NAME_COL_WIDTH + 600 }}>
          {/* Time axis row */}
          <div
            className="flex border-b border-border bg-muted/40"
            style={{ height: 36 }}
          >
            {/* Name column spacer */}
            <div
              className="flex-shrink-0 border-r border-border"
              style={{ width: NAME_COL_WIDTH }}
            />
            {/* Ticks */}
            <div className="relative flex-1">
              {ticks.map((tick) => (
                <div
                  key={tick.label}
                  className="absolute top-0 bottom-0 flex items-center"
                  style={{ left: `${tick.percent}%` }}
                >
                  <div className="h-full border-l border-border/60" />
                  <span className="text-xs text-muted-foreground ml-1 select-none whitespace-nowrap">
                    {tick.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Department groups */}
          {groups.map((group) => (
            <div key={group.department}>
              {/* Department separator */}
              <div
                className="flex items-center px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: group.color }}
              >
                <span>{group.label}</span>
              </div>

              {/* Staff rows */}
              {group.members.map((member) => {
                const memberShifts = shiftsByMember[member.id] ?? [];
                return (
                  <div
                    key={member.id}
                    className="flex border-b border-border/50 hover:bg-muted/20 transition-colors"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {/* Name column */}
                    <div
                      className="flex-shrink-0 flex flex-col justify-center px-3 border-r border-border bg-background"
                      style={{ width: NAME_COL_WIDTH }}
                    >
                      <span className="text-sm font-medium truncate leading-tight">
                        {member.full_name}
                      </span>
                      {member.job_position_title && (
                        <span className="text-xs text-muted-foreground truncate leading-tight">
                          {member.job_position_title}
                        </span>
                      )}
                    </div>

                    {/* Shift bars area */}
                    <div className="relative flex-1">
                      {/* Hour grid lines */}
                      {ticks.map((tick) => (
                        <div
                          key={tick.label}
                          className="absolute top-0 bottom-0 border-l border-border/30"
                          style={{ left: `${tick.percent}%` }}
                        />
                      ))}

                      {/* Shift bars */}
                      {memberShifts.map((shift) => (
                        <ShiftBar
                          key={shift.id}
                          shift={shift}
                          memberName={member.full_name}
                          onTooltipShow={setTooltip}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip (portal-like via fixed position) */}
      {tooltip && <ShiftTooltip data={tooltip} />}
    </div>
  );
}
