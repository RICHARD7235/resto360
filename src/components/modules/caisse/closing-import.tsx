"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle, Upload, FileSpreadsheet } from "lucide-react";
import { parseFile } from "@/lib/inventory-import";
import { importClosings } from "@/app/(dashboard)/caisse/actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ColumnDef {
  key: string;
  label: string;
  required: boolean;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: "date", label: "Date", required: true },
  { key: "total_ttc", label: "CA TTC", required: true },
  { key: "total_ht", label: "CA HT", required: false },
  { key: "total_cb", label: "CB", required: false },
  { key: "total_cash", label: "Espèces", required: false },
  { key: "total_check", label: "Chèques", required: false },
  { key: "cover_count", label: "Couverts", required: false },
  { key: "ticket_count", label: "Tickets", required: false },
  { key: "vat_5_5", label: "TVA 5,5 %", required: false },
  { key: "vat_10", label: "TVA 10 %", required: false },
  { key: "vat_20", label: "TVA 20 %", required: false },
];

type Mapping = Record<string, string | null>;

// Auto-detect column headers from the imported file
function autoDetect(headers: string[]): Mapping {
  const DATE_HINTS = ["date", "jour", "day"];
  const TTC_HINTS = ["ttc", "total ttc", "ca ttc", "chiffre", "recette", "ca_ttc", "total_ttc"];
  const HT_HINTS = ["ht", "ca ht", "total ht", "hors taxe", "total_ht"];
  const CB_HINTS = ["cb", "carte", "bancaire", "visa", "mastercard", "total_cb"];
  const CASH_HINTS = ["espèces", "especes", "cash", "liquide", "total_cash"];
  const CHECK_HINTS = ["chèque", "cheque", "chèques", "cheques", "total_check"];
  const COVER_HINTS = ["couvert", "cover", "couverts", "nb couvert", "cover_count"];
  const TICKET_HINTS = ["ticket", "billet", "tickets", "ticket_count"];
  const VAT55_HINTS = ["5.5", "5,5", "tva5", "vat5", "vat_5_5"];
  const VAT10_HINTS = ["10%", "tva10", "vat10", "taux 10", "vat_10"];
  const VAT20_HINTS = ["20%", "tva20", "vat20", "taux 20", "vat_20"];

  function match(hints: string[]): string | null {
    for (const h of headers) {
      const low = h.toLowerCase().trim();
      if (hints.some((hint) => low.includes(hint))) return h;
    }
    return null;
  }

  return {
    date: match(DATE_HINTS),
    total_ttc: match(TTC_HINTS),
    total_ht: match(HT_HINTS),
    total_cb: match(CB_HINTS),
    total_cash: match(CASH_HINTS),
    total_check: match(CHECK_HINTS),
    cover_count: match(COVER_HINTS),
    ticket_count: match(TICKET_HINTS),
    vat_5_5: match(VAT55_HINTS),
    vat_10: match(VAT10_HINTS),
    vat_20: match(VAT20_HINTS),
  };
}

function parseDate(val: unknown): string {
  if (!val) return "";
  const str = String(val).trim();
  // Excel numeric date
  if (/^\d{4,5}$/.test(str)) {
    const d = new Date(Date.UTC(1899, 11, 30));
    d.setUTCDate(d.getUTCDate() + parseInt(str));
    return d.toISOString().split("T")[0];
  }
  // dd/mm/yyyy or d/m/yyyy
  const dmy = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return str;
}

