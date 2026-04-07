"use client";

import { useRef, useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PinPad } from "./PinPad";
import { validateTaskAction } from "@/app/(dashboard)/qualite/actions";
import type { QhsTaskInstanceWithContext } from "@/lib/supabase/qhs/types";

interface Props {
  instance: QhsTaskInstanceWithContext | null;
  onClose: () => void;
}

export function ValidateTaskDialog({ instance, onClose }: Props) {
  const [pin, setPin] = useState("");
  // pinKey force le reset de PinPad (composant uncontrolled) à chaque ouverture
  const [pinKey, setPinKey] = useState(0);
  const [commentaire, setCommentaire] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const photoRef = useRef<HTMLInputElement>(null);

  const open = instance !== null;

  const handleClose = () => {
    setPin("");
    setPinKey((k) => k + 1);
    setCommentaire("");
    setError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!instance) return;
    if (pin.length < 4) {
      setError("Le PIN doit comporter au moins 4 chiffres.");
      return;
    }

    const fd = new FormData();
    fd.append("instanceId", instance.id);
    fd.append("pin", pin);
    if (commentaire) fd.append("commentaire", commentaire);
    const photo = photoRef.current?.files?.[0];
    if (photo) fd.append("photo", photo);

    startTransition(async () => {
      const result = await validateTaskAction(fd);
      if (result.ok) {
        handleClose();
      } else {
        setError(result.error ?? "Erreur lors de la validation.");
        // Reset PinPad pour ressaisir
        setPin("");
        setPinKey((k) => k + 1);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Valider la tâche</DialogTitle>
        </DialogHeader>

        {instance && (
          <div className="space-y-4">
            <p className="text-sm font-medium">{instance.template.libelle}</p>

            <div className="space-y-2">
              <Label>PIN de validation</Label>
              <PinPad key={pinKey} onComplete={(p) => setPin(p)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="commentaire">Commentaire (optionnel)</Label>
              <Textarea
                id="commentaire"
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
                placeholder="Observations, remarques..."
                rows={3}
              />
            </div>

            {instance.template.photo_required && (
              <div className="space-y-2">
                <Label htmlFor="photo">Photo (requise)</Label>
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={photoRef}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || pin.length < 4}>
            {isPending ? "Validation..." : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
