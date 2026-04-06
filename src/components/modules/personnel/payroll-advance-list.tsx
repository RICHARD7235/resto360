"use client";

import type { PayrollAdvance } from "@/types/personnel";

// ---------------------------------------------------------------------------
// Label map
// ---------------------------------------------------------------------------

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  virement: "Virement",
  especes: "Espèces",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PayrollAdvanceListProps {
  advances: PayrollAdvance[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PayrollAdvanceList({ advances }: PayrollAdvanceListProps) {
  if (advances.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-4">
        Aucun acompte enregistré.
      </p>
    );
  }

  const total = advances.reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-left">
              <th className="px-3 py-2 font-medium text-muted-foreground">Date</th>
              <th className="px-3 py-2 font-medium text-muted-foreground text-right">
                Montant
              </th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Méthode</th>
              <th className="px-3 py-2 font-medium text-muted-foreground">Notes</th>
            </tr>
          </thead>
          <tbody>
            {advances.map((advance, index) => (
              <tr
                key={advance.id}
                className={
                  index % 2 === 0 ? "bg-background" : "bg-muted/20"
                }
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  {advance.date
                    ? new Date(advance.date).toLocaleDateString("fr-FR")
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                  {advance.amount.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {PAYMENT_METHOD_LABELS[advance.payment_method] ??
                    advance.payment_method}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {advance.notes ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/50 font-semibold">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                {total.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                })}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
