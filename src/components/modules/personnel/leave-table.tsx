"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
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
import { approveLeaveRequest, rejectLeaveRequest } from "@/app/(dashboard)/personnel/actions";
import {
  LEAVE_TYPE_LABELS,
  type LeaveRequest,
  type LeaveType,
  type StaffMemberWithPosition,
} from "@/types/personnel";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LeaveTableProps {
  requests: LeaveRequest[];
  staffMembers: StaffMemberWithPosition[];
  onRefresh: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getDurationDays(start: string, end: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Approuvé
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        Refusé
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
      En attente
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeaveTable({ requests, staffMembers, onRefresh }: LeaveTableProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const staffById = Object.fromEntries(staffMembers.map((s) => [s.id, s.full_name]));

  async function handleApprove(id: string) {
    setProcessingId(id);
    try {
      await approveLeaveRequest(id);
      toast.success("Demande approuvée");
      onRefresh();
    } catch (error) {
      toast.error("Erreur lors de l'approbation");
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id: string) {
    setProcessingId(id);
    try {
      await rejectLeaveRequest(id);
      toast.success("Demande refusée");
      onRefresh();
    } catch (error) {
      toast.error("Erreur lors du refus");
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">Aucune demande de congé.</p>
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
            <TableHead>Du</TableHead>
            <TableHead>Au</TableHead>
            <TableHead className="text-right">Durée</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Motif</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((req) => {
            const isPending = req.status === "pending";
            const isProcessing = processingId === req.id;
            const duration = getDurationDays(req.start_date, req.end_date);
            const typeLabel =
              LEAVE_TYPE_LABELS[req.leave_type as LeaveType] ?? req.leave_type;

            return (
              <TableRow key={req.id}>
                <TableCell className="font-medium">
                  {staffById[req.staff_member_id] ?? req.staff_member_id}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{typeLabel}</Badge>
                </TableCell>
                <TableCell>{formatDate(req.start_date)}</TableCell>
                <TableCell>{formatDate(req.end_date)}</TableCell>
                <TableCell className="text-right">{duration}j</TableCell>
                <TableCell>
                  <StatusBadge status={req.status} />
                </TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">
                  {req.reason ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  {isPending && (
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn("min-h-9 gap-1 text-green-700 border-green-300 hover:bg-green-50")}
                        disabled={isProcessing}
                        onClick={() => handleApprove(req.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn("min-h-9 gap-1 text-red-700 border-red-300 hover:bg-red-50")}
                        disabled={isProcessing}
                        onClick={() => handleReject(req.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                        Refuser
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
