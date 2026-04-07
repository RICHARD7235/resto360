import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, MessageSquare, Ticket, ThumbsUp, Camera } from "lucide-react";
import type {
  MarketingCampaign,
  MarketingPromotion,
  MarketingSocialPost,
} from "@/types/marketing";

type Item = {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  date: Date;
  badge?: string;
};

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 0) {
    const future = -mins;
    if (future < 60) return `dans ${future} min`;
    if (future < 1440) return `dans ${Math.round(future / 60)} h`;
    return `dans ${Math.round(future / 1440)} j`;
  }
  if (mins < 60) return `il y a ${mins} min`;
  if (mins < 1440) return `il y a ${Math.round(mins / 60)} h`;
  return `il y a ${Math.round(mins / 1440)} j`;
}

export function MarketingActivityFeed({
  campaigns,
  promotions,
  posts,
}: {
  campaigns: MarketingCampaign[];
  promotions: MarketingPromotion[];
  posts: MarketingSocialPost[];
}) {
  const items: Item[] = [];

  for (const c of campaigns) {
    const date = c.sent_at ?? c.scheduled_at ?? c.created_at;
    items.push({
      id: `c-${c.id}`,
      icon:
        c.channel === "email" ? (
          <Mail className="h-4 w-4 text-[#E85D26]" />
        ) : (
          <MessageSquare className="h-4 w-4 text-[#E85D26]" />
        ),
      title: c.name,
      subtitle:
        c.status === "sent"
          ? `Envoyée à ${c.recipients_count.toLocaleString("fr-FR")} destinataires`
          : c.status === "scheduled"
            ? `Planifiée pour ${c.recipients_count.toLocaleString("fr-FR")} destinataires`
            : "Brouillon",
      date: new Date(date),
      badge: c.channel.toUpperCase(),
    });
  }

  for (const p of promotions.slice(0, 4)) {
    items.push({
      id: `p-${p.id}`,
      icon: <Ticket className="h-4 w-4 text-[#F39C12]" />,
      title: `Code ${p.code}`,
      subtitle: `${p.uses_count} utilisation${p.uses_count > 1 ? "s" : ""} · ${
        p.discount_type === "percent"
          ? `-${p.discount_value}%`
          : `-${p.discount_value}€`
      }`,
      date: new Date(p.created_at),
      badge: p.is_active ? "ACTIF" : "EXPIRÉ",
    });
  }

  for (const s of posts.slice(0, 4)) {
    items.push({
      id: `s-${s.id}`,
      icon:
        s.platform === "facebook" ? (
          <ThumbsUp className="h-4 w-4 text-blue-600" />
        ) : (
          <Camera className="h-4 w-4 text-pink-600" />
        ),
      title: s.content.slice(0, 60) + (s.content.length > 60 ? "…" : ""),
      subtitle:
        s.status === "published"
          ? "Publié"
          : s.status === "scheduled"
            ? "Planifié"
            : "Brouillon",
      date: new Date(s.scheduled_at),
      badge: s.platform.toUpperCase(),
    });
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  const top = items.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activité récente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {top.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aucune activité récente.
          </p>
        ) : (
          top.map((it) => (
            <div
              key={it.id}
              className="flex items-start gap-3 rounded-lg border bg-card/50 p-3"
            >
              <div className="mt-0.5 rounded-md bg-muted/50 p-2">{it.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">{it.title}</p>
                  {it.badge && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {it.badge}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {it.subtitle}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatRelative(it.date)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
