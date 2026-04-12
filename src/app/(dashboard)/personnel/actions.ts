"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { requireActionPermission } from "@/lib/rbac";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  StaffMember,
  StaffMemberWithPosition,
  StaffFormData,
  JobPosition,
  ScheduleWeek,
  Shift,
  ShiftFormData,
  ScheduleTemplate,
  TemplateShift,
  LeaveBalance,
  LeaveRequest,
  LeaveRequestFormData,
  TimeEntry,
  TimeEntryFormData,
  PayrollAdvance,
  PayrollAdvanceFormData,
  StaffDocument,
  StaffDocumentFormData,
} from "@/types/personnel";

// ---------------------------------------------------------------------------
// Untyped Supabase client helper
// The personnel tables are not yet in database.types.ts (generated types).
// We cast to SupabaseClient<any,any,any> so .from("new_table") compiles.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = SupabaseClient<any, any, any>;

async function createUntypedClient(): Promise<UntypedClient> {
  return (await createClient()) as unknown as UntypedClient;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StaffFilters {
  department?: string;
  isActive?: boolean;
  search?: string;
}

export interface LeaveRequestFilters {
  staffMemberId?: string;
  status?: string;
  leaveType?: string;
}

export interface TimeEntryFilters {
  staffMemberId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface StaffDocumentFilters {
  staffMemberId?: string;
  documentType?: string;
}

export interface PersonnelDashboard {
  activeStaffCount: number;
  pendingLeaveRequests: number;
  todayShifts: number;
  expiringDocuments: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getUserRestaurantId(): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id")
    .eq("id", user.id)
    .single();

  if (!profile?.restaurant_id) {
    throw new Error("Aucun restaurant associe a votre compte.");
  }

  return profile.restaurant_id;
}

/**
 * Get all active staff member IDs for the current restaurant.
 * Used to scope queries on tables that don't have restaurant_id directly.
 */
async function getRestaurantStaffIds(): Promise<string[]> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "read");
  const supabase = await createUntypedClient();

  const { data, error } = await supabase
    .from("staff_members")
    .select("id")
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(
      `Erreur lors du chargement des employes : ${error.message}`
    );
  }

  return (data ?? []).map((row: { id: string }) => row.id);
}

// ---------------------------------------------------------------------------
// Staff Members — Queries
// ---------------------------------------------------------------------------

export async function getStaffMembers(
  filters: StaffFilters = {}
): Promise<StaffMemberWithPosition[]> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "read");
  const supabase = await createUntypedClient();

  let query = supabase
    .from("staff_members")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("full_name", { ascending: true });

  if (filters.department) {
    query = query.eq("department", filters.department);
  }

  if (filters.isActive !== undefined) {
    query = query.eq("is_active", filters.isActive);
  }

  if (filters.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Erreur lors du chargement du personnel : ${error.message}`
    );
  }

  const members = (data ?? []) as unknown as StaffMember[];

  // Batch-fetch positions and managers to avoid N+1
  const positionIds = [
    ...new Set(members.map((m) => m.job_position_id).filter(Boolean)),
  ] as string[];
  const managerIds = [
    ...new Set(members.map((m) => m.manager_id).filter(Boolean)),
  ] as string[];

  let positionsMap: Record<string, string> = {};
  let managersMap: Record<string, string> = {};

  if (positionIds.length > 0) {
    const { data: positions } = await supabase
      .from("job_positions")
      .select("id, title")
      .in("id", positionIds);

    positionsMap = Object.fromEntries(
      (positions ?? []).map((p: { id: string; title: string }) => [
        p.id,
        p.title,
      ])
    );
  }

  if (managerIds.length > 0) {
    const { data: managers } = await supabase
      .from("staff_members")
      .select("id, full_name")
      .in("id", managerIds);

    managersMap = Object.fromEntries(
      (managers ?? []).map((m: { id: string; full_name: string }) => [
        m.id,
        m.full_name,
      ])
    );
  }

  return members.map((m) => ({
    ...m,
    job_position_title: m.job_position_id
      ? positionsMap[m.job_position_id]
      : undefined,
    manager_name: m.manager_id ? managersMap[m.manager_id] : undefined,
  }));
}

export async function getStaffMember(
  id: string
): Promise<StaffMemberWithPosition | null> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "read");
  const supabase = await createUntypedClient();

  const { data, error } = await supabase
    .from("staff_members")
    .select("*")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(
      `Erreur lors du chargement de l'employe : ${error.message}`
    );
  }

  const member = data as unknown as StaffMember;

  let jobPositionTitle: string | undefined;
  let managerName: string | undefined;

  if (member.job_position_id) {
    const { data: pos } = await supabase
      .from("job_positions")
      .select("title")
      .eq("id", member.job_position_id)
      .single();

    jobPositionTitle = (pos as { title: string } | null)?.title;
  }

  if (member.manager_id) {
    const { data: mgr } = await supabase
      .from("staff_members")
      .select("full_name")
      .eq("id", member.manager_id)
      .single();

    managerName = (mgr as { full_name: string } | null)?.full_name;
  }

  return {
    ...member,
    job_position_title: jobPositionTitle,
    manager_name: managerName,
  };
}

