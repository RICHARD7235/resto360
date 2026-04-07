"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { createReview } from "@/app/(dashboard)/avis/actions";
import type { ReviewSource } from "@/types/reviews";

export function NewReviewForm() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    source: "manual" as ReviewSource,
    author_name: "",
    rating: 5,
    comment: "",
    review_date: new Date().toISOString().slice(0, 10),
  });

  const submit = () => {
    startTransition(async () => {
      await createReview(form);
      setOpen(false);
      setForm({
        source: "manual",
        author_name: "",
        rating: 5,
        comment: "",
        review_date: new Date().toISOString().slice(0, 10),
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Nouvel avis
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un avis manuellement</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Nom de l'auteur"
            value={form.author_name}
            onChange={(e) => setForm({ ...form, author_name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              value={form.source}
              onValueChange={(v) => setForm({ ...form, source: (v ?? "manual") as ReviewSource })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manuel</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="tripadvisor">TripAdvisor</SelectItem>
                <SelectItem value="thefork">TheFork</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={String(form.rating)}
              onValueChange={(v) => setForm({ ...form, rating: parseInt(v ?? "5") })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} étoile{n > 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            type="date"
            value={form.review_date}
            onChange={(e) => setForm({ ...form, review_date: e.target.value })}
          />
          <Textarea
            placeholder="Commentaire"
            value={form.comment}
            onChange={(e) => setForm({ ...form, comment: e.target.value })}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={pending || !form.author_name}>
            {pending ? "Enregistrement..." : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
