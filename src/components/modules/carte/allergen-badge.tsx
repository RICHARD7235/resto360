"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// 14 allergènes réglementaires EU (Règlement INCO 1169/2011)
const ALLERGEN_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  gluten: { label: "Gluten", emoji: "🌾", color: "bg-amber-100 text-amber-800 border-amber-200" },
  crustaces: { label: "Crustacés", emoji: "🦐", color: "bg-red-100 text-red-800 border-red-200" },
  oeuf: { label: "Œufs", emoji: "🥚", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  poisson: { label: "Poisson", emoji: "🐟", color: "bg-blue-100 text-blue-800 border-blue-200" },
  arachide: { label: "Arachides", emoji: "🥜", color: "bg-orange-100 text-orange-800 border-orange-200" },
  soja: { label: "Soja", emoji: "🫘", color: "bg-green-100 text-green-800 border-green-200" },
  lait: { label: "Lait", emoji: "🥛", color: "bg-sky-100 text-sky-800 border-sky-200" },
  fruits_a_coque: { label: "Fruits à coque", emoji: "🌰", color: "bg-amber-100 text-amber-900 border-amber-300" },
  celeri: { label: "Céleri", emoji: "🥬", color: "bg-lime-100 text-lime-800 border-lime-200" },
  moutarde: { label: "Moutarde", emoji: "🟡", color: "bg-yellow-100 text-yellow-900 border-yellow-300" },
  sesame: { label: "Sésame", emoji: "⚪", color: "bg-stone-100 text-stone-800 border-stone-200" },
  sulfites: { label: "Sulfites", emoji: "🍷", color: "bg-purple-100 text-purple-800 border-purple-200" },
  lupin: { label: "Lupin", emoji: "🌸", color: "bg-pink-100 text-pink-800 border-pink-200" },
  mollusques: { label: "Mollusques", emoji: "🦪", color: "bg-slate-100 text-slate-800 border-slate-200" },
};

export const ALL_ALLERGENS = Object.keys(ALLERGEN_MAP);

export function AllergenBadge({ allergen, compact = false }: { allergen: string; compact?: boolean }) {
  const info = ALLERGEN_MAP[allergen];
  if (!info) return <Badge variant="outline">{allergen}</Badge>;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <span
                className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm border ${info.color} cursor-default`}
                aria-label={info.label}
              />
            }
          >
            {info.emoji}
          </TooltipTrigger>
          <TooltipContent>{info.label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge variant="outline" className={`${info.color} gap-1`}>
      <span>{info.emoji}</span>
      {info.label}
    </Badge>
  );
}

export function AllergenList({ allergens, compact = false }: { allergens: string[]; compact?: boolean }) {
  if (!allergens || allergens.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {allergens.map((a) => (
        <AllergenBadge key={a} allergen={a} compact={compact} />
      ))}
    </div>
  );
}