// ---------------------------------------------------------------------------
// Staff Members — Mutations
// ---------------------------------------------------------------------------

export async function createStaffMember(
  data: StaffFormData
): Promise<StaffMember> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  const insertData: Record<string, unknown> = {
    restaurant_id: restaurantId,
    full_name: data.full_name,
    role: data.role || null,
    email: data.email || null,
    phone: data.phone || null,
    department: data.department || null,
    job_position_id: data.job_position_id || null,
    manager_id: data.manager_id || null,
    contract_type: data.contract_type || null,
    contract_hours: data.contract_hours,
    hourly_rate: data.hourly_rate,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    birth_date: data.birth_date || null,
    address: data.address || null,
    social_security_number: data.social_security_number
      ? `***********${data.social_security_number.slice(-5)}`
      : null,
    emergency_contact_name: data.emergency_contact_name || null,
    emergency_contact_phone: data.emergency_contact_phone || null,
    is_active: data.is_active,
  };

  const { data: member, error } = await supabase
    .from("staff_members")
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Erreur lors de la creation de l'employe : ${error.message}`
    );
  }

  return member as unknown as StaffMember;
}

export async function updateStaffMember(
  id: string,
  data: Partial<StaffFormData>
): Promise<StaffMember> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  // Build update object only with defined fields
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.full_name !== undefined) updateData.full_name = data.full_name;
  if (data.role !== undefined) updateData.role = data.role || null;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.department !== undefined)
    updateData.department = data.department || null;
  if (data.job_position_id !== undefined)
    updateData.job_position_id = data.job_position_id || null;
  if (data.manager_id !== undefined)
    updateData.manager_id = data.manager_id || null;
  if (data.contract_type !== undefined)
    updateData.contract_type = data.contract_type || null;
  if (data.contract_hours !== undefined)
    updateData.contract_hours = data.contract_hours;
  if (data.hourly_rate !== undefined) updateData.hourly_rate = data.hourly_rate;
  if (data.start_date !== undefined)
    updateData.start_date = data.start_date || null;
  if (data.end_date !== undefined) updateData.end_date = data.end_date || null;
  if (data.birth_date !== undefined)
    updateData.birth_date = data.birth_date || null;
  if (data.address !== undefined) updateData.address = data.address || null;
  if (data.social_security_number !== undefined)
    updateData.social_security_number = data.social_security_number
      ? `***********${data.social_security_number.slice(-5)}`
      : null;
  if (data.emergency_contact_name !== undefined)
    updateData.emergency_contact_name =
      data.emergency_contact_name || null;
  if (data.emergency_contact_phone !== undefined)
    updateData.emergency_contact_phone =
      data.emergency_contact_phone || null;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  const { data: member, error } = await supabase
    .from("staff_members")
    .update(updateData)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Erreur lors de la mise a jour de l'employe : ${error.message}`
    );
  }

  return member as unknown as StaffMember;
}

