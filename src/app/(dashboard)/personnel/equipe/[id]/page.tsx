"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { StaffCard } from "@/components/modules/personnel/staff-card";
import { StaffForm } from "@/components/modules/personnel/staff-form";
import { PayrollAdvanceList } from "@/components/modules/personnel/payroll-advance-list";
import { PayrollAdvanceForm } from "@/components/modules/personnel/payroll-advance-form";
import {
  getStaffMember,
  getJobPositions,
  getStaffMembers,
  updateStaffMember,
  toggleStaffActive,
  getScheduleWeek,
  getShiftsForWeek,
  getLeaveRequests,
  getLeaveBalances,
  getTimeEntries,
  getStaffDocuments,
  getPayrollAdvances,
} from "@/app/(dashboard)/personnel/actions";
import type {
  StaffMemberWithPosition,
  JobPosition,
  StaffFormData,
  Shift,
  LeaveRequest,
  LeaveBalance,
  TimeEntry,
  StaffDocument,
  PayrollAdvance,
} from "@/types/personnel";
import {
  SHIFT_TYPE_LABELS,
  PERIOD_LABELS,
  LEAVE_TYPE_LABELS,
} from "@/types/personnel";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the ISO Monday (YYYY-MM-DD) for a date that is `weeksAgo` weeks ago */
function getPastMonday(weeksAgo: number): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun…6=Sat
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diffToMonday - weeksAgo * 7);
  return d.toISOString().slice(0, 10);
}

function firstDayOfCurrentMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function lastDayOfCurrentMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10);
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  contrat: "Contrat",
  fiche_paie: "Fiche de paie",
  attestation: "Attestation",
  autre: "Autre",
};

const LEAVE_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Refusé",
};

