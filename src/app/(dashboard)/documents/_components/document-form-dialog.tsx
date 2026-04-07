"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDocument } from "../actions";
import type { DocumentCategory } from "@/types/documents";

interface DocumentFormDialogProps {
  categories: DocumentCategory[];
}

export function DocumentFormDialog({ categories }: DocumentFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [categoryId, setCategoryId] = useState<string>("");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("category_id", categoryId);
    startTransition(async () => {
      const res = await createDocument(formData);
      if (res.ok) {
        toast.success("Document créé avec succès");
        setOpen(false);
        setCategoryId("");
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error(res.error ?? "Erreur lors de la création");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau document
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau document</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input id="title" name="title" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie *</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Choisir..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="issued_at">Date d&apos;émission</Label>
              <Input id="issued_at" name="issued_at" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires_at">Date d&apos;échéance</Label>
              <Input id="expires_at" name="expires_at" type="date" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="reference_number">Référence</Label>
              <Input id="reference_number" name="reference_number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="issuer">Émetteur</Label>
              <Input id="issuer" name="issuer" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="file">Fichier *</Label>
            <Input id="file" name="file" type="file" required />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={pending || !categoryId}>
              {pending ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