export async function toggleStaffActive(
  id: string,
  isActive: boolean
): Promise<void> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  const { error } = await supabase
    .from("staff_members")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(
      `Erreur lors du changement de statut de l'employe : ${error.message}`
    );
  }
}

// ---------------------------------------------------------------------------
// Job Positions — Queries & Mutations
// ---------------------------------------------------------------------------

export async function getJobPositions(): Promise<JobPosition[]> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "read");
  const supabase = await createUntypedClient();

  const { data, error } = await supabase
    .from("job_positions")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("title", { ascending: true });

  if (error) {
    throw new Error(
      `Erreur lors du chargement des postes : ${error.message}`
    );
  }

  return (data ?? []) as unknown as JobPosition[];
}

export async function createJobPosition(input: {
  title: string;
  department?: string;
  description?: string;
  min_hourly_rate?: number | null;
  max_hourly_rate?: number | null;
  responsibilities?: string[];
  required_skills?: string[];
  reports_to_position_id?: string | null;
}): Promise<JobPosition> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  const { data, error } = await supabase
    .from("job_positions")
    .insert({
      restaurant_id: restaurantId,
      title: input.title,
      department: input.department || null,
      description: input.description || null,
      min_hourly_rate: input.min_hourly_rate ?? null,
      max_hourly_rate: input.max_hourly_rate ?? null,
      responsibilities: input.responsibilities ?? [],
      required_skills: input.required_skills ?? [],
      reports_to_position_id: input.reports_to_position_id ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Erreur lors de la creation du poste : ${error.message}`
    );
  }

  return data as unknown as JobPosition;
}

export async function updateJobPosition(
  id: string,
  input: {
    title?: string;
    department?: string;
    description?: string;
    min_hourly_rate?: number | null;
    max_hourly_rate?: number | null;
    is_active?: boolean;
    responsibilities?: string[];
    required_skills?: string[];
    reports_to_position_id?: string | null;
  }
): Promise<JobPosition> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updateData.title = input.title;
  if (input.department !== undefined)
    updateData.department = input.department || null;
  if (input.description !== undefined)
    updateData.description = input.description || null;
  if (input.min_hourly_rate !== undefined)
    updateData.min_hourly_rate = input.min_hourly_rate;
  if (input.max_hourly_rate !== undefined)
    updateData.max_hourly_rate = input.max_hourly_rate;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;
  if (input.responsibilities !== undefined)
    updateData.responsibilities = input.responsibilities;
  if (input.required_skills !== undefined)
    updateData.required_skills = input.required_skills;
  if (input.reports_to_position_id !== undefined)
    updateData.reports_to_position_id = input.reports_to_position_id;

  const { data, error } = await supabase
    .from("job_positions")
    .update(updateData)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Erreur lors de la mise a jour du poste : ${error.message}`
    );
  }

  return data as unknown as JobPosition;
}

// ---------------------------------------------------------------------------
// Schedule Weeks — Queries & Mutations
// ---------------------------------------------------------------------------

export async function getScheduleWeek(
  weekStart: string
): Promise<ScheduleWeek | null> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "read");
  const supabase = await createUntypedClient();

  const { data, error } = await supabase
    .from("schedule_weeks")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("week_start", weekStart)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(
      `Erreur lors du chargement de la semaine : ${error.message}`
    );
  }

  return data as unknown as ScheduleWeek;
}

