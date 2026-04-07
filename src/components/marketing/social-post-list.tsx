"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Trash2, Eye, CalendarClock, Camera, ThumbsUp } from "lucide-react";
import { deleteSocialPost } from "@/app/(dashboard)/marketing/actions";
import type { MarketingSocialPost } from "@/types/marketing";
import { SocialPostMockup } from "./social-post-mockup";

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  scheduled: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
  archived: "bg-muted text-muted-foreground",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  scheduled: "Planifié",
  published: "Publié",
  archived: "Archivé",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SocialPostList({
  posts,
}: {
  posts: MarketingSocialPost[];
}) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer ce post ?")) return;
    setBusyId(id);
    startTransition(async () => {
      await deleteSocialPost(id);
      setBusyId(null);
    });
  };

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
        Aucun post planifié.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <Card key={p.id}>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {p.platform === "instagram" ? (
                  <Camera className="h-4 w-4 text-pink-600" />
                ) : (
                  <ThumbsUp className="h-4 w-4 text-blue-600" />
                )}
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {p.platform}
                </span>
              </div>
              <Badge className={STATUS_COLOR[p.status] ?? ""} variant="secondary">
                {STATUS_LABEL[p.status]}
              </Badge>
            </div>
            <p className="line-clamp-4 min-h-[5rem] text-sm">{p.content}</p>
            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="h-3 w-3" />
              {formatDate(p.scheduled_at)}
            </div>
            <div className="mt-3 flex gap-2">
              <Dialog>
                <DialogTrigger
                  render={
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="mr-1.5 h-3.5 w-3.5" /> Aperçu
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Aperçu du post</DialogTitle>
                  </DialogHeader>
                  <div className="flex justify-center py-4">
                    <SocialPostMockup
                      platform={p.platform}
                      content={p.content}
                      imageUrl={p.image_url}
                    />
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(p.id)}
                disabled={pending && busyId === p.id}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
