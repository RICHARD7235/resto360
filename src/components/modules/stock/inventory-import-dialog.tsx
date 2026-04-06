"use client";

import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  parseFile,
  detectColumns,
  extractRows,
  type ColumnMapping,
  type ParsedRow,
} from "@/lib/inventory-import";
import type { InventoryLine } from "@/app/(dashboard)/stock/actions";

interface MatchedItem {
  id: string;
  name: string;
  current_quantity: number;
  unit: string;
}

interface ImportLine extends ParsedRow {
  matchedItem: MatchedItem | null;
  countedQuantity: number;
  action: "update" | "create" | "ignore";
  category: string;
}

interface InventoryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMatchNames: (names: string[]) => Promise<Record<string, MatchedItem | null>>;
  onSubmit: (lines: InventoryLine[]) => Promise<{ updated: number; created: number }>;
}

export function InventoryImportDialog({
  open,
  onOpenChange,
  onMatchNames,
  onSubmit,
}: InventoryImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ name: null, quantity: null, unit: null });
  const [lines, setLines] = useState<ImportLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ updated: number; created: number } | null>(null);

  function reset() {
    setStep(1);
    setHeaders([]);
    setRawRows([]);
    setMapping({ name: null, quantity: null, unit: null });
    setLines([]);
    setResult(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const { headers: h, rows } = parseFile(buffer);
    setHeaders(h);
    setRawRows(rows);
    setMapping(detectColumns(h));
    setStep(2);
  }

  async function handleMappingConfirm() {
    const parsed = extractRows(rawRows, mapping);
    const names = parsed.map((r) => r.name);
    const matches = await onMatchNames(names);

    const importLines: ImportLine[] = parsed.map((row) => {
      const match = matches[row.name];
      return {
        ...row,
        matchedItem: match || null,
        countedQuantity: row.quantity ?? 0,
        action: match ? "update" : "create",
        category: "autre",
      };
    });

    setLines(importLines);
    setStep(3);
  }

  function updateLine(index: number, updates: Partial<ImportLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...updates } : l)));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const inventoryLines: InventoryLine[] = lines
        .filter((l) => l.action !== "ignore")
        .map((l) => ({
          stock_item_id: l.matchedItem?.id || null,
          name: l.name,
          unit: l.matchedItem?.unit || l.unit || "piece",
          category: l.category,
          counted_quantity: l.countedQuantity,
          system_quantity: l.matchedItem?.current_quantity || 0,
          action: l.action,
        }));

      const res = await onSubmit(inventoryLines);
      setResult(res);
      setStep(4);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Importer un inventaire — Étape {step}/4
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === 1 && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
            <Upload className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              Glissez un fichier .xlsx ou .csv ici, ou cliquez pour sélectionner
            </p>
            <Button onClick={() => fileInputRef.current?.click()}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Choisir un fichier
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vérifiez le mapping des colonnes détectées ({rawRows.length} lignes trouvées)
            </p>
            {["name", "quantity", "unit"].map((field) => (
              <div key={field} className="grid grid-cols-2 gap-4 items-center">
                <span className="text-sm font-medium">
                  {field === "name" ? "Nom article" : field === "quantity" ? "Quantité comptée" : "Unité"}
                </span>
                <Select
                  value={mapping[field as keyof ColumnMapping] || ""}
                  onValueChange={(v) => setMapping((m) => ({ ...m, [field]: v || null }))}
                >
                  <SelectTrigger><SelectValue placeholder="Colonne non détectée" /></SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Retour</Button>
              <Button onClick={handleMappingConfirm} disabled={!mapping.name}>
                Continuer
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Preview */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vérifiez et ajustez les lignes avant validation
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead>Match stock</TableHead>
                  <TableHead className="text-right">Qté comptée</TableHead>
                  <TableHead className="text-right">Qté système</TableHead>
                  <TableHead className="text-right">Écart</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, i) => {
                  const diff = line.matchedItem
                    ? line.countedQuantity - line.matchedItem.current_quantity
                    : 0;
                  const pctDiff = line.matchedItem?.current_quantity
                    ? Math.abs(diff / line.matchedItem.current_quantity) * 100
                    : 0;

                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{line.name}</TableCell>
                      <TableCell>
                        {line.matchedItem ? (
                          <Badge variant="default">{line.matchedItem.name}</Badge>
                        ) : (
                          <Badge variant="secondary">Nouveau</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={line.countedQuantity}
                          onChange={(e) =>
                            updateLine(i, { countedQuantity: parseFloat(e.target.value) || 0 })
                          }
                          className="w-24 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {line.matchedItem?.current_quantity ?? "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {line.matchedItem ? (
                          <span className={pctDiff > 10 ? "text-destructive font-medium" : ""}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(2)}
                            {pctDiff > 10 && <AlertTriangle className="inline ml-1 h-3.5 w-3.5" />}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={line.action}
                          onValueChange={(v) =>
                            updateLine(i, { action: v as "update" | "create" | "ignore" })
                          }
                        >
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {line.matchedItem && <SelectItem value="update">Mettre à jour</SelectItem>}
                            <SelectItem value="create">Créer nouveau</SelectItem>
                            <SelectItem value="ignore">Ignorer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Retour</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Traitement..." : "Valider l'inventaire"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Result */}
        {step === 4 && result && (
          <div className="flex flex-col items-center py-8">
            <Check className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-lg font-semibold">Inventaire importé</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {result.updated} article{result.updated > 1 ? "s" : ""} mis à jour,{" "}
              {result.created} créé{result.created > 1 ? "s" : ""}
            </p>
            <Button className="mt-6" onClick={() => { reset(); onOpenChange(false); }}>
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
