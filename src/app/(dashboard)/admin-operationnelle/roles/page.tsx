"use client";

import { useEffect, useState, useTransition, Fragment } from "react";
import { getAllPermissions, updatePermission, resetPermissions } from "./actions";
import { MODULE_LABELS, type AppRole, type AppModule } from "@/lib/rbac-constants";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RotateCcw } from "lucide-react";

const ROLES: AppRole[] = ["owner", "admin", "manager", "cook", "staff"];
const MODULES: AppModule[] = [
  "m01_dashboard", "m02_reservations", "m03_commandes", "m04_carte",
  "m05_stock", "m06_fournisseurs", "m07_personnel", "m08_caisse",
  "m09_avis", "m10_marketing", "m11_comptabilite", "m12_documents", "m13_qualite",
];

type PermRow = {
  role: string;
  module: string;
  can_read: boolean;
  can_write: boolean;
  can_delete: boolean;
};

export default function RolesPage() {
  const [permissions, setPermissions] = useState<PermRow[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getAllPermissions().then(setPermissions);
  }, []);

  function getPerm(role: string, module: string) {
    return permissions.find((p) => p.role === role && p.module === module);
  }

  function handleToggle(
    role: AppRole,
    module: AppModule,
    field: "can_read" | "can_write" | "can_delete",
    value: boolean
  ) {
    setPermissions((prev) =>
      prev.map((p) =>
        p.role === role && p.module === module ? { ...p, [field]: value } : p
      )
    );
    startTransition(async () => {
      const result = await updatePermission(role, module, field, value);
      if (result.error) {
        getAllPermissions().then(setPermissions);
      }
    });
  }

  function handleReset() {
    startTransition(async () => {
      await resetPermissions();
      const data = await getAllPermissions();
      setPermissions(data);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion des roles</h1>
          <p className="text-muted-foreground">
            Configurez les permissions par role et module
          </p>
        </div>
        <Button variant="outline" onClick={handleReset} disabled={isPending}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reinitialiser
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Matrice des permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Module</th>
                  {ROLES.map((role) => (
                    <th key={role} className="text-center p-2 font-medium capitalize" colSpan={3}>
                      {role}
                    </th>
                  ))}
                </tr>
                <tr className="border-b text-xs text-muted-foreground">
                  <th />
                  {ROLES.map((role) => (
                    <Fragment key={role}>
                      <th className="p-1">R</th>
                      <th className="p-1">W</th>
                      <th className="p-1">D</th>
                    </Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MODULES.map((module) => (
                  <tr key={module} className="border-b">
                    <td className="p-2 font-medium">{MODULE_LABELS[module]}</td>
                    {ROLES.map((role) => {
                      const perm = getPerm(role, module);
                      const disabled = role === "owner" || isPending;
                      return (
                        <Fragment key={role}>
                          {(["can_read", "can_write", "can_delete"] as const).map((field) => (
                            <td key={field} className="text-center p-1">
                              <Switch
                                checked={perm?.[field] ?? false}
                                onCheckedChange={(v) =>
                                  handleToggle(role, module, field, v)
                                }
                                disabled={disabled}
                                className="scale-75"
                              />
                            </td>
                          ))}
                        </Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
