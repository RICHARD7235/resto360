"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Ticket, Trash2, CalendarRange, Users } from "lucide-react";
import {
  togglePromotion,
  deletePromotion,
} from "@/app/(dashboard)/marketing/actions";
import type { MarketingPromotion } from "@/types/marketing";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function promoStatus(p: MarketingPromotion): {
  label: string;
  color: string;
} {
  const today = new Date().toISOString().slice(0, 10);
  if (!p.is_active) return { label: "Désactivée", color: "bg-muted text-muted-foreground" };
  if (p.ends_at < today) return { label: "Expirée", color: "bg-rose-100 text-rose-700" };
  if (p.starts_at > today)
    return { label: "À venir", color: "bg-amber-100 text-amber-800" };
  if (p.max_uses && p.uses_count >= p.max_uses)
    return { label: "Épuisée", color: "bg-rose-100 text-rose-700" };
  return { label: "Active", color: "bg-emerald-100 text-emerald-800" };
}

export function PromotionList({
  promotions,
}: {
  promotions: MarketingPromotion[];
}) {
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handleToggle = (id: string, next: boolean) => {
    setBusyId(id);
    startTransition(async () => {
      await togglePromotion(id, next);
      setBusyId(null);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer ce code promo ?")) return;
    setBusyId(id);
    startTransition(async () => {
      await deletePromotion(id);
      setBusyId(null);
    });
  };

  if (promotions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
        Aucun code promo.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {promotions.map((p) => {
        const status = promoStatus(p);
        const discountLabel =
          p.discount_type === "percent"
            ? `-${p.discount_value}%`
            : `-${p.discount_value}€`;
        const usagePct =
          p.max_uses && p.max_uses > 0
            ? Math.min(100, Math.round((p.uses_count / p.max_uses) * 100))
            : null;
        return (
          <Card key={p.id}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-5 w-5 text-[#F39C12]" />
                    <h3 className="font-mono text-lg font-bold tracking-wider">
                      {p.code}
                    </h3>
                    <Badge className={status.color} variant="secondary">
                      {status.label}
                    </Badge>
                  </div>
                  {p.description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-[#E85D26]">
                      {discountLabel}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarRange className="h-3 w-3" />
                      {formatDate(p.starts_at)} → {formatDate(p.ends_at)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      {p.uses_count} utilisation{p.uses_count > 1 ? "s" : ""}
                      {p.max_uses ? ` / ${p.max_uses}` : ""}
                    </div>
                  </div>
                  {usagePct !== null && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-[#E85D26] transition-all"
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={(v) => handleToggle(p.id, v)}
                    disabled={pending && busyId === p.id}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(p.id)}
                    disabled={pending && busyId === p.id}
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
