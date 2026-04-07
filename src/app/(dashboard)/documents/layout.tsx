// Garde de rôle pour toutes les pages M12 Documents & Conformité.
// Réutilise requireQhsAdmin (whitelist owner/manager/admin sur profiles.role).
// Pattern identique au layout admin Comptabilité — voir src/lib/qhs/auth.ts.
import { requireQhsAdmin } from "@/lib/qhs/auth";

export default async function DocumentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireQhsAdmin();
  return <>{children}</>;
}
