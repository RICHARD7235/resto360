"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StaffForm } from "@/components/modules/personnel/staff-form";
import {
  getJobPositions,
  getStaffMembers,
  createStaffMember,
} from "@/app/(dashboard)/personnel/actions";
import type {
  JobPosition,
  StaffMemberWithPosition,
  StaffFormData,
} from "@/types/personnel";

export default function NouvelEmployePage() {
  const router = useRouter();
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberWithPosition[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [positions, members] = await Promise.all([
          getJobPositions(),
          getStaffMembers({ isActive: true }),
        ]);
        setJobPositions(positions);
        setStaffMembers(members);
      } catch (err) {
        toast.error("Erreur lors du chargement des données");
        console.error(err);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, []);

  async function handleSubmit(data: StaffFormData) {
    await createStaffMember(data);
    toast.success("Employé créé avec succès");
    router.push("/personnel/equipe");
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Chargement…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6 px-4">
      <div>
        <h1 className="text-2xl font-bold">Nouvel employé</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Renseignez les informations du nouveau membre de l&apos;équipe.
        </p>
      </div>

      <StaffForm
        jobPositions={jobPositions}
        staffMembers={staffMembers}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/personnel/equipe")}
      />
    </div>
  );
}
