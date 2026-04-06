"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { LeaveBalance, StaffMemberWithPosition } from "@/types/personnel";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LeaveBalanceCardProps {
  balances: LeaveBalance[];
  staffMembers: StaffMemberWithPosition[];
  year: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LeaveBalanceCard({ balances, staffMembers, year }: LeaveBalanceCardProps) {
  // Build a lookup map for staff names
  const staffById = Object.fromEntries(staffMembers.map((s) => [s.id, s.full_name]));

  // Filter only CP balances (RTT handled separately if needed)
  const cpBalances = balances.filter((b) => b.leave_type === "cp");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Soldes congés payés — {year}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {cpBalances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun solde de congés enregistré pour {year}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead className="text-right">Acquis</TableHead>
                  <TableHead className="text-right">Report N-1</TableHead>
                  <TableHead className="text-right">Pris</TableHead>
                  <TableHead className="text-right">Restant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cpBalances.map((balance) => {
                  const remaining =
                    balance.acquired_days + balance.carried_over - balance.taken_days;
                  const isNegative = remaining < 0;

                  return (
                    <TableRow key={balance.id}>
                      <TableCell className="font-medium">
                        {staffById[balance.staff_member_id] ?? balance.staff_member_id}
                      </TableCell>
                      <TableCell className="text-right">
                        {balance.acquired_days}j
                      </TableCell>
                      <TableCell className="text-right">
                        {balance.carried_over}j
                      </TableCell>
                      <TableCell className="text-right">
                        {balance.taken_days}j
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right font-semibold",
                          isNegative ? "text-destructive" : "text-foreground"
                        )}
                      >
                        {remaining}j
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
