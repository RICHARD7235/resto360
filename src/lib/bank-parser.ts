import * as XLSX from "xlsx";

export interface BankParsedRow {
  transaction_date: string;
  value_date: string | null;
  label: string;
  amount: number;
}

export interface BankColumnMapping {
  date: string | null;
  valueDate: string | null;
  label: string | null;
  debit: string | null;
  credit: string | null;
  amount: string | null;
}

// ---------------------------------------------------------------------------
// Column detection patterns (covers major French banks)
// ---------------------------------------------------------------------------

const DATE_PATTERNS = [
  "date", "date opération", "date operation", "date comptable",
  "date mouvement", "date d'opération",
];
const VALUE_DATE_PATTERNS = [
  "date valeur", "date de valeur", "value date",
];
const LABEL_PATTERNS = [
  "libellé", "libelle", "désignation", "designation", "description",
  "label", "détail", "detail", "nature",
];
const DEBIT_PATTERNS = ["débit", "debit", "montant débit"];
const CREDIT_PATTERNS = ["crédit", "credit", "montant crédit"];
const AMOUNT_PATTERNS = ["montant", "amount", "somme"];

function matchColumn(headers: string[], patterns: string[]): string | null {
  for (const header of headers) {
    const lower = header.toLowerCase().trim();
    if (patterns.some((p) => lower.includes(p))) return header;
  }
  return null;
}

export function detectBankColumns(headers: string[]): BankColumnMapping {
  return {
    date: matchColumn(headers, DATE_PATTERNS),
    valueDate: matchColumn(headers, VALUE_DATE_PATTERNS),
    label: matchColumn(headers, LABEL_PATTERNS),
    debit: matchColumn(headers, DEBIT_PATTERNS),
    credit: matchColumn(headers, CREDIT_PATTERNS),
    amount: matchColumn(headers, AMOUNT_PATTERNS),
  };
}

// ---------------------------------------------------------------------------
// Parse CSV or XLS file
// ---------------------------------------------------------------------------

export function parseBankFile(
  buffer: ArrayBuffer
): { headers: string[]; rows: Record<string, unknown>[] } {
  const workbook = XLSX.read(buffer, { type: "array", raw: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  if (jsonData.length === 0) return { headers: [], rows: [] };

  const headers = Object.keys(jsonData[0]);
  return { headers, rows: jsonData };
}

// ---------------------------------------------------------------------------
// Normalize date string to ISO format (YYYY-MM-DD)
// ---------------------------------------------------------------------------

function normalizeDate(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).trim();

  // DD/MM/YYYY or DD-MM-YYYY
  const frMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (frMatch) {
    const [, day, month, year] = frMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // YYYY-MM-DD already
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return str;

  return null;
}

// ---------------------------------------------------------------------------
// Normalize amount (handle French number format: "1 234,56")
// ---------------------------------------------------------------------------

function normalizeAmount(value: unknown): number {
  if (typeof value === "number") return value;
  if (!value) return 0;
  const str = String(value).trim().replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// ---------------------------------------------------------------------------
// Extract rows
// ---------------------------------------------------------------------------

export function extractBankRows(
  rows: Record<string, unknown>[],
  mapping: BankColumnMapping
): BankParsedRow[] {
  return rows
    .map((row) => {
      const dateStr = mapping.date ? normalizeDate(row[mapping.date]) : null;
      if (!dateStr) return null;

      const label = mapping.label ? String(row[mapping.label] || "").trim() : "";
      if (!label) return null;

      let amount: number;
      if (mapping.amount) {
        amount = normalizeAmount(row[mapping.amount]);
      } else if (mapping.debit || mapping.credit) {
        const debit = mapping.debit ? normalizeAmount(row[mapping.debit]) : 0;
        const credit = mapping.credit ? normalizeAmount(row[mapping.credit]) : 0;
        amount = credit > 0 ? credit : -Math.abs(debit);
      } else {
        return null;
      }

      return {
        transaction_date: dateStr,
        value_date: mapping.valueDate ? normalizeDate(row[mapping.valueDate]) : null,
        label,
        amount,
      };
    })
    .filter((r): r is BankParsedRow => r !== null);
}
