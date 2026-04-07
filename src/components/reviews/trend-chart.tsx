"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { TrendPoint } from "@/types/reviews";

export function RatingTrendChart({
  trend30,
  trend90,
}: {
  trend30: TrendPoint[];
  trend90: TrendPoint[];
}) {
  const [range, setRange] = useState<30 | 90>(30);
  const data = (range === 30 ? trend30 : trend90).map((p) => ({
    date: p.date.slice(5),
    moyenne: p.average === 0 ? null : Number(p.average.toFixed(2)),
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Évolution de la note moyenne</CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={range === 30 ? "default" : "outline"}
            onClick={() => setRange(30)}
          >
            30j
          </Button>
          <Button
            size="sm"
            variant={range === 90 ? "default" : "outline"}
            onClick={() => setRange(90)}
          >
            90j
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="moyenne"
              stroke="#E85D26"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
