"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Download, AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteStaffDocument } from "@/app/(dashboard)/personnel/actions";
import type {
  StaffDocument,
  DocumentType,
  StaffMemberWithPosition,
} from "@/types/personnel";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  contrat: "Contrat",
  fiche_paie: "Fiche de paie",
  attestation: "Attestation",
  autre: "Autre",
};

const DOCUMENT_TYPE_BADGE_CLASS: Record<DocumentType, string> = {
  contrat: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  fiche_paie: "bg-green-100 text-green-800 hover:bg-green-100",
  attestation: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  autre: "bg-gray-100 text-gray-700 hover:bg-gray-100",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface StaffDocumentListProps {
  documents: StaffDocument[];
  staffMembers: StaffMemberWithPosition[];
  onRefresh: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getExpiryStatus(expiryDate: string | null | undefined): "expired" | "expiring" | "ok" | "none" {
  if (!expiryDate) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 30) return "expiring";
  return "ok";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StaffDocumentList({
  documents,
  staffMembers,
  onRefresh,
}: StaffDocumentListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const staffById = Object.fromEntries(
    staffMembers.map((s) => [s.id, s.full_name])
  );

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteStaffDocument(id);
      toast.success("Document supprimé");
      onRefresh();
    } catch (error) {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">Aucun document RH.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employé</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Nom du document</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Expiration</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => {
            const expiryStatus = getExpiryStatus(doc.expiry_date);
            const isDeleting = deletingId === doc.id;

            return (
              <TableRow key={doc.id}>
                {/* Employee */}
                <TableCell className="font-medium">
                  {staffById[doc.staff_member_id] ?? doc.staff_member_id}
                </TableCell>

                {/* Type badge */}
                <TableCell>
                  <Badge
                    className={cn(
                      DOCUMENT_TYPE_BADGE_CLASS[doc.type as DocumentType] ??
                        DOCUMENT_TYPE_BADGE_CLASS.autre
                    )}
                  >
                    {DOCUMENT_TYPE_LABELS[doc.type as DocumentType] ?? doc.type}
                  </Badge>
                </TableCell>

                {/* Name */}
                <TableCell className="max-w-[200px] truncate">
                  {doc.name}
                </TableCell>

                {/* Date */}
                <TableCell>{formatDate(doc.date)}</TableCell>

                {/* Expiry */}
                <TableCell>
                  {expiryStatus === "none" ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-sm",
                        expiryStatus === "expired" && "text-red-600 font-medium",
                        expiryStatus === "expiring" && "text-orange-600 font-medium"
                      )}
                    >
                      {(expiryStatus === "expired" || expiryStatus === "expiring") && (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      )}
                      {formatDate(doc.expiry_date)}
                      {expiryStatus === "expired" && " (expiré)"}
                      {expiryStatus === "expiring" && " (bientôt)"}
                    </span>
                  )}
                </TableCell>

                {/* Actions */}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {doc.file_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-9 gap-1"
                        render={
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                          />
                        }
                      >
                        <Download className="h-3.5 w-3.5" />
                        Télécharger
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-9 gap-1 text-red-700 border-red-300 hover:bg-red-50"
                      disabled={isDeleting}
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
