"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { importReviewsCsv } from "@/app/(dashboard)/avis/actions";

type Row = {
  source: string;
  author_name: string;
  rating: number;
  comment?: string;
  review_date: string;
};

export function ImportReviewsDialog() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    const parsed: Row[] = json.map((r) => ({
      source: String(r.source ?? "manual"),
      author_name: String(r.author_name ?? r.author ?? ""),
      rating: Number(r.rating ?? 0),
      comment: r.comment ? String(r.comment) : undefined,
      review_date: String(r.review_date ?? r.date ?? new Date().toISOString().slice(0, 10)),
    }));
    setRows(parsed);
    setMessage(`${parsed.length} ligne(s) détectée(s).`);
  };

  const handleImport = () => {
    startTransition(async () => {
      const res = await importReviewsCsv(rows);
      setMessage(`${res.inserted} avis importé(s).`);
      setRows([]);
      setTimeout(() => setOpen(false), 1500);
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Upload className="mr-2 h-4 w-4" /> Importer CSV/Excel
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importer des avis</DialogTitle>
          <DialogDescription>
            Colonnes attendues : <code>source, author_name, rating, comment, review_date</code> (YYYY-MM-DD)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button onClick={handleImport} disabled={pending || rows.length === 0}>
            {pending ? "Import..." : `Importer ${rows.length} avis`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
