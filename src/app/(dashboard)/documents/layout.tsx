// Garde de rôle pour toutes les pages M12 Documents & Conformité.
// Utilise requirePermission (RBAC basé sur role_permissions).
import { requirePermission } from "@/lib/rbac";

export default async function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("m12_documents", "read");
  return <>{children}</>;
}
