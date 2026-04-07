"use client";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { importFromLibraryAction } from "../../../actions";
import type { QhsTaskTemplate, QhsZone } from "@/lib/supabase/qhs/types";

interface Props {
  templates: QhsTaskTemplate[];
  zones: QhsZone[];
  libraryMode?: boolean;
  restaurantId?: string;
}

export function TemplatesTable({ templates, zones, libraryMode }: Props) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [defaultZone, setDefaultZone] = useState<string>("");

  const toggle = (id: string) =>
    setSelected((s) => ({ ...s, [id]: !s[id] }));

  const importSelected = async () => {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (ids.length === 0) return toast.error("Aucun template sélectionné");
    if (!defaultZone) return toast.error("Choisir une zone par défaut");
    const assignments = Object.fromEntries(ids.map((id) => [id, defaultZone]));
    const r = await importFromLibraryAction(ids, assignments);
    toast.success(`${r.count} templates importés`);
  };

  return (
    <div className="space-y-4">
      {libraryMode && (
        <div className="flex items-center gap-2">
          <select
            className="border rounded px-2 py-1"
            value={defaultZone}
            onChange={(e) => setDefaultZone(e.target.value)}
          >
            <option value="">Zone par défaut…</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.nom}
              </option>
            ))}
          </select>
          <Button onClick={importSelected}>Importer la sélection</Button>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            {libraryMode && <TableHead className="w-8"></TableHead>}
            <TableHead>Libellé</TableHead>
            <TableHead>Zone</TableHead>
            <TableHead>Fréquence</TableHead>
            <TableHead>Créneau / Jour</TableHead>
            <TableHead>Photo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((t) => {
            const zone = zones.find((z) => z.id === t.zone_id);
            return (
              <TableRow key={t.id}>
                {libraryMode && (
                  <TableCell>
                    <Checkbox
                      checked={!!selected[t.id]}
                      onCheckedChange={() => toggle(t.id)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">{t.libelle}</TableCell>
                <TableCell>{zone?.nom ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{t.frequency}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {t.service_creneau ??
                    (t.jour_semaine
                      ? `J${t.jour_semaine}`
                      : t.jour_mois
                        ? `Le ${t.jour_mois}`
                        : "—")}
                </TableCell>
                <TableCell>
                  {t.photo_required && <Camera className="h-4 w-4" />}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
