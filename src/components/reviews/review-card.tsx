"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { StarRating } from "./star-rating";
import { SourceBadge } from "./source-badge";
import { respondToReview } from "@/app/(dashboard)/avis/actions";
import { Reply, Calendar } from "lucide-react";
import type { Review } from "@/types/reviews";

const TEMPLATES = [
  "Merci pour votre retour qui nous fait très plaisir ! À bientôt à La Cabane.",
  "Merci d'avoir pris le temps de partager votre expérience. Au plaisir de vous revoir !",
  "Merci pour votre commentaire. Nous sommes désolés que votre expérience n'ait pas été à la hauteur — n'hésitez pas à nous contacter pour en discuter.",
];

export function ReviewCard({ review }: { review: Review }) {
  const [open, setOpen] = useState(false);
  const [response, setResponse] = useState("");
  const [pending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!response.trim()) return;
    startTransition(async () => {
      await respondToReview(review.id, response);
      setOpen(false);
      setResponse("");
    });
  };

  return (
    <Card className={review.status === "to_handle" ? "border-rose-300" : ""}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{review.author_name}</span>
              <SourceBadge source={review.source} />
              {review.status === "to_handle" && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                  À traiter
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} />
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(review.review_date).toLocaleDateString("fr-FR")}
              </span>
            </div>
          </div>
        </div>

        {review.comment && (
          <p className="mt-3 text-sm text-foreground/90">{review.comment}</p>
        )}

        {review.response ? (
          <div className="mt-4 rounded-lg border-l-4 border-primary bg-muted/40 p-3">
            <p className="text-xs font-semibold text-primary">Votre réponse</p>
            <p className="mt-1 text-sm">{review.response}</p>
          </div>
        ) : (
          <div className="mt-4">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger
                render={
                  <Button size="sm" variant="outline">
                    <Reply className="mr-2 h-3 w-3" /> Répondre
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Répondre à {review.author_name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {TEMPLATES.map((t, i) => (
                      <Button
                        key={i}
                        size="sm"
                        variant="outline"
                        onClick={() => setResponse(t)}
                      >
                        Modèle {i + 1}
                      </Button>
                    ))}
                  </div>
                  <Textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    rows={5}
                    placeholder="Votre réponse..."
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Annuler
                  </Button>
                  <Button onClick={handleSubmit} disabled={pending || !response.trim()}>
                    {pending ? "Envoi..." : "Publier"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
