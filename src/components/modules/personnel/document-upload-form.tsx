"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createStaffDocument } from "@/app/(dashboard)/personnel/actions";
import type {
  DocumentType,
  StaffDocumentFormData,
  StaffMemberWithPosition,
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
// Props
// ---------------------------------------------------------------------------

interface DocumentUploadFormProps {
  open: boolean;
  staffMembers: StaffMemberWithPosition[];
  onClose: () => void;
  onSaved: () => void;
}

// ---------------------------------------------------------------------------
// Default form state
// ---------------------------------------------------------------------------

function defaultFormData(): StaffDocumentFormData {
  return {
    staff_member_id: "",
    type: "contrat",
    name: "",
    file_url: "",
    date: "",
    expiry_date: "",
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DocumentUploadForm({
  open,
  staffMembers,
  onClose,
  onSaved,
}: DocumentUploadFormProps) {
  const [formData, setFormData] = useState<StaffDocumentFormData>(defaultFormData);
  const [loading, setLoading] = useState(false);

  function handleField<K extends keyof StaffDocumentFormData>(
    key: K,
    value: StaffDocumentFormData[K]
  ) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.staff_member_id) {
      toast.error("Veuillez sélectionner un employé");
      return;
    }
    if (!formData.name.trim()) {
      toast.error("Veuillez renseigner le nom du document");
      return;
    }

    setLoading(true);
    try {
      await createStaffDocument(formData);
      toast.success("Document ajouté");
      setFormData(defaultFormData());
      onSaved();
      onClose();
    } catch (error) {
      toast.error("Erreur lors de l'ajout du document");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setFormData(defaultFormData());
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Ajouter un document RH</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5 px-1">
          {/* Employé */}
          <div className="space-y-1.5">
            <Label htmlFor="doc_staff_member_id">Employé *</Label>
            <Select
              value={formData.staff_member_id}
              onValueChange={(value) =>
                handleField("staff_member_id", value ?? "")
              }
            >
              <SelectTrigger id="doc_staff_member_id" className="min-h-11">
                <SelectValue placeholder="Sélectionner un employé" />
              </SelectTrigger>
              <SelectContent>
                {staffMembers.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    {staff.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type de document */}
          <div className="space-y-1.5">
            <Label htmlFor="doc_type">Type de document *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) =>
                handleField("type", (value ?? "contrat") as DocumentType)
              }
            >
              <SelectTrigger id="doc_type" className="min-h-11">
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPE_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nom du document */}
          <div className="space-y-1.5">
            <Label htmlFor="doc_name">Nom du document *</Label>
            <Input
              id="doc_name"
              className="min-h-11"
              placeholder="Ex. Contrat CDI — Jean Dupont"
              value={formData.name}
              onChange={(e) => handleField("name", e.target.value)}
            />
          </div>

          {/* Date du document */}
          <div className="space-y-1.5">
            <Label htmlFor="doc_date">Date du document</Label>
            <Input
              id="doc_date"
              type="date"
              className="min-h-11"
              value={formData.date}
              onChange={(e) => handleField("date", e.target.value)}
            />
          </div>

          {/* Date d'expiration */}
          <div className="space-y-1.5">
            <Label htmlFor="doc_expiry_date">Date d&apos;expiration</Label>
            <Input
              id="doc_expiry_date"
              type="date"
              className="min-h-11"
              value={formData.expiry_date}
              onChange={(e) => handleField("expiry_date", e.target.value)}
            />
          </div>

          {/* URL du fichier */}
          <div className="space-y-1.5">
            <Label htmlFor="doc_file_url">URL du fichier</Label>
            <Input
              id="doc_file_url"
              type="url"
              className="min-h-11"
              placeholder="https://..."
              value={formData.file_url}
              onChange={(e) => handleField("file_url", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Uploader via Supabase Storage sera disponible prochainement.
            </p>
          </div>

          <SheetFooter className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 flex-1"
              onClick={handleClose}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="min-h-11 flex-1"
              disabled={loading}
            >
              {loading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
