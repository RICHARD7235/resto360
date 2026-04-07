"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addVersion } from "../actions";

interface AddVersionDialogProps {
  documentId: string;
}

export function AddVersionDialog({ documentId }: AddVersionDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const res = await addVersion(documentId, formData);
      if (res.ok) {
        toast.success("Nouvelle version ajoutée");
        setOpen(false);
        form.reset();
      } else {
        toast.error(res.error ?? "Erreur");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Nouvelle version
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter une nouvelle version</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Fichier *</Label>
            <Input id="file" name="file" type="file" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="change_notes">Notes de modification</Label>
            <Textarea
              id="change_notes"
              name="change_notes"
              rows={3}
              placeholder="Ex: mise à jour annuelle, correction clause..."
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Envoi..." : "Ajouter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
