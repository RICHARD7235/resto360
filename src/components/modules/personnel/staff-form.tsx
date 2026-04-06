"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEPARTMENT_LABELS,
  type Department,
  type ContractType,
  type StaffMember,
  type StaffMemberWithPosition,
  type StaffFormData,
  type JobPosition,
} from "@/types/personnel";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StaffFormProps {
  initialData?: StaffMember;
  jobPositions: JobPosition[];
  staffMembers: StaffMemberWithPosition[];
  onSubmit: (data: StaffFormData) => Promise<void>;
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Role options
// ---------------------------------------------------------------------------

const ROLE_OPTIONS = [
  { value: "manager", label: "Manager" },
  { value: "server", label: "Serveur" },
  { value: "cook", label: "Cuisinier" },
  { value: "bartender", label: "Barman" },
];

const CONTRACT_TYPE_OPTIONS: { value: ContractType; label: string }[] = [
  { value: "cdi", label: "CDI" },
  { value: "cdd", label: "CDD" },
  { value: "apprenti", label: "Apprenti" },
  { value: "extra", label: "Extra" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StaffForm({
  initialData,
  jobPositions,
  staffMembers,
  onSubmit,
  onCancel,
}: StaffFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<StaffFormData>({
    full_name: initialData?.full_name ?? "",
    role: initialData?.role ?? "",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    department: (initialData?.department as Department) ?? "",
    job_position_id: initialData?.job_position_id ?? "",
    manager_id: initialData?.manager_id ?? "",
    contract_type: (initialData?.contract_type as ContractType) ?? "",
    contract_hours: initialData?.contract_hours ?? null,
    hourly_rate: initialData?.hourly_rate ?? null,
    start_date: initialData?.start_date ?? "",
    end_date: initialData?.end_date ?? "",
    birth_date: initialData?.birth_date ?? "",
    address: initialData?.address ?? "",
    social_security_number: initialData?.social_security_number ?? "",
    emergency_contact_name: initialData?.emergency_contact_name ?? "",
    emergency_contact_phone: initialData?.emergency_contact_phone ?? "",
    is_active: initialData?.is_active ?? true,
  });

  // Exclude the staff member being edited from the manager list
  const managerOptions = staffMembers.filter(
    (m) => m.is_active && m.id !== initialData?.id
  );

  function handleTextChange(field: keyof StaffFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };
  }

  function handleNumberChange(field: "contract_hours" | "hourly_rate") {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setFormData((prev) => ({
        ...prev,
        [field]: raw === "" ? null : parseFloat(raw),
      }));
    };
  }

  function handleSelectChange(field: keyof StaffFormData) {
    return (value: string | null) => {
      setFormData((prev) => ({ ...prev, [field]: value ?? "" }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Identité                                                            */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identité</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="full_name">
              Nom complet <span className="text-destructive">*</span>
            </Label>
            <Input
              id="full_name"
              required
              value={formData.full_name}
              onChange={handleTextChange("full_name")}
              placeholder="Prénom Nom"
              className="min-h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleTextChange("email")}
              placeholder="prenom@restaurant.fr"
              className="min-h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={handleTextChange("phone")}
              placeholder="06 00 00 00 00"
              className="min-h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="birth_date">Date de naissance</Label>
            <Input
              id="birth_date"
              type="date"
              value={formData.birth_date}
              onChange={handleTextChange("birth_date")}
              className="min-h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Contrat                                                             */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contrat</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Rôle</Label>
            <Select
              value={formData.role || undefined}
              onValueChange={handleSelectChange("role")}
            >
              <SelectTrigger className="w-full min-h-11">
                <SelectValue placeholder="Choisir un rôle" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Département</Label>
            <Select
              value={formData.department || undefined}
              onValueChange={handleSelectChange("department")}
            >
              <SelectTrigger className="w-full min-h-11">
                <SelectValue placeholder="Choisir un département" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(DEPARTMENT_LABELS) as [Department, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Poste</Label>
            <Select
              value={formData.job_position_id || undefined}
              onValueChange={handleSelectChange("job_position_id")}
            >
              <SelectTrigger className="w-full min-h-11">
                <SelectValue placeholder="Choisir un poste" />
              </SelectTrigger>
              <SelectContent>
                {jobPositions.map((pos) => (
                  <SelectItem key={pos.id} value={pos.id}>
                    {pos.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Type de contrat</Label>
            <Select
              value={formData.contract_type || undefined}
              onValueChange={handleSelectChange("contract_type")}
            >
              <SelectTrigger className="w-full min-h-11">
                <SelectValue placeholder="Type de contrat" />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="contract_hours">Heures / semaine</Label>
            <Input
              id="contract_hours"
              type="number"
              min={0}
              step={0.5}
              value={formData.contract_hours ?? ""}
              onChange={handleNumberChange("contract_hours")}
              placeholder="35"
              className="min-h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hourly_rate">Taux horaire (€)</Label>
            <Input
              id="hourly_rate"
              type="number"
              min={0}
              step={0.01}
              value={formData.hourly_rate ?? ""}
              onChange={handleNumberChange("hourly_rate")}
              placeholder="11.65"
              className="min-h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="start_date">Date d&apos;embauche</Label>
            <Input
              id="start_date"
              type="date"
              value={formData.start_date}
              onChange={handleTextChange("start_date")}
              className="min-h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="end_date">Fin de contrat</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={handleTextChange("end_date")}
              className="min-h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Manager                                                             */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label>Responsable hiérarchique</Label>
            <Select
              value={formData.manager_id || undefined}
              onValueChange={handleSelectChange("manager_id")}
            >
              <SelectTrigger className="w-full min-h-11">
                <SelectValue placeholder="Choisir un manager" />
              </SelectTrigger>
              <SelectContent>
                {managerOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name}
                    {m.job_position_title ? ` — ${m.job_position_title}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Contact urgence                                                     */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact d&apos;urgence</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="emergency_contact_name">Nom du contact</Label>
            <Input
              id="emergency_contact_name"
              value={formData.emergency_contact_name}
              onChange={handleTextChange("emergency_contact_name")}
              placeholder="Prénom Nom"
              className="min-h-11"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emergency_contact_phone">Téléphone du contact</Label>
            <Input
              id="emergency_contact_phone"
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={handleTextChange("emergency_contact_phone")}
              placeholder="06 00 00 00 00"
              className="min-h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Adresse                                                             */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adresse</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="address">Adresse complète</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={handleTextChange("address")}
              placeholder="Rue, code postal, ville"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Actions                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="min-h-11"
        >
          Annuler
        </Button>
        <Button type="submit" disabled={loading} className="min-h-11">
          {loading
            ? "Enregistrement..."
            : initialData
            ? "Mettre à jour"
            : "Créer l'employé"}
        </Button>
      </div>
    </form>
  );
}
