import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KeywordExtraction } from "@/types/reviews";

export function TopKeywordsCloud({ keywords }: { keywords: KeywordExtraction }) {
  const maxPos = Math.max(1, ...keywords.positive.map((k) => k.count));
  const maxNeg = Math.max(1, ...keywords.negative.map((k) => k.count));
  const sizeFor = (count: number, max: number) =>
    `${0.85 + (count / max) * 0.9}rem`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mots-clés détectés</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Positifs
          </p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            {keywords.positive.length === 0 && (
              <span className="text-sm text-muted-foreground">Aucun</span>
            )}
            {keywords.positive.map((k) => (
              <span
                key={k.word}
                className="font-medium text-emerald-700"
                style={{ fontSize: sizeFor(k.count, maxPos) }}
                title={`${k.count} occurrence(s)`}
              >
                {k.word}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-rose-600">
            Négatifs
          </p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            {keywords.negative.length === 0 && (
              <span className="text-sm text-muted-foreground">Aucun</span>
            )}
            {keywords.negative.map((k) => (
              <span
                key={k.word}
                className="font-medium text-rose-700"
                style={{ fontSize: sizeFor(k.count, maxNeg) }}
                title={`${k.count} occurrence(s)`}
              >
                {k.word}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
