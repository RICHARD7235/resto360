// Garde de rôle pour toutes les pages M11 Comptabilité.
// Réutilise requireQhsAdmin (whitelist owner/manager/admin sur profiles.role).
// Pattern identique au layout admin QHS — voir src/lib/qhs/auth.ts.
import { requireQhsAdmin } from "@/lib/qhs/auth";

export default async function ComptabiliteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireQhsAdmin();
  return <>{children}</>;
}
