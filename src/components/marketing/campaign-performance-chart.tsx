"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import type { MarketingCampaign } from "@/types/marketing";

export function CampaignPerformanceChart({
  campaigns,
}: {
  campaigns: MarketingCampaign[];
}) {
  const sent = campaigns
    .filter((c) => c.status === "sent" && c.recipients_count > 0)
    .slice(0, 6)
    .reverse();

  const data = sent.map((c) => ({
    name: c.name.length > 18 ? c.name.slice(0, 16) + "…" : c.name,
    ouvertures: Math.round((c.opens_count / c.recipients_count) * 100),
    clics: Math.round((c.clicks_count / c.recipients_count) * 100),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance des campagnes</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Aucune campagne envoyée pour le moment.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="ouvertures" fill="#E85D26" radius={[6, 6, 0, 0]} />
              <Bar dataKey="clics" fill="#F39C12" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
