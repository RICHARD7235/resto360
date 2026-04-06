"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Clock,
  Calendar,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import type { MenuWithItems } from "@/app/(dashboard)/carte/actions";

const COURSE_LABELS: Record<string, string> = {
  aperitif: "Apéritif",
  entree: "Entrée",
  plat: "Plat",
  dessert: "Dessert",
  boisson: "Boisson",
  cafe: "Café",
};

const DAYS_LABELS: Record<string, string> = {
  lundi: "Lun",
  mardi: "Mar",
  mercredi: "Mer",
  jeudi: "Jeu",
  vendredi: "Ven",
  samedi: "Sam",
  dimanche: "Dim",
};

interface MenuFormulasListProps {
  menus: MenuWithItems[];
  onToggleAvailability: (id: string, available: boolean) => void;
  onDelete: (id: string) => void;
}

export function MenuFormulasList({
  menus,
  onToggleAvailability,
  onDelete,
}: MenuFormulasListProps) {
  if (menus.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Aucun menu ou formule configuré</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {menus.map((menu) => {
        // Group items by course
        const courseGroups: Record<string, typeof menu.items> = {};
        for (const item of menu.items) {
          const course = item.course;
          if (!courseGroups[course]) courseGroups[course] = [];
          courseGroups[course].push(item);
        }

        const courseOrder = [
          "aperitif",
          "entree",
          "plat",
          "dessert",
          "cafe",
          "boisson",
        ];
        const sortedCourses = Object.keys(courseGroups).sort(
          (a, b) => courseOrder.indexOf(a) - courseOrder.indexOf(b)
        );

        return (
          <Card
            key={menu.id}
            className={menu.is_available ? "" : "opacity-60"}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{menu.name}</CardTitle>
                    <Badge
                      variant={
                        menu.type === "formula" ? "default" : "secondary"
                      }
                    >
                      {menu.type === "formula"
                        ? "Formule"
                        : "Menu fixe"}
                    </Badge>
                    <span className="text-lg font-bold text-primary">
                      {Number(menu.price).toFixed(2)} €
                    </span>
                  </div>
                  {menu.description && (
                    <p className="text-sm text-muted-foreground">
                      {menu.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {menu.available_days && menu.available_days.length > 0 && menu.available_days.length < 7 && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {menu.available_days
                          .map((d) => DAYS_LABELS[d] ?? d)
                          .join(", ")}
                      </span>
                    )}
                    {menu.available_start && menu.available_end && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {menu.available_start.slice(0, 5)} -{" "}
                        {menu.available_end.slice(0, 5)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={menu.is_available ?? false}
                    onCheckedChange={(checked) =>
                      onToggleAvailability(menu.id, checked)
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => onDelete(menu.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sortedCourses.map((course) => (
                  <div key={course} className="space-y-1">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {COURSE_LABELS[course] ?? course}
                    </h4>
                    <ul className="space-y-0.5">
                      {courseGroups[course].map((item) => (
                        <li key={item.id} className="text-sm">
                          {item.label
                            ? item.label
                            : item.product?.name ?? "—"}
                          {item.is_default && (
                            <Badge
                              variant="outline"
                              className="ml-1 text-[10px] px-1 py-0"
                            >
                              inclus
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
