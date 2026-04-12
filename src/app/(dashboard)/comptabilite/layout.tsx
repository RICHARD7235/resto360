// Garde de rôle pour toutes les pages M11 Comptabilité.
// Utilise requirePermission (RBAC basé sur role_permissions).
import { requirePermission } from "@/lib/rbac";

export default async function ComptabiliteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("m11_comptabilite", "read");
  return <>{children}</>;
}
