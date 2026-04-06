// ---------------------------------------------------------------------------
// FEC (Fichier des Écritures Comptables) — format légal français
// Norme : Article A.47 A-1 du Livre des Procédures Fiscales
// Encodage : ISO 8859-15 (Latin-9)
// Séparateur : tabulation
// ---------------------------------------------------------------------------

import type { CashRegisterClosing, TreasuryEntry } from "@/types/caisse";

interface FecLine {
  JournalCode: string;
  JournalLib: string;
  EcritureNum: string;
  EcritureDate: string;
  CompteNum: string;
  CompteLib: string;
  CompAuxNum: string;
  CompAuxLib: string;
  PieceRef: string;
  PieceDate: string;
  EcritureLib: string;
  Debit: string;
  Credit: string;
  EcrLettrageNum: string;
  DateLettrageNum: string;
  ValidDate: string;
  MontantDevise: string;
  IdDevise: string;
}

const FEC_HEADERS: (keyof FecLine)[] = [
  "JournalCode", "JournalLib", "EcritureNum", "EcritureDate",
  "CompteNum", "CompteLib", "CompAuxNum", "CompAuxLib",
  "PieceRef", "PieceDate", "EcritureLib", "Debit", "Credit",
  "EcrLettrageNum", "DateLettrageNum", "ValidDate", "MontantDevise", "IdDevise",
];

function formatFecDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

function formatFecAmount(amount: number): string {
  return amount.toFixed(2).replace(".", ",");
}

export function generateFecContent(
  closings: CashRegisterClosing[],
  treasuryEntries: TreasuryEntry[],
  siren: string
): string {
  const lines: FecLine[] = [];
  let ecritureNum = 1;

  // --- Closings → Journal VE (Ventes) ---
  for (const closing of closings) {
    const num = String(ecritureNum++).padStart(6, "0");
    const date = formatFecDate(closing.closing_date);

    // Debit: 411000 (Clients) for TTC
    lines.push({
      JournalCode: "VE",
      JournalLib: "Journal des Ventes",
      EcritureNum: num,
      EcritureDate: date,
      CompteNum: "411000",
      CompteLib: "Clients",
      CompAuxNum: "",
      CompAuxLib: "",
      PieceRef: `Z-${closing.closing_date}`,
      PieceDate: date,
      EcritureLib: `Z de caisse du ${closing.closing_date}`,
      Debit: formatFecAmount(closing.total_ttc),
      Credit: "0,00",
      EcrLettrageNum: "",
      DateLettrageNum: "",
      ValidDate: date,
      MontantDevise: "",
      IdDevise: "EUR",
    });

    // Credit: 707000 (Ventes) for HT
    lines.push({
      JournalCode: "VE",
      JournalLib: "Journal des Ventes",
      EcritureNum: num,
      EcritureDate: date,
      CompteNum: "707000",
      CompteLib: "Ventes de marchandises",
      CompAuxNum: "",
      CompAuxLib: "",
      PieceRef: `Z-${closing.closing_date}`,
      PieceDate: date,
      EcritureLib: `CA HT du ${closing.closing_date}`,
      Debit: "0,00",
      Credit: formatFecAmount(closing.total_ht),
      EcrLettrageNum: "",
      DateLettrageNum: "",
      ValidDate: date,
      MontantDevise: "",
      IdDevise: "EUR",
    });

    // Credit: TVA collectée for each rate
    const vatEntries = [
      { rate: "5,5%", account: "445711", amount: closing.vat_5_5 },
      { rate: "10%", account: "445712", amount: closing.vat_10 },
      { rate: "20%", account: "445713", amount: closing.vat_20 },
    ];

    for (const vat of vatEntries) {
      if (vat.amount > 0) {
        lines.push({
          JournalCode: "VE",
          JournalLib: "Journal des Ventes",
          EcritureNum: num,
          EcritureDate: date,
          CompteNum: vat.account,
          CompteLib: `TVA collectée ${vat.rate}`,
          CompAuxNum: "",
          CompAuxLib: "",
          PieceRef: `Z-${closing.closing_date}`,
          PieceDate: date,
          EcritureLib: `TVA ${vat.rate} du ${closing.closing_date}`,
          Debit: "0,00",
          Credit: formatFecAmount(vat.amount),
          EcrLettrageNum: "",
          DateLettrageNum: "",
          ValidDate: date,
          MontantDevise: "",
          IdDevise: "EUR",
        });
      }
    }
  }

  // --- Treasury expenses → Journal OD (Opérations Diverses) ---
  for (const entry of treasuryEntries) {
    if (entry.type !== "expense") continue;
    const num = String(ecritureNum++).padStart(6, "0");
    const date = formatFecDate(entry.entry_date);
    const account = treasuryCategoryToAccount(entry.category);

    lines.push({
      JournalCode: "OD",
      JournalLib: "Opérations Diverses",
      EcritureNum: num,
      EcritureDate: date,
      CompteNum: account,
      CompteLib: entry.label,
      CompAuxNum: "",
      CompAuxLib: "",
      PieceRef: `TR-${entry.id.slice(0, 8)}`,
      PieceDate: date,
      EcritureLib: entry.label,
      Debit: formatFecAmount(entry.amount),
      Credit: "0,00",
      EcrLettrageNum: "",
      DateLettrageNum: "",
      ValidDate: date,
      MontantDevise: "",
      IdDevise: "EUR",
    });
  }

  const header = FEC_HEADERS.join("\t");
  const body = lines.map((line) => FEC_HEADERS.map((h) => line[h]).join("\t")).join("\n");

  return `${header}\n${body}\n`;
}

function treasuryCategoryToAccount(category: string): string {
  const map: Record<string, string> = {
    supplier: "607000",
    salary: "641000",
    tax: "635000",
    rent: "613200",
    insurance: "616000",
    equipment: "606300",
    investment: "218000",
    maintenance: "615000",
    other: "658000",
  };
  return map[category] ?? "658000";
}

export function generateFecFilename(siren: string, periodEnd: string): string {
  return `${siren}FEC${formatFecDate(periodEnd)}.txt`;
}
