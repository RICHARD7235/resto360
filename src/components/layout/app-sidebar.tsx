"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  UtensilsCrossed,
  BookOpen,
  Package,
  Truck,
  Users,
  CreditCard,
  Star,
  Megaphone,
  BarChart3,
  FileText,
  ShieldCheck,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { ROUTE_TO_MODULE } from "@/lib/rbac-constants";
import type { ModulePermissions } from "@/lib/rbac";

const modules = [
  {
    group: "Quotidien",
    items: [
      { name: "Tableau de bord", href: "/tableau-de-bord", icon: LayoutDashboard },
      { name: "Réservations", href: "/reservations", icon: CalendarDays },
      { name: "Commandes", href: "/commandes", icon: UtensilsCrossed },
      { name: "Carte & Recettes", href: "/carte", icon: BookOpen },
      { name: "Qualité H&S", href: "/qualite", icon: ShieldCheck },
    ],
  },
  {
    group: "Gestion",
    items: [
      { name: "Stock & Achats", href: "/stock", icon: Package },
      { name: "Fournisseurs", href: "/fournisseurs", icon: Truck },
      { name: "Personnel", href: "/personnel", icon: Users },
      { name: "Caisse", href: "/caisse", icon: CreditCard },
    ],
  },
  {
    group: "Croissance",
    items: [
      { name: "Avis", href: "/avis", icon: Star },
      { name: "Marketing", href: "/marketing", icon: Megaphone },
      { name: "Comptabilité", href: "/comptabilite", icon: BarChart3 },
      { name: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    group: "Configuration",
    items: [
      { name: "Admin opérationnelle", href: "/admin-operationnelle", icon: Settings },
    ],
  },
];

interface AppSidebarProps {
  permissions: Record<string, ModulePermissions>;
}

export function AppSidebar({ permissions }: AppSidebarProps) {
  const pathname = usePathname();

  const filteredModules = modules.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      const module = ROUTE_TO_MODULE[item.href];
      if (!module) return true; // Non-module routes always visible
      const perm = permissions[module];
      return perm?.can_read ?? false;
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/tableau-de-bord" className="flex items-center gap-3">
          <Image
            src="/images/Logo Cabane.png"
            alt="La Cabane Qui Fume"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold leading-tight">La Cabane</span>
            <span className="text-xs text-sidebar-foreground/70">Qui Fume</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {filteredModules.map((group) => (
          <SidebarGroup key={group.group}>
            <SidebarGroupLabel>{group.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                      tooltip={item.name}
                    >
                      <item.icon />
                      <span>{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 group-data-[collapsible=icon]:hidden">
        <div className="text-xs text-sidebar-foreground/50">
          Resto 360 v1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
