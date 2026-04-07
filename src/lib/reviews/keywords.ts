import type { KeywordExtraction, Review } from "@/types/reviews";

// Mots-clés positifs FR (cuisine, service, ambiance)
export const POSITIVE_KEYWORDS = [
  "excellent", "parfait", "delicieux", "savoureux", "tendre", "genereux",
  "accueil", "chaleureux", "souriant", "rapide", "efficace", "pro",
  "ambiance", "cadre", "decor", "propre", "frais", "qualite",
  "recommande", "reviendrai", "top", "super", "bravo", "merci",
  "fume", "fondant", "copieux", "genial", "extra", "agreable",
];

// Mots-clés négatifs FR
export const NEGATIVE_KEYWORDS = [
  "froid", "fade", "sec", "dur", "cru", "trop cuit",
  "lent", "long", "attente", "oublie", "desagreable", "impoli",
  "cher", "decu", "decevant", "moyen", "sale", "bruyant", "bonde",
  "petit", "manque", "rate",
];

const STOP_WORDS = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "au", "aux",
  "et", "ou", "mais", "donc", "car", "ni", "or", "que", "qui", "quoi",
  "ce", "cet", "cette", "ces", "mon", "ma", "mes", "ton", "ta", "tes",
  "son", "sa", "ses", "notre", "nos", "votre", "vos", "leur", "leurs",
  "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
  "est", "sont", "etait", "etaient", "ete", "avoir", "etre", "fait",
  "pas", "plus", "tres", "trop", "bien", "tout", "tous", "toute", "toutes",
  "avec", "sans", "pour", "par", "sur", "dans", "chez", "vers",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractKeywords(reviews: Pick<Review, "comment">[]): KeywordExtraction {
  const text = reviews
    .map((r) => r.comment ?? "")
    .filter(Boolean)
    .map(normalize)
    .join(" ");

  const positiveCounts = new Map<string, number>();
  const negativeCounts = new Map<string, number>();

  for (const keyword of POSITIVE_KEYWORDS) {
    if (STOP_WORDS.has(keyword)) continue;
    const regex = new RegExp(`\\b${keyword}\\b`, "g");
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      positiveCounts.set(keyword, matches.length);
    }
  }

  for (const keyword of NEGATIVE_KEYWORDS) {
    if (STOP_WORDS.has(keyword)) continue;
    const regex = new RegExp(`\\b${keyword}\\b`, "g");
    const matches = text.match(regex);
    if (matches && matches.length > 0) {
      negativeCounts.set(keyword, matches.length);
    }
  }

  const toSorted = (map: Map<string, number>) =>
    Array.from(map.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

  return {
    positive: toSorted(positiveCounts),
    negative: toSorted(negativeCounts),
  };
}
