// src/lib/qhs/pdf-export.ts
import {
  Document, Page, Text, View, StyleSheet, pdf,
} from "@react-pdf/renderer";
import React from "react";
import type {
  QhsTaskInstanceWithContext, QhsNonConformity,
} from "@/lib/supabase/qhs/types";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica" },
  h1: { fontSize: 16, marginBottom: 10, fontWeight: "bold" },
  h2: { fontSize: 12, marginTop: 15, marginBottom: 6, fontWeight: "bold" },
  meta: { fontSize: 9, color: "#666", marginBottom: 12 },
  row: { flexDirection: "row", borderBottom: "1px solid #ddd", paddingVertical: 3 },
  cellDate:   { width: "15%" },
  cellTask:   { width: "30%" },
  cellZone:   { width: "15%" },
  cellStatut: { width: "15%" },
  cellUser:   { width: "25%" },
  header:     { fontWeight: "bold", borderBottom: "2px solid #000" },
  footer:     { position: "absolute", bottom: 20, left: 30, right: 30, fontSize: 8, color: "#999", textAlign: "center" },
});

export interface AuditPdfData {
  restaurantNom: string;
  periodeDebut: string;
  periodeFin: string;
  instances: QhsTaskInstanceWithContext[];
  nonConformities: QhsNonConformity[];
}

const AuditDoc: React.FC<AuditPdfData> = ({
  restaurantNom, periodeDebut, periodeFin, instances, nonConformities,
}) => {
  const total = instances.length;
  const validees = instances.filter((i) => i.statut === "validee").length;
  const taux = total === 0 ? 100 : Math.round((validees / total) * 100);

  return React.createElement(Document, null,
    React.createElement(Page, { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.h1 }, `Registre HACCP — ${restaurantNom}`),
      React.createElement(Text, { style: styles.meta },
        `Période : ${periodeDebut} → ${periodeFin}  |  Taux de conformité : ${taux}% (${validees}/${total})`),

      React.createElement(Text, { style: styles.h2 }, "Tâches exécutées"),
      React.createElement(View, { style: [styles.row, styles.header] },
        React.createElement(Text, { style: styles.cellDate }, "Date"),
        React.createElement(Text, { style: styles.cellTask }, "Tâche"),
        React.createElement(Text, { style: styles.cellZone }, "Zone"),
        React.createElement(Text, { style: styles.cellStatut }, "Statut"),
        React.createElement(Text, { style: styles.cellUser }, "Validateur")),
      ...instances.map((inst) =>
        React.createElement(View, { style: styles.row, key: inst.id },
          React.createElement(Text, { style: styles.cellDate }, inst.date_prevue),
          React.createElement(Text, { style: styles.cellTask }, inst.template.libelle),
          React.createElement(Text, { style: styles.cellZone }, inst.zone?.nom ?? "—"),
          React.createElement(Text, { style: styles.cellStatut }, inst.statut),
          React.createElement(Text, { style: styles.cellUser }, inst.validation_id ? "Signée" : "—"))),

      React.createElement(Text, { style: styles.h2 }, `Non-conformités (${nonConformities.length})`),
      ...nonConformities.map((nc) =>
        React.createElement(View, { style: styles.row, key: nc.id },
          React.createElement(Text, { style: styles.cellDate }, nc.date_constat.slice(0, 10)),
          React.createElement(Text, { style: { width: "60%" } }, `[G${nc.gravite}] ${nc.description}`),
          React.createElement(Text, { style: { width: "25%" } }, nc.statut))),

      React.createElement(Text, { style: styles.footer },
        `Document généré par Resto360 le ${new Date().toLocaleString("fr-FR")}`),
    ));
};

export async function generateAuditPdf(data: AuditPdfData): Promise<Blob> {
  return await pdf(React.createElement(AuditDoc, data) as any).toBlob();
}
