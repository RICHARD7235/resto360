import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { getPermissionsForRole, type ModulePermissions } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let permissions: Record<string, ModulePermissions> = {};
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("restaurant_id, role")
      .eq("id", user.id)
      .single();

    if (profile?.restaurant_id && profile?.role) {
      const permMap = await getPermissionsForRole(profile.restaurant_id, profile.role);
      permissions = Object.fromEntries(permMap);
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar permissions={permissions} />
      <SidebarInset>
        <Header />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