function parseNum(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const n = parseFloat(String(val).replace(",", ".").replace(/\s/g, ""));
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

type Step = 1 | 2 | 3 | 4;

interface ClosingImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ClosingImport({ open, onOpenChange, onImported }: ClosingImportProps) {
  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Mapping>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setStep(1);
    setFileName("");
    setHeaders([]);
    setRawRows([]);
    setMapping({});
    setResult(null);
  }

  function handleClose(val: boolean) {
    if (!loading) {
      onOpenChange(val);
      if (!val) reset();
    }
  }

  // Step 1 — file upload
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    try {
      const { headers: h, rows } = parseFile(buffer);
      if (h.length === 0) {
        toast.error("Fichier vide ou non reconnu");
        return;
      }
      setHeaders(h);
      setRawRows(rows);
      setMapping(autoDetect(h));
      setStep(2);
    } catch {
      toast.error("Impossible de lire le fichier");
    }
  }

  // Step 2 — confirm mapping -> preview
  function handleMappingNext() {
    if (!mapping.date || !mapping.total_ttc) {
      toast.error("Les colonnes Date et CA TTC sont obligatoires");
      return;
    }
    setStep(3);
  }

  // Build preview rows from raw rows + mapping
  function buildPreviewRows() {
    return rawRows.slice(0, 10).map((row) => ({
      date: parseDate(mapping.date ? row[mapping.date] : ""),
      total_ttc: parseNum(mapping.total_ttc ? row[mapping.total_ttc] : 0),
      total_ht: parseNum(mapping.total_ht ? row[mapping.total_ht] : 0),
      total_cb: parseNum(mapping.total_cb ? row[mapping.total_cb] : 0),
      total_cash: parseNum(mapping.total_cash ? row[mapping.total_cash] : 0),
    }));
  }

  // Step 3 — import
  async function handleImport() {
    setLoading(true);
    try {
      const rows = rawRows.map((row) => ({
        closing_date: parseDate(mapping.date ? row[mapping.date] : ""),
        total_ttc: parseNum(mapping.total_ttc ? row[mapping.total_ttc] : 0),
        total_ht: parseNum(mapping.total_ht ? row[mapping.total_ht] : 0),
        total_cb: parseNum(mapping.total_cb ? row[mapping.total_cb] : 0),
        total_cash: parseNum(mapping.total_cash ? row[mapping.total_cash] : 0),
        total_check: parseNum(mapping.total_check ? row[mapping.total_check] : 0),
        total_ticket_resto: 0,
        total_other: 0,
        cover_count: mapping.cover_count ? Math.round(parseNum(row[mapping.cover_count])) : 0,
        ticket_count: mapping.ticket_count ? Math.round(parseNum(row[mapping.ticket_count])) : 0,
        vat_5_5: parseNum(mapping.vat_5_5 ? row[mapping.vat_5_5] : 0),
        vat_10: parseNum(mapping.vat_10 ? row[mapping.vat_10] : 0),
        vat_20: parseNum(mapping.vat_20 ? row[mapping.vat_20] : 0),
        notes: null,
        extra_data: {},
        source: "import" as const,
      }));

      const res = await importClosings(rows);
      setResult(res);
      setStep(4);
      onImported();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setLoading(false);
    }
  }

  const previewRows = step >= 3 ? buildPreviewRows() : [];
  const NONE = "__none__";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer des Z de caisse</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          {(["1. Fichier", "2. Colonnes", "3. Aperçu", "4. Confirmation"] as const).map(
            (label, idx) => (
              <span
                key={label}
                className={
                  step === idx + 1
                    ? "font-semibold text-primary"
                    : step > idx + 1
                    ? "text-emerald-600"
                    : ""
                }
              >
                {label}
                {idx < 3 && <span className="mx-1.5 text-muted-foreground/40">›</span>}
              </span>
            )
          )}
        </div>

        {/* ---- Step 1: File upload ---- */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="rounded-full bg-primary/10 p-5">
              <FileSpreadsheet className="h-10 w-10 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Sélectionnez un fichier Excel ou CSV exporté depuis votre caisse enregistreuse.
            </p>
            <Button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="min-h-[44px] gap-2"
            >
              <Upload className="h-4 w-4" />
              Choisir un fichier
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xls,.xlsx,.csv"
              className="hidden"
              onChange={handleFile}
            />
            <p className="text-xs text-muted-foreground">Formats acceptés : .xls, .xlsx, .csv</p>
          </div>
        )}

        {/* ---- Step 2: Column mapping ---- */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Fichier : <span className="font-medium text-foreground">{fileName}</span> —{" "}
              {rawRows.length} lignes détectées.
            </p>
            <p className="text-sm text-muted-foreground">
              Associez les colonnes de votre fichier aux champs attendus.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {COLUMN_DEFS.map((col) => (
                <div key={col.key} className="space-y-1">
                  <Label className="text-xs">
                    {col.label}
                    {col.required && <span className="text-red-500 ml-0.5">*</span>}
                  </Label>
                  <Select
                    value={mapping[col.key] ?? NONE}
                    onValueChange={(val) =>
                      setMapping((m) => ({ ...m, [col.key]: val === NONE ? null : val }))
                    }
                  >
                    <SelectTrigger className="min-h-[44px] text-xs">
                      <SelectValue placeholder="— Ignorer —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— Ignorer —</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ---- Step 3: Preview ---- */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Aperçu des 10 premières lignes ({rawRows.length} lignes au total).
            </p>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">CA TTC</TableHead>
                    <TableHead className="text-right">CA HT</TableHead>
                    <TableHead className="text-right">CB</TableHead>
                    <TableHead className="text-right">Espèces</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{row.date || "—"}</TableCell>
                      <TableCell className="text-right text-xs">
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        }).format(row.total_ttc)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        }).format(row.total_ht)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        }).format(row.total_cb)}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                        }).format(row.total_cash)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ---- Step 4: Confirmation ---- */}
        {step === 4 && result && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="rounded-full bg-emerald-50 p-5">
              <CheckCircle className="h-10 w-10 text-emerald-600" />
            </div>
            <p className="text-base font-semibold">Import terminé</p>
            <div className="text-sm text-muted-foreground text-center space-y-1">
              <p>
                <span className="font-semibold text-emerald-600">{result.inserted}</span> Z de
                caisse importé(s)
              </p>
              {result.skipped > 0 && (
                <p>
                  <span className="font-semibold text-amber-600">{result.skipped}</span> doublon(s)
                  ignoré(s)
                </p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter>
          {step === 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              className="min-h-[44px]"
            >
              Annuler
            </Button>
          )}

          {step === 2 && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="min-h-[44px]"
              >
                Retour
              </Button>
              <Button type="button" onClick={handleMappingNext} className="min-h-[44px]">
                Suivant
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                disabled={loading}
                className="min-h-[44px]"
              >
                Retour
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={loading}
                className="min-h-[44px]"
              >
                {loading ? "Import en cours…" : `Importer ${rawRows.length} lignes`}
              </Button>
            </>
          )}

          {step === 4 && (
            <Button
              type="button"
              onClick={() => handleClose(false)}
              className="min-h-[44px]"
            >
              Fermer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
