"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StaffCard } from "@/components/modules/personnel/staff-card";
import { StaffForm } from "@/components/modules/personnel/staff-form";
import {
  getStaffMember,
  getJobPositions,
  getStaffMembers,
  updateStaffMember,
  toggleStaffActive,
} from "@/app/(dashboard)/personnel/actions";
import type {
  StaffMemberWithPosition,
  JobPosition,
  StaffFormData,
} from "@/types/personnel";

// ---------------------------------------------------------------------------
// Detail field helper
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? <span className="text-muted-foreground italic">—</span>}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EmployeDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [staff, setStaff] = useState<StaffMemberWithPosition | null>(null);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberWithPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [member, positions, members] = await Promise.all([
          getStaffMember(id),
          getJobPositions(),
          getStaffMembers({ isActive: true }),
        ]);

        if (!member) {
          toast.error("Employé introuvable");
          router.push("/personnel/equipe");
          return;
        }

        setStaff(member);
        setJobPositions(positions);
        setStaffMembers(members);
      } catch (err) {
        toast.error("Erreur lors du chargement");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, router]);

  async function handleUpdate(data: StaffFormData) {
    if (!staff) return;
    const updated = await updateStaffMember(staff.id, data);
    // Refresh with enriched data
    const refreshed = await getStaffMember(staff.id);
    if (refreshed) setStaff(refreshed);
    else setStaff({ ...staff, ...updated });
    setEditMode(false);
    toast.success("Employé mis à jour");
  }

  async function handleToggleActive() {
    if (!staff) return;
    const newState = !staff.is_active;
    await toggleStaffActive(staff.id, newState);
    setStaff((prev) => prev ? { ...prev, is_active: newState } : prev);
    toast.success(newState ? "Employé activé" : "Employé désactivé");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Chargement…
      </div>
    );
  }

  if (!staff) return null;

  return (
    <div className="space-y-6 py-6 px-4">
      {/* Header card */}
      <StaffCard
        staff={staff}
        onEdit={() => setEditMode(true)}
        onToggleActive={handleToggleActive}
      />

      {/* Tabs */}
      <Tabs defaultValue="informations">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="informations" className="min-h-11">Informations</TabsTrigger>
          <TabsTrigger value="planning" className="min-h-11">Planning</TabsTrigger>
          <TabsTrigger value="conges" className="min-h-11">Congés</TabsTrigger>
          <TabsTrigger value="pointage" className="min-h-11">Pointage</TabsTrigger>
          <TabsTrigger value="documents" className="min-h-11">Documents</TabsTrigger>
          <TabsTrigger value="acomptes" className="min-h-11">Acomptes</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------------- */}
        {/* Informations tab                                                 */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="informations" className="mt-4">
          {editMode ? (
            <StaffForm
              initialData={staff}
              jobPositions={jobPositions}
              staffMembers={staffMembers}
              onSubmit={handleUpdate}
              onCancel={() => setEditMode(false)}
            />
          ) : (
            <div className="space-y-6">
              {/* Identité */}
              <section>
                <h3 className="text-sm font-semibold mb-3">Identité</h3>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <InfoRow label="Nom complet" value={staff.full_name} />
                  <InfoRow label="Email" value={staff.email} />
                  <InfoRow label="Téléphone" value={staff.phone} />
                  <InfoRow label="Date de naissance" value={staff.birth_date} />
                </dl>
              </section>

              {/* Contrat */}
              <section>
                <h3 className="text-sm font-semibold mb-3">Contrat</h3>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <InfoRow label="Rôle" value={staff.role} />
                  <InfoRow label="Département" value={staff.department} />
                  <InfoRow label="Poste" value={staff.job_position_title} />
                  <InfoRow label="Type de contrat" value={staff.contract_type} />
                  <InfoRow label="Heures / semaine" value={staff.contract_hours} />
                  <InfoRow label="Taux horaire" value={staff.hourly_rate ? `${staff.hourly_rate} €` : null} />
                  <InfoRow label="Date d'embauche" value={staff.start_date} />
                  <InfoRow label="Fin de contrat" value={staff.end_date} />
                </dl>
              </section>

              {/* Manager */}
              <section>
                <h3 className="text-sm font-semibold mb-3">Manager</h3>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <InfoRow label="Responsable" value={staff.manager_name} />
                </dl>
              </section>

              {/* Contact urgence */}
              <section>
                <h3 className="text-sm font-semibold mb-3">Contact d&apos;urgence</h3>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <InfoRow label="Nom" value={staff.emergency_contact_name} />
                  <InfoRow label="Téléphone" value={staff.emergency_contact_phone} />
                </dl>
              </section>

              {/* Adresse */}
              <section>
                <h3 className="text-sm font-semibold mb-3">Adresse</h3>
                <dl>
                  <InfoRow label="Adresse complète" value={staff.address} />
                </dl>
              </section>
            </div>
          )}
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* Placeholder tabs                                                 */}
        {/* ---------------------------------------------------------------- */}
        {(["planning", "conges", "pointage", "documents", "acomptes"] as const).map(
          (tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <p className="text-sm text-muted-foreground italic">Contenu à venir</p>
            </TabsContent>
          )
        )}
      </Tabs>
    </div>
  );
}
