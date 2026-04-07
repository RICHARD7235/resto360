"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatByKind } from "@/lib/comptabilite/format";

type Props = {
  data: { label: string; budget: number; realise: number | null }[];
};

export function BudgetCumulChart({ data }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">CA cumulé — budget vs réalisé</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#6b7280" />
            <YAxis
              tickFormatter={(v) => formatByKind(Number(v), "eur", true)}
              tick={{ fontSize: 11 }}
              stroke="#6b7280"
              width={70}
            />
            <Tooltip
              formatter={(v, name) => [
                v == null ? "—" : formatByKind(Number(v), "eur"),
                String(name),
              ]}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="budget"
              name="Budget cumulé"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="realise"
              name="Réalisé YTD"
              stroke="#E85D26"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