// ---------------------------------------------------------------------------
// Detail field helper
// ---------------------------------------------------------------------------

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">
        {value ?? (
          <span className="text-muted-foreground italic">—</span>
        )}
      </dd>
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

  // Core staff data
  const [staff, setStaff] = useState<StaffMemberWithPosition | null>(null);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberWithPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("informations");

  // Per-tab data
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [shiftsLoaded, setShiftsLoaded] = useState(false);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [congesLoading, setCongesLoading] = useState(false);
  const [congesLoaded, setCongesLoaded] = useState(false);

  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [pointageLoading, setPointageLoading] = useState(false);
  const [pointageLoaded, setPointageLoaded] = useState(false);

  const [documents, setDocuments] = useState<StaffDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);

  const [advances, setAdvances] = useState<PayrollAdvance[]>([]);
  const [advancesLoading, setAdvancesLoading] = useState(false);
  const [advancesLoaded, setAdvancesLoaded] = useState(false);
  const [advanceFormOpen, setAdvanceFormOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Initial load (staff + positions)
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Lazy tab loading
  // ---------------------------------------------------------------------------

  // Planning — last 4 weeks of shifts
  useEffect(() => {
    if (activeTab !== "planning" || shiftsLoaded) return;

    async function loadShifts() {
      setShiftsLoading(true);
      try {
        const weeks = [0, 1, 2, 3];
        const weekStarts = weeks.map(getPastMonday);

        // Fetch schedule_week ids for each Monday
        const weekPromises = weekStarts.map((ws) => getScheduleWeek(ws));
        const scheduleWeeks = await Promise.all(weekPromises);

        // Fetch shifts for each found week
        const shiftPromises = scheduleWeeks
          .filter(Boolean)
          .map((w) => getShiftsForWeek(w!.id));
        const shiftArrays = await Promise.all(shiftPromises);

        const allShifts = shiftArrays
          .flat()
          .filter((s) => s.staff_member_id === id)
          .sort(
            (a, b) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
          );

        setShifts(allShifts);
        setShiftsLoaded(true);
      } catch (err) {
        console.error("Erreur chargement planning:", err);
        toast.error("Erreur lors du chargement du planning");
      } finally {
        setShiftsLoading(false);
      }
    }

    loadShifts();
  }, [activeTab, shiftsLoaded, id]);

  // Congés — leave requests + leave balances for current year
  useEffect(() => {
    if (activeTab !== "conges" || congesLoaded) return;

    async function loadConges() {
      setCongesLoading(true);
      try {
        const currentYear = new Date().getFullYear();
        const [requests, balances] = await Promise.all([
          getLeaveRequests({ staffMemberId: id }),
          getLeaveBalances(currentYear),
        ]);
        setLeaveRequests(requests);
        setLeaveBalances(
          balances.filter((b) => b.staff_member_id === id)
        );
        setCongesLoaded(true);
      } catch (err) {
        console.error("Erreur chargement congés:", err);
        toast.error("Erreur lors du chargement des congés");
      } finally {
        setCongesLoading(false);
      }
    }

    loadConges();
  }, [activeTab, congesLoaded, id]);

  // Pointage — time entries for current month
  useEffect(() => {
    if (activeTab !== "pointage" || pointageLoaded) return;

    async function loadPointage() {
      setPointageLoading(true);
      try {
        const entries = await getTimeEntries({
          staffMemberId: id,
          dateFrom: firstDayOfCurrentMonth(),
          dateTo: lastDayOfCurrentMonth(),
        });
        setTimeEntries(entries);
        setPointageLoaded(true);
      } catch (err) {
        console.error("Erreur chargement pointage:", err);
        toast.error("Erreur lors du chargement du pointage");
      } finally {
        setPointageLoading(false);
      }
    }

    loadPointage();
  }, [activeTab, pointageLoaded, id]);

  // Documents
  useEffect(() => {
    if (activeTab !== "documents" || documentsLoaded) return;

    async function loadDocuments() {
      setDocumentsLoading(true);
      try {
        const docs = await getStaffDocuments({ staffMemberId: id });
        setDocuments(docs);
        setDocumentsLoaded(true);
      } catch (err) {
        console.error("Erreur chargement documents:", err);
        toast.error("Erreur lors du chargement des documents");
      } finally {
        setDocumentsLoading(false);
      }
    }

    loadDocuments();
  }, [activeTab, documentsLoaded, id]);

  // Acomptes
  useEffect(() => {
    if (activeTab !== "acomptes" || advancesLoaded) return;

    async function loadAdvances() {
      setAdvancesLoading(true);
      try {
        const data = await getPayrollAdvances(id);
        setAdvances(data);
        setAdvancesLoaded(true);
      } catch (err) {
        console.error("Erreur chargement acomptes:", err);
        toast.error("Erreur lors du chargement des acomptes");
      } finally {
        setAdvancesLoading(false);
      }
    }

    loadAdvances();
  }, [activeTab, advancesLoaded, id]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function handleUpdate(data: StaffFormData) {
    if (!staff) return;
    await updateStaffMember(staff.id, data);
    const refreshed = await getStaffMember(staff.id);
    if (refreshed) setStaff(refreshed);
    setEditMode(false);
    toast.success("Employé mis à jour");
  }

  async function handleToggleActive() {
    if (!staff) return;
    const newState = !staff.is_active;
    await toggleStaffActive(staff.id, newState);
    setStaff((prev) =>
      prev ? { ...prev, is_active: newState } : prev
    );
    toast.success(newState ? "Employé activé" : "Employé désactivé");
  }

  function handleAdvanceSaved() {
    // Reload advances after save
    setAdvancesLoaded(false);
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          if (value) setActiveTab(value);
        }}
      >
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="informations" className="min-h-11">
            Informations
          </TabsTrigger>
          <TabsTrigger value="planning" className="min-h-11">
            Planning
          </TabsTrigger>
          <TabsTrigger value="conges" className="min-h-11">
            Congés
          </TabsTrigger>
          <TabsTrigger value="pointage" className="min-h-11">
            Pointage
          </TabsTrigger>
          <TabsTrigger value="documents" className="min-h-11">
            Documents
          </TabsTrigger>
          <TabsTrigger value="acomptes" className="min-h-11">
            Acomptes
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------------ */}
        {/* Informations                                                        */}
        {/* ------------------------------------------------------------------ */}
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
              <section>
                <h3 className="text-sm font-semibold mb-3">Identité</h3>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <InfoRow label="Nom complet" value={staff.full_name} />
                  <InfoRow label="Email" value={staff.email} />
                  <InfoRow label="Téléphone" value={staff.phone} />
                  <InfoRow label="Date de naissance" value={staff.birth_date} />
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold mb-3">Contrat</h3>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <InfoRow label="Rôle" value={staff.role} />
                  <InfoRow label="Département" value={staff.department} />
                  <InfoRow label="Poste" value={staff.job_position_title} />
                  <InfoRow label="Type de contrat" value={staff.contract_type} />
                  <InfoRow label="Heures / semaine" value={staff.contract_hours} />
                  <InfoRow
                    label="Taux horaire"
                    value={staff.hourly_rate ? `${staff.hourly_rate} €` : null}
                  />
                  <InfoRow label="Date d'embauche" value={staff.start_date} />
                  <InfoRow label="Fin de contrat" value={staff.end_date} />
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold mb-3">Manager</h3>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <InfoRow label="Responsable" value={staff.manager_name} />
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold mb-3">
                  Contact d&apos;urgence
                </h3>
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <InfoRow
                    label="Nom"
                    value={staff.emergency_contact_name}
                  />
                  <InfoRow
                    label="Téléphone"
                    value={staff.emergency_contact_phone}
                  />
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold mb-3">Adresse</h3>
                <dl>
                  <InfoRow label="Adresse complète" value={staff.address} />
                </dl>
              </section>
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Planning                                                            */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="planning" className="mt-4">
          {shiftsLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Aucun shift sur les 4 dernières semaines.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium text-muted-foreground">Date</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Période</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Horaires</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((shift, idx) => (
                    <tr
                      key={shift.id}
                      className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Date(shift.date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-3 py-2">
                        {PERIOD_LABELS[shift.period as keyof typeof PERIOD_LABELS] ??
                          shift.period}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {shift.start_time.slice(0, 5)}–{shift.end_time.slice(0, 5)}
                      </td>
                      <td className="px-3 py-2">
                        {SHIFT_TYPE_LABELS[
                          shift.shift_type as keyof typeof SHIFT_TYPE_LABELS
                        ] ?? shift.shift_type}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Congés                                                              */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="conges" className="mt-4 space-y-6">
          {congesLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <>
              {/* Balances */}
              {leaveBalances.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold mb-3">
                    Soldes {new Date().getFullYear()}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {leaveBalances.map((b) => {
                      const remaining =
                        b.acquired_days + b.carried_over - b.taken_days;
                      return (
                        <div
                          key={b.id}
                          className="rounded-lg border p-3 space-y-1"
                        >
                          <p className="text-xs font-medium text-muted-foreground">
                            {LEAVE_TYPE_LABELS[
                              b.leave_type as keyof typeof LEAVE_TYPE_LABELS
                            ] ?? b.leave_type}
                          </p>
                          <p className="text-lg font-bold">
                            {remaining}j
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Acquis : {b.acquired_days}j · Pris : {b.taken_days}j
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Requests */}
              <section>
                <h3 className="text-sm font-semibold mb-3">Demandes</h3>
                {leaveRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Aucune demande de congé.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 text-left">
                          <th className="px-3 py-2 font-medium text-muted-foreground">Type</th>
                          <th className="px-3 py-2 font-medium text-muted-foreground">Du</th>
                          <th className="px-3 py-2 font-medium text-muted-foreground">Au</th>
                          <th className="px-3 py-2 font-medium text-muted-foreground">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveRequests.map((req, idx) => (
                          <tr
                            key={req.id}
                            className={
                              idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                            }
                          >
                            <td className="px-3 py-2">
                              {LEAVE_TYPE_LABELS[
                                req.leave_type as keyof typeof LEAVE_TYPE_LABELS
                              ] ?? req.leave_type}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {new Date(req.start_date).toLocaleDateString(
                                "fr-FR"
                              )}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {new Date(req.end_date).toLocaleDateString(
                                "fr-FR"
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {LEAVE_STATUS_LABELS[req.status] ?? req.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Pointage                                                            */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="pointage" className="mt-4">
          {pointageLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : timeEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Aucun pointage ce mois-ci.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium text-muted-foreground">Date</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Période</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Entrée</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Sortie</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Pause (min)</th>
                  </tr>
                </thead>
                <tbody>
                  {timeEntries.map((entry, idx) => (
                    <tr
                      key={entry.id}
                      className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        {new Date(entry.date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-3 py-2">
                        {PERIOD_LABELS[
                          entry.period as keyof typeof PERIOD_LABELS
                        ] ?? entry.period}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {entry.clock_in
                          ? entry.clock_in.slice(0, 5)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {entry.clock_out
                          ? entry.clock_out.slice(0, 5)
                          : "—"}
                      </td>
                      <td className="px-3 py-2">{entry.break_minutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Documents                                                           */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="documents" className="mt-4">
          {documentsLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Aucun document enregistré.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-3 py-2 font-medium text-muted-foreground">Nom</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Type</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Date</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Expiration</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Fichier</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc, idx) => (
                    <tr
                      key={doc.id}
                      className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}
                    >
                      <td className="px-3 py-2">{doc.name}</td>
                      <td className="px-3 py-2">
                        {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {doc.date
                          ? new Date(doc.date).toLocaleDateString("fr-FR")
                          : "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {doc.expiry_date
                          ? new Date(doc.expiry_date).toLocaleDateString(
                              "fr-FR"
                            )
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline text-xs"
                        >
                          Voir
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* Acomptes                                                            */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="acomptes" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Acomptes sur salaire</h3>
            <Button
              size="sm"
              className="min-h-11 gap-2"
              onClick={() => setAdvanceFormOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Nouvel acompte
            </Button>
          </div>

          {advancesLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <PayrollAdvanceList advances={advances} />
          )}

          <PayrollAdvanceForm
            open={advanceFormOpen}
            onClose={() => setAdvanceFormOpen(false)}
            staffMemberId={id}
            onSave={handleAdvanceSaved}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
