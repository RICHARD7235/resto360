"use client";

import { useEffect, useState, useCallback } from "react";
import { PersonnelTabs } from "@/components/modules/personnel/personnel-tabs";
import { DashboardKpis } from "@/components/modules/personnel/dashboard-kpis";
import { TodaySchedule } from "@/components/modules/personnel/today-schedule";
import {
  getPersonnelDashboard,
  getStaffMembers,
  getTodayShifts,
} from "./actions";
import type { PersonnelDashboard } from "./actions";
import type { StaffMember, Shift } from "@/types/personnel";

export default function PersonnelPage() {
  const [dashboard, setDashboard] = useState<PersonnelDashboard | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardData, staffData, shiftsData] = await Promise.all([
        getPersonnelDashboard(),
        getStaffMembers({ isActive: true }),
        getTodayShifts(),
      ]);

      setDashboard(dashboardData);
      setStaffMembers(staffData);
      setTodayShifts(shiftsData);
    } catch (error) {
      console.error("Erreur chargement dashboard personnel:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Personnel & Planning</h1>
        <p className="text-muted-foreground">
          Gestion du personnel, plannings et pointages
        </p>
      </div>

      {/* Tab navigation */}
      <PersonnelTabs />

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : dashboard ? (
        <div className="space-y-6">
          {/* KPIs */}
          <DashboardKpis data={dashboard} />

          {/* Today's schedule */}
          <TodaySchedule shifts={todayShifts} staffMembers={staffMembers} />
        </div>
      ) : null}
    </div>
  );
}
