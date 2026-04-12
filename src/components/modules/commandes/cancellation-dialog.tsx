"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CancelTarget {
  type: "item" | "order";
  id: string;
  label: string;
}

interface CancellationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: CancelTarget | null;
  onConfirm: (reason: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Predefined reasons
// ---------------------------------------------------------------------------

const REASONS = [
  "Rupture de stock",
  "Erreur de commande",
  "Demande client",
  "Autre",
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CancellationDialog({
  open,
  onOpenChange,
  target,
  onConfirm,
}: CancellationDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isOther = selectedReason === "Autre";
  const finalReason = isOther ? customReason.trim() : selectedReason;
  const canSubmit = !!finalReason && finalReason.length > 0;

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelectedReason(null);
      setCustomReason("");
    }
    onOpenChange(next);
  }

  async function handleConfirm() {
    if (!finalReason) return;
    setSubmitting(true);
    try {
      await onConfirm(finalReason);
      handleOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (!target) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {target.type === "order"
              ? "Annuler la commande"
              : "Annuler un article"}
          </DialogTitle>
          <DialogDescription>
            {target.label}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <p className="text-sm font-medium">Motif de l&apos;annulation</p>
          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((reason) => (
              <Button
                key={reason}
                variant={selectedReason === reason ? "default" : "outline"}
                className={cn(
                  "min-h-11 justify-start",
                  selectedReason === reason && "ring-2 ring-primary"
                )}
                onClick={() => setSelectedReason(reason)}
              >
                {reason}
              </Button>
            ))}
          </div>

          {isOther && (
            <Textarea
              placeholder="Précisez la raison..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className="min-h-[44px]"
              autoFocus
            />
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => handleOpenChange(false)}
          >
            Retour
          </Button>
          <Button
            variant="destructive"
            className="min-h-11"
            disabled={!canSubmit || submitting}
            onClick={handleConfirm}
          >
            {submitting ? "Annulation..." : "Confirmer l'annulation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
