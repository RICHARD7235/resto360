import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  v2?: boolean;
}

export function ModuleCard({ title, description, icon: Icon, href, v2 }: ModuleCardProps) {
  const card = (
    <Card
      className={cn(
        "transition-all h-full",
        v2 ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg cursor-pointer",
      )}
      title={v2 ? "Disponible prochainement" : undefined}
    >
      <CardHeader className="flex flex-row items-center gap-3">
        <Icon className="h-8 w-8 text-primary" />
        <div className="flex-1">
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        {v2 && <Badge variant="outline">En version 2</Badge>}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  if (v2 || !href) return card;
  return <Link href={href}>{card}</Link>;
}