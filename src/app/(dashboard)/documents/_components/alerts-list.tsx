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
import { formatExpiry, urgencyColor, urgencyLabel } from "@/lib/documents/format";
import type { DocumentWithStatus } from "@/types/documents";

interface AlertsListProps {
  documents: DocumentWithStatus[];
}

export function AlertsList({ documents }: AlertsListProps) {
  if (documents.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        Aucun document à renouveler dans les 90 prochains jours.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Document</TableHead>
            <TableHead>Échéance</TableHead>
            <TableHead>Jours restants</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/documents/${doc.id}`}
                  className="hover:underline text-primary"
                >
                  {doc.title}
                </Link>
              </TableCell>
              <TableCell>{formatExpiry(doc.expires_at)}</TableCell>
              <TableCell>
                {doc.days_until_expiry !== null
                  ? `${doc.days_until_expiry} j`
                  : "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={urgencyColor(doc.urgency_level)}
                >
                  {urgencyLabel(doc.urgency_level)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
