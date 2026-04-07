"use client";

import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { formatExpiry, urgencyColor, urgencyLabel } from "@/lib/documents/format";
import type { DocumentWithStatus } from "@/types/documents";

interface DocumentsTableProps {
  documents: DocumentWithStatus[];
}

export function DocumentsTable({ documents }: DocumentsTableProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        (d.reference_number ?? "").toLowerCase().includes(q) ||
        (d.issuer ?? "").toLowerCase().includes(q)
    );
  }, [documents, search]);

  return (
    <div className="space-y-3">
      <Input
        placeholder="Rechercher par titre, référence, émetteur..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Référence</TableHead>
              <TableHead>Émetteur</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Aucun document
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link
                      href={`/documents/${d.id}`}
                      className="font-medium hover:underline"
                    >
                      {d.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.reference_number ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {d.issuer ?? "—"}
                  </TableCell>
                  <TableCell>{formatExpiry(d.expires_at)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={urgencyColor(d.urgency_level)}
                    >
                      {urgencyLabel(d.urgency_level)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
