"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Check, ChevronRight, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  parseBankFile,
  detectBankColumns,
  extractBankRows,
  type BankColumnMapping,
  type BankParsedRow,
} from "@/lib/bank-parser";
import { importBankStatement } from "@/app/(dashboard)/caisse/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(dateStr: string) {
  try {
    return format(new Date(dateStr), "d MMM yyyy", { locale: fr });
  } catch {
    return dateStr;
  }
}

const NONE_VALUE = "__none__";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

type Step = 1 | 2 | 3 | 4;

// ---------------------------------------------------------------------------
// Step indicators
// ---------------------------------------------------------------------------

const STEPS = [
  { num: 1, label: "Fichier" },
  { num: 2, label: "Colonnes" },
  { num: 3, label: "Aperçu" },
  { num: 4, label: "Terminé" },
];

function StepBar({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((s, i) => (
        <div key={s.num} className="flex items-center gap-1 flex-1">
          <div
            className={[
              "flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0",
              current > s.num
                ? "bg-primary text-white"
                : current === s.num
                ? "bg-primary text-white ring-2 ring-primary/30"
                : "bg-muted text-muted-foreground",
            ].join(" ")}
          >
            {current > s.num ? <Check className="w-3 h-3" /> : s.num}
          </div>
          <span
            className={[
              "text-xs hidden sm:block",
              current >= s.num ? "text-foreground font-medium" : "text-muted-foreground",
            ].join(" ")}
          >
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0 ml-auto mr-1" />
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column select helper
// ---------------------------------------------------------------------------

function ColumnSelect({
  label,
  value,
  onChange,
  headers,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  headers: string[];
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select
        value={value ?? NONE_VALUE}
        onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="— non mappé —" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>— non mappé —</SelectItem>
          {headers.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function BankImport({ open, onOpenChange, onImported }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<BankColumnMapping>({
    date: null,
    valueDate: null,
    label: null,
    debit: null,
    credit: null,
    amount: null,
  });
  const [bankName, setBankName] = useState("");
  const [accountLabel, setAccountLabel] = useState("");
  const [parsedRows, setParsedRows] = useState<BankParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ statementId: string; transactionCount: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset on close
  function handleOpenChange(v: boolean) {
    if (!v) {
      setStep(1);
      setFile(null);
      setHeaders([]);
      setRawRows([]);
      setMapping({ date: null, valueDate: null, label: null, debit: null, credit: null, amount: null });
      setBankName("");
      setAccountLabel("");
      setParsedRows([]);
      setResult(null);
    }
    onOpenChange(v);
  }

  // Step 1 → 2: parse file
  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);

    const buffer = await f.arrayBuffer();
    try {
      const { headers: h, rows } = parseBankFile(buffer);
      setHeaders(h);
      setRawRows(rows);
      const detected = detectBankColumns(h);
      setMapping(detected);
      setStep(2);
    } catch {
      toast.error("Impossible de lire ce fichier. Vérifiez le format.");
    }
  }

  // Step 2 → 3: extract rows
  function handleConfirmMapping() {
    if (!mapping.date) {
      toast.error("La colonne Date est obligatoire.");
      return;
    }
    if (!mapping.label) {
      toast.error("La colonne Libellé est obligatoire.");
      return;
    }
    if (!mapping.amount && !mapping.debit && !mapping.credit) {
      toast.error("Au moins une colonne montant est obligatoire.");
      return;
    }

    const rows = extractBankRows(rawRows, mapping);
    if (rows.length === 0) {
      toast.error("Aucune ligne valide extraite avec ce mapping.");
      return;
    }
    setParsedRows(rows);
    setStep(3);
  }

  // Step 3 → 4: import
  async function handleImport() {
    if (!file) return;
    if (!bankName.trim()) {
      toast.error("Le nom de la banque est obligatoire.");
      return;
    }

    setImporting(true);
    try {
      const dates = parsedRows.map((r) => r.transaction_date).sort();
      const statementDate = dates[dates.length - 1]; // most recent date

      const res = await importBankStatement({
        bankName: bankName.trim(),
        accountLabel: accountLabel.trim(),
        statementDate,
        fileName: file.name,
        transactions: parsedRows,
      });

      setResult(res);
      setStep(4);
      onImported();
      toast.success(`${res.transactionCount} transaction(s) importée(s) avec succès.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'import.");
    } finally {
      setImporting(false);
    }
  }

  // Helpers for amount display
  const totalCredit = parsedRows.filter((r) => r.amount > 0).reduce((s, r) => s + r.amount, 0);
  const totalDebit = parsedRows.filter((r) => r.amount < 0).reduce((s, r) => s + r.amount, 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importer un relevé bancaire</DialogTitle>
        </DialogHeader>

        <StepBar current={step} />

        {/* ── Step 1: File upload ───────────────────────────────────────── */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div
              className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
              tabIndex={0}
              role="button"
              aria-label="Choisir un fichier"
            >
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                Cliquez ou glissez un fichier ici
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Formats acceptés : CSV, XLS, XLSX
              </p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xls,.xlsx"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>
        )}

        {/* ── Step 2: Column mapping ────────────────────────────────────── */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            {/* File info */}
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate">{file?.name}</span>
              <Badge variant="secondary" className="ml-auto shrink-0">
                {rawRows.length} lignes
              </Badge>
            </div>

            {/* Bank info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="bank-name" className="text-xs text-muted-foreground">
                  Nom de la banque <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bank-name"
                  placeholder="ex: CIC, LCL, BNP..."
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="account-label" className="text-xs text-muted-foreground">
                  Libellé compte
                </Label>
                <Input
                  id="account-label"
                  placeholder="ex: Compte courant"
                  value={accountLabel}
                  onChange={(e) => setAccountLabel(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {/* Column mapping */}
            <div>
              <p className="text-sm font-medium mb-3">Correspondance des colonnes</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <ColumnSelect
                  label="Date *"
                  value={mapping.date}
                  onChange={(v) => setMapping((m) => ({ ...m, date: v }))}
                  headers={headers}
                />
                <ColumnSelect
                  label="Date valeur"
                  value={mapping.valueDate}
                  onChange={(v) => setMapping((m) => ({ ...m, valueDate: v }))}
                  headers={headers}
                />
                <ColumnSelect
                  label="Libellé *"
                  value={mapping.label}
                  onChange={(v) => setMapping((m) => ({ ...m, label: v }))}
                  headers={headers}
                />
                <ColumnSelect
                  label="Débit"
                  value={mapping.debit}
                  onChange={(v) => setMapping((m) => ({ ...m, debit: v }))}
                  headers={headers}
                />
                <ColumnSelect
                  label="Crédit"
                  value={mapping.credit}
                  onChange={(v) => setMapping((m) => ({ ...m, credit: v }))}
                  headers={headers}
                />
                <ColumnSelect
                  label="Montant"
                  value={mapping.amount}
                  onChange={(v) => setMapping((m) => ({ ...m, amount: v }))}
                  headers={headers}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                * Obligatoire. Utilisez soit Montant, soit Débit + Crédit.
              </p>
            </div>

            <div className="flex justify-between mt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="min-h-11">
                Retour
              </Button>
              <Button onClick={handleConfirmMapping} className="min-h-11">
                Continuer
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Preview ───────────────────────────────────────────── */}
        {step === 3 && (
          <div className="flex flex-col gap-4">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xl font-bold">{parsedRows.length}</p>
                <p className="text-xs text-muted-foreground">lignes</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3 text-center">
                <p className="text-base font-bold text-emerald-700">{formatCurrency(totalCredit)}</p>
                <p className="text-xs text-emerald-600">crédits</p>
              </div>
              <div className="rounded-lg bg-red-50 p-3 text-center">
                <p className="text-base font-bold text-destructive">{formatCurrency(Math.abs(totalDebit))}</p>
                <p className="text-xs text-muted-foreground">débits</p>
              </div>
            </div>

            {/* Row list */}
            <div className="rounded-lg border divide-y max-h-64 overflow-y-auto">
              {parsedRows.slice(0, 50).map((row, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="text-muted-foreground text-xs w-20 shrink-0">
                    {formatDate(row.transaction_date)}
                  </span>
                  <span className="flex-1 truncate">{row.label}</span>
                  <span
                    className={[
                      "font-medium text-right shrink-0",
                      row.amount >= 0 ? "text-emerald-700" : "text-destructive",
                    ].join(" ")}
                  >
                    {formatCurrency(row.amount)}
                  </span>
                </div>
              ))}
              {parsedRows.length > 50 && (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                  … et {parsedRows.length - 50} lignes supplémentaires
                </div>
              )}
            </div>

            <div className="flex justify-between mt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="min-h-11">
                Retour
              </Button>
              <Button onClick={handleImport} disabled={importing} className="min-h-11">
                {importing ? "Import en cours…" : `Importer ${parsedRows.length} transactions`}
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Success ───────────────────────────────────────────── */}
        {step === 4 && result && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-7 h-7 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-semibold">Import réussi !</p>
              <p className="text-sm text-muted-foreground mt-1">
                {result.transactionCount} transaction(s) importée(s) avec succès.
              </p>
            </div>
            <Button onClick={() => handleOpenChange(false)} className="min-h-11 mt-2">
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
