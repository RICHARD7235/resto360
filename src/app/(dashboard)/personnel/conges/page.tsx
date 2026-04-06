"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PersonnelTabs } from "@/components/modules/personnel/personnel-tabs";
import { LeaveBalanceCard } from "@/components/modules/personnel/leave-balance-card";
import { LeaveTable } from "@/components/modules/personnel/leave-table";
import { LeaveRequestForm } from "@/components/modules/personnel/leave-request-form";
import { usePersonnelStore } from "@/stores/personnel.store";
import {
  getLeaveBalances,
  getLeaveRequests,
  getStaffMembers,
} from "../actions";
import type { LeaveBalance, LeaveRequest, StaffMemberWithPosition } from "@/types/personnel";

// ---------------------------------------------------------------------------
// Year options
// ---------------------------------------------------------------------------

const YEAR_OPTIONS = [2024, 2025, 2026, 2027];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CongesPage() {
  const { selectedLeaveYear, setSelectedLeaveYear } = usePersonnelStore();

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberWithPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [balancesData, requestsData, staffData] = await Promise.all([
        getLeaveBalances(selectedLeaveYear),
        getLeaveRequests({}),
        getStaffMembers({ isActive: true }),
      ]);
      setBalances(balancesData);
      setRequests(requestsData);
      setStaffMembers(staffData);
    } catch (error) {
      console.error("Erreur chargement congés:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedLeaveYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personnel & Planning</h1>
          <p className="text-muted-foreground">
            Gestion du personnel, plannings et pointages
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)} className="min-h-11 gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle demande
        </Button>
      </div>

      {/* Tab navigation */}
      <PersonnelTabs />

      {/* Year selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Année :</span>
        <Select
          value={String(selectedLeaveYear)}
          onValueChange={(value) => setSelectedLeaveYear(Number(value ?? selectedLeaveYear))}
        >
          <SelectTrigger className="w-32 min-h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEAR_OPTIONS.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Leave balance summary */}
          <LeaveBalanceCard
            balances={balances}
            staffMembers={staffMembers}
            year={selectedLeaveYear}
          />

          {/* Leave requests table */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Demandes de congé</h2>
            <LeaveTable
              requests={requests}
              staffMembers={staffMembers}
              onRefresh={fetchData}
            />
          </div>
        </div>
      )}

      {/* New leave request form */}
      <LeaveRequestForm
        open={formOpen}
        staffMembers={staffMembers}
        onClose={() => setFormOpen(false)}
        onSaved={fetchData}
      />
    </div>
  );
}
