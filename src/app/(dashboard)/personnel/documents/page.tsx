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
import { StaffDocumentList } from "@/components/modules/personnel/staff-document-list";
import { DocumentUploadForm } from "@/components/modules/personnel/document-upload-form";
import {
  getStaffDocuments,
  getStaffMembers,
} from "../actions";
import type {
  StaffDocument,
  StaffMemberWithPosition,
  DocumentType,
} from "@/types/personnel";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOCUMENT_TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "contrat", label: "Contrat" },
  { value: "fiche_paie", label: "Fiche de paie" },
  { value: "attestation", label: "Attestation" },
  { value: "autre", label: "Autre" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<StaffDocument[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMemberWithPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  // Filters
  const [filterStaffId, setFilterStaffId] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [docsData, staffData] = await Promise.all([
        getStaffDocuments({
          staffMemberId: filterStaffId || undefined,
          documentType: filterType || undefined,
        }),
        getStaffMembers({ isActive: true }),
      ]);
      setDocuments(docsData);
      setStaffMembers(staffData);
    } catch (error) {
      console.error("Erreur chargement documents:", error);
    } finally {
      setLoading(false);
    }
  }, [filterStaffId, filterType]);

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
          Ajouter un document
        </Button>
      </div>

      {/* Tab navigation */}
      <PersonnelTabs />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Filtrer :</span>

        {/* Filter by employee */}
        <Select
          value={filterStaffId}
          onValueChange={(value) => setFilterStaffId(value ?? "")}
        >
          <SelectTrigger className="w-52 min-h-11">
            <SelectValue placeholder="Tous les employés" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous les employés</SelectItem>
            {staffMembers.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                {staff.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filter by type */}
        <Select
          value={filterType}
          onValueChange={(value) => setFilterType(value ?? "")}
        >
          <SelectTrigger className="w-48 min-h-11">
            <SelectValue placeholder="Tous les types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous les types</SelectItem>
            {DOCUMENT_TYPE_OPTIONS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
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
        <StaffDocumentList
          documents={documents}
          staffMembers={staffMembers}
          onRefresh={fetchData}
        />
      )}

      {/* Upload form */}
      <DocumentUploadForm
        open={formOpen}
        staffMembers={staffMembers}
        onClose={() => setFormOpen(false)}
        onSaved={fetchData}
      />
    </div>
  );
}
