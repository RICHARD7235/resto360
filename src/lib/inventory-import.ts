import * as XLSX from "xlsx";

export interface ParsedRow {
  name: string;
  quantity: number | null;
  unit: string;
  rawRow: Record<string, unknown>;
}

export interface ColumnMapping {
  name: string | null;
  quantity: string | null;
  unit: string | null;
}

const NAME_PATTERNS = ["nom", "article", "produit", "désignation", "name", "item"];
const QUANTITY_PATTERNS = ["quantité", "qté", "qty", "quantity", "comptée", "counted", "stock"];
const UNIT_PATTERNS = ["unité", "unit", "u.m.", "mesure"];

function detectColumn(headers: string[], patterns: string[]): string | null {
  for (const header of headers) {
    const lower = header.toLowerCase().trim();
    if (patterns.some((p) => lower.includes(p))) return header;
  }
  return null;
}

export function detectColumns(headers: string[]): ColumnMapping {
  return {
    name: detectColumn(headers, NAME_PATTERNS),
    quantity: detectColumn(headers, QUANTITY_PATTERNS),
    unit: detectColumn(headers, UNIT_PATTERNS),
  };
}

export function parseFile(file: ArrayBuffer): { headers: string[]; rows: Record<string, unknown>[] } {
  const workbook = XLSX.read(file, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  if (jsonData.length === 0) return { headers: [], rows: [] };

  const headers = Object.keys(jsonData[0]);
  return { headers, rows: jsonData };
}

export function extractRows(
  rows: Record<string, unknown>[],
  mapping: ColumnMapping
): ParsedRow[] {
  return rows
    .map((row) => ({
      name: mapping.name ? String(row[mapping.name] || "").trim() : "",
      quantity: mapping.quantity ? parseFloat(String(row[mapping.quantity])) || null : null,
      unit: mapping.unit ? String(row[mapping.unit] || "").trim() : "",
      rawRow: row,
    }))
    .filter((r) => r.name.length > 0);
}

export function generateTemplate(
  items: { name: string; unit: string; current_quantity: number }[]
): ArrayBuffer {
  const data = items.map((i) => ({
    "Article": i.name,
    "Unité": i.unit,
    "Quantité système": i.current_quantity,
    "Quantité comptée": "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventaire");

  // Set column widths
  worksheet["!cols"] = [
    { wch: 30 }, // Article
    { wch: 10 }, // Unité
    { wch: 18 }, // Quantité système
    { wch: 18 }, // Quantité comptée
  ];

  return XLSX.write(workbook, { bookType: "xlsx", type: "array" });
}