export async function createScheduleWeek(
  weekStart: string
): Promise<ScheduleWeek> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  const { data, error } = await supabase
    .from("schedule_weeks")
    .insert({
      restaurant_id: restaurantId,
      week_start: weekStart,
      status: "draft",
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Erreur lors de la creation de la semaine : ${error.message}`
    );
  }

  return data as unknown as ScheduleWeek;
}

export async function publishScheduleWeek(id: string): Promise<void> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  const { error } = await supabase
    .from("schedule_weeks")
    .update({
      status: "published",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(
      `Erreur lors de la publication du planning : ${error.message}`
    );
  }
}

// ---------------------------------------------------------------------------
// Shifts — Queries & Mutations
// ---------------------------------------------------------------------------

export async function getShiftsForWeek(
  scheduleWeekId: string
): Promise<Shift[]> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "read");
  const supabase = await createUntypedClient();

  // Verify schedule_week belongs to this restaurant
  const { data: week, error: weekError } = await supabase
    .from("schedule_weeks")
    .select("id")
    .eq("id", scheduleWeekId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (weekError || !week) {
    throw new Error("Semaine introuvable ou acces refuse.");
  }

  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .eq("schedule_week_id", scheduleWeekId)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(
      `Erreur lors du chargement des shifts : ${error.message}`
    );
  }

  return (data ?? []) as unknown as Shift[];
}

export async function createShift(
  scheduleWeekId: string,
  data: ShiftFormData
): Promise<Shift> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  // Verify schedule_week belongs to this restaurant
  const { data: week, error: weekError } = await supabase
    .from("schedule_weeks")
    .select("id")
    .eq("id", scheduleWeekId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (weekError || !week) {
    throw new Error("Semaine introuvable ou acces refuse.");
  }

  const { data: shift, error } = await supabase
    .from("shifts")
    .insert({
      schedule_week_id: scheduleWeekId,
      staff_member_id: data.staff_member_id,
      date: data.date,
      period: data.period,
      start_time: data.start_time,
      end_time: data.end_time,
      break_minutes: data.break_minutes,
      shift_type: data.shift_type,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Erreur lors de la creation du shift : ${error.message}`
    );
  }

  return shift as unknown as Shift;
}

