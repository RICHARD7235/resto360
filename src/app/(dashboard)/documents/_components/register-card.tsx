import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import type { LegalRegister, RegisterStatus, SourceModule } from "@/types/documents";

function statusClasses(status: RegisterStatus): string {
  switch (status) {
    case "a-jour":
      return "bg-green-100 text-green-800 border-green-200";
    case "a-verifier":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "manquant":
    default:
      return "bg-red-100 text-red-800 border-red-200";
  }
}

function statusLabel(status: RegisterStatus): string {
  switch (status) {
    case "a-jour":
      return "À jour";
    case "a-verifier":
      return "À vérifier";
    case "manquant":
    default:
      return "Manquant";
  }
}

function moduleClasses(mod: SourceModule | null): string {
  switch (mod) {
    case "M05":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "M07":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "M11":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "M12":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "M13":
      return "bg-sky-100 text-sky-800 border-sky-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "Jamais";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function RegisterCard({ register }: { register: LegalRegister }) {
  const href = register.source_url ?? "#";
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{register.label}</CardTitle>
          {register.source_module && (
            <Badge
              variant="outline"
              className={moduleClasses(register.source_module)}
            >
              {register.source_module}
            </Badge>
          )}
        </div>
        {register.description && (
          <CardDescription>{register.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={statusClasses(register.status)}>
            {statusLabel(register.status)}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Dernière mise à jour : {formatDate(register.last_updated_at)}
        </p>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          render={<Link href={href} />}
        >
          Ouvrir le module
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
