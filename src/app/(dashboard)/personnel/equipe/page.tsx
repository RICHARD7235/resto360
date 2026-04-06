"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { PersonnelTabs } from "@/components/modules/personnel/personnel-tabs";
import { StaffTable } from "@/components/modules/personnel/staff-table";
import { DepartmentFilter } from "@/components/modules/personnel/department-filter";
import { usePersonnelStore } from "@/stores/personnel.store";
import { getStaffMembers } from "../actions";
import type { StaffMemberWithPosition } from "@/types/personnel";

export default function EquipePage() {
  const router = useRouter();
  const { filters, setFilters, resetFilters } = usePersonnelStore();
  const [allStaffMembers, setAllStaffMembers] = useState<StaffMemberWithPosition[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStaffMembers({
        department: filters.department || undefined,
        isActive: filters.isActive ?? undefined,
        search: filters.search || undefined,
      });
      setAllStaffMembers(data);
    } catch (error) {
      console.error("Erreur chargement équipe:", error);
    } finally {
      setLoading(false);
    }
  }, [filters.department, filters.isActive, filters.search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // contractType is filtered client-side since StaffFilters doesn't support it
  const staffMembers = useMemo(() => {
    if (!filters.contractType) return allStaffMembers;
    return allStaffMembers.filter(
      (s) => s.contract_type === filters.contractType
    );
  }, [allStaffMembers, filters.contractType]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personnel & Planning</h1>
          <p className="text-muted-foreground">
            Gestion du personnel, plannings et pointages
          </p>
        </div>
        <Button
          onClick={() => router.push("/personnel/equipe/nouveau")}
          className="min-h-11 gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvel employé
        </Button>
      </div>

      <PersonnelTabs />

      <DepartmentFilter
        department={filters.department}
        contractType={filters.contractType}
        search={filters.search}
        onDepartmentChange={(v) =>
          setFilters({ department: !v || v === "all" ? "" : (v as never) })
        }
        onContractTypeChange={(v) =>
          setFilters({ contractType: !v || v === "all" ? "" : (v as never) })
        }
        onSearchChange={(v) => setFilters({ search: v })}
        onReset={resetFilters}
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <StaffTable staffMembers={staffMembers} />
      )}
    </div>
  );
}