export async function updateShift(
  id: string,
  data: Partial<ShiftFormData>
): Promise<Shift> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  // Verify the shift belongs to a schedule_week of this restaurant
  const { data: existingShift, error: shiftError } = await supabase
    .from("shifts")
    .select("schedule_week_id")
    .eq("id", id)
    .single();

  if (shiftError || !existingShift) {
    throw new Error("Shift introuvable.");
  }

  const { data: week, error: weekError } = await supabase
    .from("schedule_weeks")
    .select("id")
    .eq("id", existingShift.schedule_week_id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (weekError || !week) {
    throw new Error("Shift introuvable ou acces refuse.");
  }

  const updateData: Record<string, unknown> = {};

  if (data.staff_member_id !== undefined)
    updateData.staff_member_id = data.staff_member_id;
  if (data.date !== undefined) updateData.date = data.date;
  if (data.period !== undefined) updateData.period = data.period;
  if (data.start_time !== undefined) updateData.start_time = data.start_time;
  if (data.end_time !== undefined) updateData.end_time = data.end_time;
  if (data.break_minutes !== undefined)
    updateData.break_minutes = data.break_minutes;
  if (data.shift_type !== undefined) updateData.shift_type = data.shift_type;
  if (data.notes !== undefined) updateData.notes = data.notes || null;

  const { data: shift, error } = await supabase
    .from("shifts")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Erreur lors de la mise a jour du shift : ${error.message}`
    );
  }

  return shift as unknown as Shift;
}

export async function deleteShift(id: string): Promise<void> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "delete");
  const supabase = await createUntypedClient();

  // Verify the shift belongs to a schedule_week of this restaurant
  const { data: existingShift, error: shiftError } = await supabase
    .from("shifts")
    .select("schedule_week_id")
    .eq("id", id)
    .single();

  if (shiftError || !existingShift) {
    throw new Error("Shift introuvable.");
  }

  const { data: week, error: weekError } = await supabase
    .from("schedule_weeks")
    .select("id")
    .eq("id", existingShift.schedule_week_id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (weekError || !week) {
    throw new Error("Shift introuvable ou acces refuse.");
  }

  const { error } = await supabase
    .from("shifts")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(
      `Erreur lors de la suppression du shift : ${error.message}`
    );
  }
}

// ---------------------------------------------------------------------------
// Schedule Templates — Queries & Mutations
// ---------------------------------------------------------------------------

export async function getScheduleTemplates(): Promise<ScheduleTemplate[]> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "read");
  const supabase = await createUntypedClient();

  const { data, error } = await supabase
    .from("schedule_templates")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(
      `Erreur lors du chargement des modeles : ${error.message}`
    );
  }

  return (data ?? []) as unknown as ScheduleTemplate[];
}

export async function getTemplateShifts(
  templateId: string
): Promise<TemplateShift[]> {
  const supabase = await createUntypedClient();

  // Ensure the template belongs to the current restaurant
  const { restaurantId } = await requireActionPermission("m07_personnel", "read");
  const { data: template, error: templateError } = await supabase
    .from("schedule_templates")
    .select("id")
    .eq("id", templateId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (templateError || !template) {
    throw new Error("Modele introuvable ou acces refuse.");
  }

  const { data, error } = await supabase
    .from("template_shifts")
    .select("*")
    .eq("template_id", templateId)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(
      `Erreur lors du chargement des shifts du modele : ${error.message}`
    );
  }

  return (data ?? []) as unknown as TemplateShift[];
}

export async function applyTemplate(
  templateId: string,
  weekStart: string
): Promise<ScheduleWeek> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  // 1. Get or create the schedule week
  let week = await getScheduleWeek(weekStart);
  if (!week) {
    week = await createScheduleWeek(weekStart);
  }

  // 2. Delete existing shifts for this week
  const { error: deleteError } = await supabase
    .from("shifts")
    .delete()
    .eq("schedule_week_id", week.id);

  if (deleteError) {
    throw new Error(
      `Erreur lors de la suppression des shifts existants : ${deleteError.message}`
    );
  }

  // 3. Fetch template shifts
  const templateShifts = await getTemplateShifts(templateId);

  if (templateShifts.length === 0) {
    return week;
  }

  // 4. Convert template_shifts to shifts (day_of_week: 1=Mon, 7=Sun)
  const weekStartDate = new Date(weekStart);
  const newShifts: Array<Record<string, unknown>> = [];

  for (const ts of templateShifts) {
    const shiftDate = new Date(weekStartDate);
    shiftDate.setDate(weekStartDate.getDate() + (ts.day_of_week - 1));
    const shiftDateStr = shiftDate.toISOString().split("T")[0];

    newShifts.push({
      schedule_week_id: week.id,
      staff_member_id: ts.staff_member_id,
      date: shiftDateStr,
      period: ts.period,
      start_time: ts.start_time,
      end_time: ts.end_time,
      break_minutes: ts.break_minutes,
      shift_type: "work",
    });
  }

  if (newShifts.length > 0) {
    const { error: insertError } = await supabase
      .from("shifts")
      .insert(newShifts);

    if (insertError) {
      throw new Error(
        `Erreur lors de l'application du modele : ${insertError.message}`
      );
    }
  }

  return week;
}

// ---------------------------------------------------------------------------
// Leave Balances — Queries
// ---------------------------------------------------------------------------

export async function getLeaveBalances(
  year?: number
): Promise<LeaveBalance[]> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "read");
  const supabase = await createUntypedClient();

  // leave_balances has no restaurant_id — filter via staff_members
  const { data: staffIds } = await supabase
    .from("staff_members")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true);

  const ids = ((staffIds ?? []) as Array<{ id: string }>).map((s) => s.id);
  if (ids.length === 0) return [];

  let query = supabase
    .from("leave_balances")
    .select("*")
    .in("staff_member_id", ids);

  if (year) {
    query = query.eq("year", year);
  }

  const { data, error } = await query.order("year", { ascending: false });

  if (error) {
    throw new Error(
      `Erreur lors du chargement des soldes de conges : ${error.message}`
    );
  }

  return (data ?? []) as unknown as LeaveBalance[];
}

// ---------------------------------------------------------------------------
// Leave Requests — Queries & Mutations
// ---------------------------------------------------------------------------

