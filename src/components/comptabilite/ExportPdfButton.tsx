"use client";

import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { toast } from "sonner";

export function ExportPdfButton() {
  return (
    <Button
      variant="outline"
      onClick={() => toast.info("Export PDF disponible en v2")}
    >
      <FileDown className="mr-2 h-4 w-4" />
      Exporter PDF
    </Button>
  );
}
