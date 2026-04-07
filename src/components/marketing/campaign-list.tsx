"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  MessageSquare,
  Send,
  Trash2,
  Users,
  MailOpen,
  MousePointerClick,
} from "lucide-react";
import {
  markCampaignSent,
  deleteCampaign,
} from "@/app/(dashboard)/marketing/actions";
import type { MarketingCampaign, MarketingSegment } from "@/types/marketing";

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  scheduled: "Planifiée",
  sent: "Envoyée",
  archived: "Archivée",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  scheduled: "bg-amber-100 text-amber-800",
  sent: "bg-emerald-100 text-emerald-800",
  archived: "bg-muted text-muted-foreground",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CampaignList({
  campaigns,
  segments,
}: {
  campaigns: MarketingCampaign[];
  segments: MarketingSegment[];
}) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const segmentName = (id: string | null) =>
    segments.find((s) => s.id === id)?.name ?? "—";

  const handleSend = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      await markCampaignSent(id);
      setBusyId(null);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer cette campagne ?")) return;
    setBusyId(id);
    startTransition(async () => {
      await deleteCampaign(id);
      setBusyId(null);
    });
  };

  if (campaigns.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
        Aucune campagne pour l&apos;instant.
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {campaigns.map((c) => {
        const openRate =
          c.recipients_count > 0
            ? Math.round((c.opens_count / c.recipients_count) * 100)
            : 0;
        const clickRate =
          c.recipients_count > 0
            ? Math.round((c.clicks_count / c.recipients_count) * 100)
            : 0;
        return (
          <Card key={c.id}>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {c.channel === "email" ? (
                      <Mail className="h-4 w-4 text-[#E85D26]" />
                    ) : (
                      <MessageSquare className="h-4 w-4 text-[#E85D26]" />
                    )}
                    <h3 className="font-semibold">{c.name}</h3>
                    <Badge
                      className={STATUS_COLOR[c.status] ?? ""}
                      variant="secondary"
                    >
                      {STATUS_LABEL[c.status]}
                    </Badge>
                  </div>
                  {c.subject && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {c.subject}
                    </p>
                  )}
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {c.message}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {segmentName(c.segment_id)}
                    </span>
                    {c.status === "sent" && (
                      <>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {c.recipients_count.toLocaleString("fr-FR")} envoyés
                        </span>
                        <span className="flex items-center gap-1">
                          <MailOpen className="h-3 w-3" /> {openRate}% ouverts
                        </span>
                        <span className="flex items-center gap-1">
                          <MousePointerClick className="h-3 w-3" /> {clickRate}
                          % clics
                        </span>
                        <span>Envoyée {formatDate(c.sent_at)}</span>
                      </>
                    )}
                    {c.status === "scheduled" && (
                      <span>Planifiée : {formatDate(c.scheduled_at)}</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {(c.status === "draft" || c.status === "scheduled") && (
                    <Button
                      size="sm"
                      onClick={() => handleSend(c.id)}
                      disabled={pending && busyId === c.id}
                    >
                      <Send className="mr-1.5 h-3.5 w-3.5" /> Envoyer
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(c.id)}
                    disabled={pending && busyId === c.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