export async function getLeaveRequests(
  filters: LeaveRequestFilters = {}
): Promise<LeaveRequest[]> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "read");
  const supabase = await createUntypedClient();

  // leave_requests has no restaurant_id — filter via staff_members
  const { data: staffIds } = await supabase
    .from("staff_members")
    .select("id")
    .eq("restaurant_id", restaurantId);

  const ids = ((staffIds ?? []) as Array<{ id: string }>).map((s) => s.id);
  if (ids.length === 0) return [];

  let query = supabase
    .from("leave_requests")
    .select("*")
    .in("staff_member_id", ids)
    .order("created_at", { ascending: false });

  if (filters.staffMemberId) {
    query = query.eq("staff_member_id", filters.staffMemberId);
  }

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  if (filters.leaveType) {
    query = query.eq("leave_type", filters.leaveType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Erreur lors du chargement des demandes de conges : ${error.message}`
    );
  }

  return (data ?? []) as unknown as LeaveRequest[];
}

export async function createLeaveRequest(
  data: LeaveRequestFormData
): Promise<LeaveRequest> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  // Calculate duration in days
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  const { data: request, error } = await supabase
    .from("leave_requests")
    .insert({
      staff_member_id: data.staff_member_id,
      leave_type: data.leave_type,
      start_date: data.start_date,
      end_date: data.end_date,
      status: "pending",
      reason: data.reason || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Erreur lors de la creation de la demande de conge : ${error.message}`
    );
  }

  return request as unknown as LeaveRequest;
}

export async function approveLeaveRequest(id: string): Promise<void> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  // Verify the leave_request belongs to a staff member of this restaurant
  const { data: request, error: reqError } = await supabase
    .from("leave_requests")
    .select("staff_member_id")
    .eq("id", id)
    .single();

  if (reqError || !request) {
    throw new Error("Demande de conge introuvable.");
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff_members")
    .select("id")
    .eq("id", request.staff_member_id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (staffError || !staff) {
    throw new Error("Demande de conge introuvable ou acces refuse.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("leave_requests")
    .update({
      status: "approved",
      approved_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      `Erreur lors de l'approbation de la demande : ${error.message}`
    );
  }
}

export async function rejectLeaveRequest(id: string): Promise<void> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  // Verify the leave_request belongs to a staff member of this restaurant
  const { data: request, error: reqError } = await supabase
    .from("leave_requests")
    .select("staff_member_id")
    .eq("id", id)
    .single();

  if (reqError || !request) {
    throw new Error("Demande de conge introuvable.");
  }

  const { data: staff, error: staffError } = await supabase
    .from("staff_members")
    .select("id")
    .eq("id", request.staff_member_id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (staffError || !staff) {
    throw new Error("Demande de conge introuvable ou acces refuse.");
  }

  const { error } = await supabase
    .from("leave_requests")
    .update({
      status: "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(
      `Erreur lors du refus de la demande : ${error.message}`
    );
  }
}

// ---------------------------------------------------------------------------
// Time Entries — Queries & Mutations
// ---------------------------------------------------------------------------

export async function getTimeEntries(
  filters: TimeEntryFilters = {}
): Promise<TimeEntry[]> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "read");
  const supabase = await createUntypedClient();

  let query = supabase
    .from("time_entries")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("date", { ascending: false });

  if (filters.staffMemberId) {
    query = query.eq("staff_member_id", filters.staffMemberId);
  }

  if (filters.dateFrom) {
    query = query.gte("date", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("date", filters.dateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Erreur lors du chargement des pointages : ${error.message}`
    );
  }

  return (data ?? []) as unknown as TimeEntry[];
}

export async function createTimeEntry(
  data: TimeEntryFormData
): Promise<TimeEntry> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  const { data: entry, error } = await supabase
    .from("time_entries")
    .insert({
      restaurant_id: restaurantId,
      staff_member_id: data.staff_member_id,
      date: data.date,
      period: data.period,
      clock_in: data.clock_in || null,
      clock_out: data.clock_out || null,
      break_minutes: data.break_minutes,
      is_manual: true,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Erreur lors de la creation du pointage : ${error.message}`
    );
  }

  return entry as unknown as TimeEntry;
}

export async function updateTimeEntry(
  id: string,
  data: Partial<TimeEntryFormData>
): Promise<TimeEntry> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  const updateData: Record<string, unknown> = {};

  if (data.staff_member_id !== undefined)
    updateData.staff_member_id = data.staff_member_id;
  if (data.date !== undefined) updateData.date = data.date;
  if (data.period !== undefined) updateData.period = data.period;
  if (data.clock_in !== undefined)
    updateData.clock_in = data.clock_in || null;
  if (data.clock_out !== undefined)
    updateData.clock_out = data.clock_out || null;
  if (data.break_minutes !== undefined)
    updateData.break_minutes = data.break_minutes;
  if (data.notes !== undefined) updateData.notes = data.notes || null;

  const { data: entry, error } = await supabase
    .from("time_entries")
    .update(updateData)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select()
    .single();

  if (error) {
    throw new Error(
      `Erreur lors de la mise a jour du pointage : ${error.message}`
    );
  }

  return entry as unknown as TimeEntry;
}

export async function validateTimeEntry(id: string): Promise<void> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("time_entries")
    .update({
      validated_by: user?.id ?? null,
    })
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(
      `Erreur lors de la validation du pointage : ${error.message}`
    );
  }
}

