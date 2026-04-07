"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEur } from "@/lib/comptabilite/format";

type Props = {
  data: { period: string; ca_ht: number }[];
};

const MONTHS_FR = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];

function formatXAxis(period: string): string {
  const [y, m] = period.split("-");
  const monthIdx = Number(m) - 1;
  return `${MONTHS_FR[monthIdx]} ${y.slice(2)}`;
}

export function CaHeroChart({ data }: Props) {
  const avg = data.length ? data.reduce((s, d) => s + d.ca_ht, 0) / data.length : 0;

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="period"
            tickFormatter={formatXAxis}
            tick={{ fontSize: 11 }}
            stroke="#6b7280"
          />
          <YAxis
            tickFormatter={(v) => formatEur(v, { compact: true })}
            tick={{ fontSize: 11 }}
            stroke="#6b7280"
            width={70}
          />
          <Tooltip
            formatter={(v) => [formatEur(Number(v)), "CA HT"]}
            labelFormatter={(label) => formatXAxis(String(label))}
            contentStyle={{ fontSize: 12 }}
          />
          <ReferenceLine
            y={avg}
            stroke="#2D3436"
            strokeDasharray="4 4"
            label={{ value: `Moy. ${formatEur(avg, { compact: true })}`, fontSize: 10, fill: "#2D3436", position: "insideTopRight" }}
          />
          <Bar dataKey="ca_ht" fill="#E85D26" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
