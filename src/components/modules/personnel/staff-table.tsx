"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import type { StaffMemberWithPosition, Department } from "@/types/personnel";
import { DEPARTMENT_LABELS, DEPARTMENT_COLORS } from "@/types/personnel";

interface StaffTableProps {
  staffMembers: StaffMemberWithPosition[];
}

export function StaffTable({ staffMembers }: StaffTableProps) {
  const router = useRouter();

  if (staffMembers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
        <p className="text-sm text-muted-foreground">Aucun employé trouvé.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Poste</TableHead>
            <TableHead>Département</TableHead>
            <TableHead>Contrat</TableHead>
            <TableHead className="text-right">Heures/sem</TableHead>
            <TableHead className="text-right">Taux horaire</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffMembers.map((staff) => (
            <TableRow
              key={staff.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/personnel/equipe/${staff.id}`)}
            >
              <TableCell className="font-medium">{staff.full_name}</TableCell>
              <TableCell className="text-muted-foreground">
                {staff.job_position_title ?? "—"}
              </TableCell>
              <TableCell>
                {staff.department ? (
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: DEPARTMENT_COLORS[staff.department as Department],
                      color: DEPARTMENT_COLORS[staff.department as Department],
                    }}
                  >
                    {DEPARTMENT_LABELS[staff.department as Department]}
                  </Badge>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell>{staff.contract_type ?? "—"}</TableCell>
              <TableCell className="text-right">
                {staff.contract_hours ? `${staff.contract_hours}h` : "—"}
              </TableCell>
              <TableCell className="text-right">
                {staff.hourly_rate ? `${staff.hourly_rate.toFixed(2)} €` : "—"}
              </TableCell>
              <TableCell>
                <Badge variant={staff.is_active ? "default" : "secondary"}>
                  {staff.is_active ? "Actif" : "Inactif"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
