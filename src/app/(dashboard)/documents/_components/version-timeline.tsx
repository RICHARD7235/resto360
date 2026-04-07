"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFileSize } from "@/lib/documents/format";
import type { DocumentVersion } from "@/types/documents";
import { getDownloadUrl } from "../actions";

interface VersionTimelineProps {
  versions: DocumentVersion[];
  currentVersionId: string | null;
}

export function VersionTimeline({
  versions,
  currentVersionId,
}: VersionTimelineProps) {
  const [pending, startTransition] = useTransition();

  const onDownload = (versionId: string) => {
    startTransition(async () => {
      const res = await getDownloadUrl(versionId);
      if (res.ok && res.url) {
        window.open(res.url, "_blank", "noopener");
      } else {
        toast.error(res.error ?? "Téléchargement impossible");
      }
    });
  };

  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucune version.</p>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((v) => {
        const isCurrent = v.id === currentVersionId;
        const uploaded = new Date(v.uploaded_at).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        return (
          <Card key={v.id}>
            <CardContent className="flex items-start justify-between gap-4 p-4">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-md bg-muted p-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">v{v.version_number}</span>
                    {isCurrent && (
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Version actuelle
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {v.file_name} · {formatFileSize(v.file_size)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ajoutée le {uploaded}
                  </div>
                  {v.change_notes && (
                    <p className="mt-2 text-sm">{v.change_notes}</p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => onDownload(v.id)}
              >
                <Download className="mr-2 h-4 w-4" />
                Télécharger
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
