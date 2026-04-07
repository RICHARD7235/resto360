import { Card, CardContent } from "@/components/ui/card";
import { Megaphone, MailOpen, Users, Ticket, CalendarClock, Send } from "lucide-react";
import type { MarketingKpis } from "@/types/marketing";

export function MarketingKpiCards({ kpis }: { kpis: MarketingKpis }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Campagnes actives</p>
              <p className="mt-2 text-3xl font-bold">{kpis.activeCampaigns}</p>
              {kpis.scheduledCampaigns > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarClock className="h-3 w-3" />
                  {kpis.scheduledCampaigns} planifiée
                  {kpis.scheduledCampaigns > 1 ? "s" : ""}
                </p>
              )}
            </div>
            <Megaphone className="h-8 w-8 text-[#E85D26]" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Taux d&apos;ouverture moyen</p>
              <p className="mt-2 text-3xl font-bold">
                {Math.round(kpis.avgOpenRate * 100)}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                sur campagnes envoyées
              </p>
            </div>
            <MailOpen className="h-8 w-8 text-emerald-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Destinataires touchés</p>
              <p className="mt-2 text-3xl font-bold">
                {kpis.totalRecipients.toLocaleString("fr-FR")}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">cumul envois</p>
            </div>
            <Users className="h-8 w-8 text-muted-foreground/60" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Promos actives</p>
              <p className="mt-2 text-3xl font-bold">{kpis.activePromotions}</p>
              {kpis.scheduledPosts > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Send className="h-3 w-3" />
                  {kpis.scheduledPosts} post
                  {kpis.scheduledPosts > 1 ? "s" : ""} planifié
                  {kpis.scheduledPosts > 1 ? "s" : ""}
                </p>
              )}
            </div>
            <Ticket className="h-8 w-8 text-[#F39C12]" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
