// Garde de rôle pour toutes les pages admin QHS.
// Redirige vers /tableau-de-bord si l'utilisateur n'a pas la permission write sur m13_qualite.
import { requirePermission } from "@/lib/rbac";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("m13_qualite", "write");
  return <>{children}</>;
}
