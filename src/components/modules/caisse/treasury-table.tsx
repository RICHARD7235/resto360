"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Euro, Truck, Users, Landmark, Home, Shield,
  Wrench, TrendingUp, Hammer, MoreHorizontal, Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { TreasuryEntry, TreasuryCategory } from "@/types/caisse";
import { TREASURY_CATEGORY_LABELS } from "@/types/caisse";

const CATEGORY_ICONS: Record<TreasuryCategory, React.ElementType> = {
  sales: Euro,
  supplier: Truck,
  salary: Users,
  tax: Landmark,
  rent: Home,
  insurance: Shield,
  equipment: Wrench,
  investment: TrendingUp,
  maintenance: Hammer,
  other: MoreHorizontal,
};

const SOURCE_MODULE_LABELS: Record<string, string> = {
  M08_closing: "Z Caisse",
  M05_purchase: "Achats",
  M07_salary: "Personnel",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

interface TreasuryTableProps {
  entries: TreasuryEntry[];
  onDelete: (id: string) => void;
}

export function TreasuryTable({ entries, onDelete }: TreasuryTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | TreasuryCategory>("all");

  const filtered = entries.filter((entry) => {
    const matchSearch =
      search.trim() === "" ||
      entry.label.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || entry.type === typeFilter;
    const matchCategory = categoryFilter === "all" || entry.category === categoryFilter;
    return matchSearch && matchType && matchCategory;
  });

  const categories = Array.from(new Set(entries.map((e) => e.category)));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Rechercher un libellé…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 max-w-xs"
        />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
          <SelectTrigger className="h-11 w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="income">Entrées</SelectItem>
            <SelectItem value="expense">Sorties</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
          <SelectTrigger className="h-11 w-48">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {TREASURY_CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-32">Date</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead className="w-44">Catégorie</TableHead>
              <TableHead className="w-28">Type</TableHead>
              <TableHead className="w-32 text-right">Montant</TableHead>
              <TableHead className="w-32">Source</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground text-sm">
                  Aucune écriture trouvée
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((entry) => {
                const Icon = CATEGORY_ICONS[entry.category];
                const isManual = !entry.source_module;
                return (
                  <TableRow key={entry.id} className="hover:bg-muted/30">
                    <TableCell className="text-sm text-muted-foreground">
                      {format(parseISO(entry.entry_date), "dd/MM/yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{entry.label}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {TREASURY_CATEGORY_LABELS[entry.category]}
                      </span>
                    </TableCell>
                    <TableCell>
                      {entry.type === "income" ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">
                          Entrée
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-600 hover:bg-red-100 border-0">
                          Sortie
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      <span className={entry.type === "income" ? "text-emerald-600" : "text-red-600"}>
                        {entry.type === "expense" ? "−" : "+"}{formatCurrency(entry.amount)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {entry.source_module && (
                        <Badge variant="outline" className="text-xs font-normal">
                          {SOURCE_MODULE_LABELS[entry.source_module] ?? entry.source_module}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {isManual && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                          onClick={() => onDelete(entry.id)}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} écriture{filtered.length !== 1 ? "s" : ""}
        {filtered.length !== entries.length && ` sur ${entries.length}`}
      </p>
    </div>
  );
}