// ---------------------------------------------------------------------------
// Payroll Advances — Queries & Mutations
// ---------------------------------------------------------------------------

export async function getPayrollAdvances(
  staffMemberId?: string
): Promise<PayrollAdvance[]> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "read");
  const supabase = await createUntypedClient();

  let query = supabase
    .from("payroll_advances")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("date", { ascending: false });

  if (staffMemberId) {
    query = query.eq("staff_member_id", staffMemberId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Erreur lors du chargement des acomptes : ${error.message}`
    );
  }

  return (data ?? []) as unknown as PayrollAdvance[];
}

export async function createPayrollAdvance(
  data: PayrollAdvanceFormData
): Promise<PayrollAdvance> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  const { data: advance, error } = await supabase
    .from("payroll_advances")
    .insert({
      restaurant_id: restaurantId,
      staff_member_id: data.staff_member_id,
      date: data.date,
      amount: data.amount,
      payment_method: data.payment_method,
      notes: data.notes || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Erreur lors de la creation de l'acompte : ${error.message}`
    );
  }

  return advance as unknown as PayrollAdvance;
}

// ---------------------------------------------------------------------------
// Staff Documents — Queries & Mutations
// ---------------------------------------------------------------------------

export async function getStaffDocuments(
  filters: StaffDocumentFilters = {}
): Promise<StaffDocument[]> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "read");
  const supabase = await createUntypedClient();

  let query = supabase
    .from("staff_documents")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (filters.staffMemberId) {
    query = query.eq("staff_member_id", filters.staffMemberId);
  }

  if (filters.documentType) {
    query = query.eq("type", filters.documentType);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Erreur lors du chargement des documents : ${error.message}`
    );
  }

  return (data ?? []) as unknown as StaffDocument[];
}

export async function createStaffDocument(
  data: StaffDocumentFormData
): Promise<StaffDocument> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  const { data: doc, error } = await supabase
    .from("staff_documents")
    .insert({
      restaurant_id: restaurantId,
      staff_member_id: data.staff_member_id,
      type: data.type,
      name: data.name,
      file_url: data.file_url,
      date: data.date || null,
      expiry_date: data.expiry_date || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(
      `Erreur lors de la creation du document : ${error.message}`
    );
  }

  return doc as unknown as StaffDocument;
}

export async function deleteStaffDocument(id: string): Promise<void> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "delete");
  const supabase = await createUntypedClient();

  const { error } = await supabase
    .from("staff_documents")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(
      `Erreur lors de la suppression du document : ${error.message}`
    );
  }
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function getPersonnelDashboard(): Promise<PersonnelDashboard> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "read");
  const supabase = await createUntypedClient();

  const today = new Date().toISOString().split("T")[0];

  // Get schedule_week ids for this restaurant to query shifts
  const { data: weekIds } = await supabase
    .from("schedule_weeks")
    .select("id")
    .eq("restaurant_id", restaurantId);
  const swIds = ((weekIds ?? []) as Array<{ id: string }>).map((w) => w.id);

  // Get staff ids for leave queries
  const { data: staffIds } = await supabase
    .from("staff_members")
    .select("id")
    .eq("restaurant_id", restaurantId);
  const smIds = ((staffIds ?? []) as Array<{ id: string }>).map((s) => s.id);

  const in30Days = new Date();
  in30Days.setDate(in30Days.getDate() + 30);
  const in30DaysStr = in30Days.toISOString().split("T")[0];

  // All counts in parallel
  const [activeStaffRes, pendingLeaveRes, todayShiftsRes, expiringDocsRes] =
    await Promise.all([
      // Active staff count
      supabase
        .from("staff_members")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true),

      // Pending leave requests (via staff_member_id)
      smIds.length > 0
        ? supabase
            .from("leave_requests")
            .select("*", { count: "exact", head: true })
            .in("staff_member_id", smIds)
            .eq("status", "pending")
        : Promise.resolve({ count: 0 }),

      // Today's shifts (via schedule_week_id)
      swIds.length > 0
        ? supabase
            .from("shifts")
            .select("*", { count: "exact", head: true })
            .in("schedule_week_id", swIds)
            .eq("date", today)
        : Promise.resolve({ count: 0 }),

      // Documents expiring within 30 days
      supabase
        .from("staff_documents")
        .select("*", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId)
        .lte("expiry_date", in30DaysStr)
        .gte("expiry_date", today),
    ]);

  return {
    activeStaffCount: activeStaffRes.count ?? 0,
    pendingLeaveRequests: pendingLeaveRes.count ?? 0,
    todayShifts: todayShiftsRes.count ?? 0,
    expiringDocuments: expiringDocsRes.count ?? 0,
  };
}

export async function getTodayShifts(): Promise<Shift[]> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "read");
  const supabase = await createUntypedClient();

  const today = new Date().toISOString().split("T")[0];

  // shifts have no restaurant_id — find via schedule_weeks
  const { data: weekIds } = await supabase
    .from("schedule_weeks")
    .select("id")
    .eq("restaurant_id", restaurantId);
  const swIds = ((weekIds ?? []) as Array<{ id: string }>).map((w) => w.id);
  if (swIds.length === 0) return [];

  const { data, error } = await supabase
    .from("shifts")
    .select("*")
    .in("schedule_week_id", swIds)
    .eq("date", today)
    .order("start_time", { ascending: true });

  if (error) {
    throw new Error(
      `Erreur lors du chargement des shifts du jour : ${error.message}`
    );
  }

  return (data ?? []) as unknown as Shift[];
}

// ---------------------------------------------------------------------------
// Schedule Templates — Mutations
// ---------------------------------------------------------------------------

export async function setDefaultTemplate(templateId: string): Promise<void> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "write");
  const supabase = await createUntypedClient();

  // Unset all existing defaults for this restaurant
  const { error: unsetError } = await supabase
    .from("schedule_templates")
    .update({ is_default: false })
    .eq("restaurant_id", restaurantId);

  if (unsetError) {
    throw new Error(
      `Erreur lors de la mise a jour des modeles : ${unsetError.message}`
    );
  }

  // Set the new default
  const { error } = await supabase
    .from("schedule_templates")
    .update({ is_default: true })
    .eq("id", templateId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(
      `Erreur lors de la definition du modele par defaut : ${error.message}`
    );
  }
}

export async function deleteScheduleTemplate(templateId: string): Promise<void> {
  const { restaurantId } = await requireActionPermission("m07_personnel", "delete");
  const supabase = await createUntypedClient();

  // Verify ownership
  const { data: template, error: checkError } = await supabase
    .from("schedule_templates")
    .select("id")
    .eq("id", templateId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (checkError || !template) {
    throw new Error("Modele introuvable ou acces refuse.");
  }

  // Delete template shifts first (cascade may not be set)
  await supabase
    .from("template_shifts")
    .delete()
    .eq("template_id", templateId);

  const { error } = await supabase
    .from("schedule_templates")
    .delete()
    .eq("id", templateId)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(
      `Erreur lors de la suppression du modele : ${error.message}`
    );
  }
}
