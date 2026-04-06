"use client";

import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Phone,
  Mail,
  CalendarDays,
  Clock,
  Users,
  Utensils,
  Hash,
  StickyNote,
  Pencil,
  Check,
  X,
  Armchair,
  CircleCheck,
  CircleX,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/types/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReservationDetailProps {
  reservation: Tables<"reservations"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onStatusChange: (status: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "En attente", variant: "outline" },
  confirmed: { label: "Confirmee", variant: "default" },
  seated: { label: "En salle", variant: "secondary" },
  completed: { label: "Terminee", variant: "secondary" },
  cancelled: { label: "Annulee", variant: "destructive" },
  no_show: { label: "No-show", variant: "destructive" },
};

const typeLabels: Record<string, string> = {
  restaurant: "Restaurant",
  salle: "Location salle",
  seminaire: "Seminaire",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateFull(dateStr: string): string {
  const date = parseISO(dateStr);
  // "Vendredi 10 avril 2026"
  return format(date, "EEEE d MMMM yyyy", { locale: fr });
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatTimestamp(ts: string): string {
  return format(parseISO(ts), "d MMM yyyy 'a' HH:mm", { locale: fr });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
      {children}
    </h3>
  );
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm break-words">{children}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action buttons per status
// ---------------------------------------------------------------------------

function StatusActions({
  status,
  onStatusChange,
}: {
  status: string;
  onStatusChange: (status: string) => Promise<void>;
}) {
  const actions: {
    label: string;
    status: string;
    variant: "default" | "outline" | "destructive" | "secondary";
    icon: React.ComponentType<{ className?: string }>;
  }[] = [];

  if (status === "pending") {
    actions.push(
      { label: "Confirmer", status: "confirmed", variant: "default", icon: Check },
      { label: "Annuler", status: "cancelled", variant: "destructive", icon: X },
    );
  }

  if (status === "confirmed") {
    actions.push(
      { label: "Installer", status: "seated", variant: "default", icon: Armchair },
      { label: "Annuler", status: "cancelled", variant: "destructive", icon: X },
    );
  }

  if (status === "seated") {
    actions.push({
      label: "Terminer",
      status: "completed",
      variant: "default",
      icon: CircleCheck,
    });
  }

  if (status === "pending" || status === "confirmed") {
    actions.push({
      label: "No-show",
      status: "no_show",
      variant: "destructive",
      icon: CircleX,
    });
  }

  if (actions.length === 0) return null;

  return (
    <div className="space-y-2">
      <SectionTitle>Actions rapides</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.status}
            variant={action.variant}
            className="min-h-11 gap-1.5"
            onClick={() => onStatusChange(action.status)}
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReservationDetail({
  reservation,
  open,
  onOpenChange,
  onEdit,
  onStatusChange,
}: ReservationDetailProps) {
  if (!reservation) return null;

  const status = statusConfig[reservation.status ?? "pending"] ?? statusConfig.pending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        {/* ---- Header ---- */}
        <SheetHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <SheetTitle className="text-lg">
              {reservation.customer_name}
            </SheetTitle>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <SheetDescription>
            {capitalize(formatDateFull(reservation.date))} — {reservation.time.slice(0, 5)}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 px-4 pb-4">
          {/* ---- Contact ---- */}
          <div>
            <SectionTitle>Contact</SectionTitle>
            {reservation.customer_phone && (
              <InfoRow icon={Phone} label="Telephone">
                <a
                  href={`tel:${reservation.customer_phone}`}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {reservation.customer_phone}
                </a>
              </InfoRow>
            )}
            {reservation.customer_email && (
              <InfoRow icon={Mail} label="Email">
                <a
                  href={`mailto:${reservation.customer_email}`}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {reservation.customer_email}
                </a>
              </InfoRow>
            )}
            {!reservation.customer_phone && !reservation.customer_email && (
              <p className="text-sm text-muted-foreground italic">
                Aucune information de contact
              </p>
            )}
          </div>

          {/* ---- Details ---- */}
          <div>
            <SectionTitle>Details</SectionTitle>
            <InfoRow icon={CalendarDays} label="Date">
              {capitalize(formatDateFull(reservation.date))}
            </InfoRow>
            <InfoRow icon={Clock} label="Heure">
              {reservation.time.slice(0, 5)}
              {reservation.end_time && ` — ${reservation.end_time.slice(0, 5)}`}
            </InfoRow>
            <InfoRow icon={Users} label="Couverts">
              {reservation.party_size} personne{reservation.party_size > 1 ? "s" : ""}
            </InfoRow>
            <InfoRow icon={Utensils} label="Type">
              {typeLabels[reservation.type ?? ""] ?? reservation.type}
            </InfoRow>
            {reservation.table_number && (
              <InfoRow icon={Hash} label="Table">
                {reservation.table_number}
              </InfoRow>
            )}
            {reservation.notes && (
              <InfoRow icon={StickyNote} label="Notes">
                {reservation.notes}
              </InfoRow>
            )}
          </div>

          {/* ---- Quick actions ---- */}
          <StatusActions
            status={reservation.status ?? "pending"}
            onStatusChange={onStatusChange}
          />

          {/* ---- Edit button ---- */}
          <Button
            variant="outline"
            className="w-full min-h-11 gap-1.5"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
            Modifier
          </Button>
        </div>

        {/* ---- Footer: timestamps ---- */}
        <SheetFooter>
          <div className="w-full space-y-0.5 text-xs text-muted-foreground">
            <p>Cree le {formatTimestamp(reservation.created_at ?? new Date().toISOString())}</p>
            <p>Modifie le {formatTimestamp(reservation.updated_at ?? new Date().toISOString())}</p>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
