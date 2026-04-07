// Garde de rôle pour toutes les pages admin QHS.
// Redirige vers /qualite/nettoyage si l'utilisateur n'a pas un rôle whitelist.
import { requireQhsAdmin } from "@/lib/qhs/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireQhsAdmin();
  return <>{children}</>;
}
