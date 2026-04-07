"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { PinPad } from "./PinPad";
import { validateTaskAction } from "../../actions";
import type { QhsTaskInstanceWithContext } from "@/lib/supabase/qhs/types";

interface Props {
  instance: QhsTaskInstanceWithContext | null;
  onClose: () => void;
}

type Step = "pin" | "photo" | "comment" | "submitting";

export function ValidateTaskDialog({ instance, onClose }: Props) {
  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [commentaire, setCommentaire] = useState("");

  if (!instance) return null;

  const photoRequired = instance.template.photo_required;

  const handlePinComplete = (p: string) => {
    setPin(p);
    setStep(photoRequired ? "photo" : "comment");
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setPhoto(f);
      setStep("comment");
    }
  };

  const reset = () => {
    setStep("pin");
    setPin("");
    setPhoto(null);
    setCommentaire("");
  };

  const submit = async () => {
    setStep("submitting");
    const fd = new FormData();
    fd.set("instanceId", instance.id);
    fd.set("pin", pin);
    if (photo) fd.set("photo", photo);
    if (commentaire) fd.set("commentaire", commentaire);

    const result = await validateTaskAction(fd);
    if (result.ok) {
      toast.success("Tâche validée");
      reset();
      onClose();
    } else {
      toast.error(result.error || "Erreur lors de la validation");
      setStep("pin");
      setPin("");
    }
  };

  return (
    <Dialog
      open={!!instance}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Valider : {instance.template.libelle}</DialogTitle>
        </DialogHeader>

        {step === "pin" && (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Saisissez votre code PIN
            </p>
            <PinPad onComplete={handlePinComplete} />
          </div>
        )}

        {step === "photo" && (
          <div className="space-y-4">
            <p className="text-sm">
              Photo obligatoire pour cette tâche critique
            </p>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="block w-full"
            />
          </div>
        )}

        {step === "comment" && (
          <div className="space-y-4">
            <Textarea
              placeholder="Commentaire (optionnel)"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              className="resize-none"
            />
            <Button onClick={submit} className="w-full">
              Confirmer la validation
            </Button>
          </div>
        )}

        {step === "submitting" && (
          <p className="text-center py-8 text-muted-foreground">
            Validation en cours…
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
