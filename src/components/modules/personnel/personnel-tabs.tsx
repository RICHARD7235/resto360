"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Briefcase,
  Palmtree,
  Clock,
  FileText,
} from "lucide-react";

const TABS = [
  { value: "dashboard", label: "Tableau de bord", href: "/personnel", icon: LayoutDashboard },
  { value: "equipe", label: "Equipe", href: "/personnel/equipe", icon: Users },
  { value: "planning", label: "Planning", href: "/personnel/planning", icon: CalendarDays },
  { value: "postes", label: "Postes", href: "/personnel/postes", icon: Briefcase },
  { value: "conges", label: "Conges", href: "/personnel/conges", icon: Palmtree },
  { value: "pointage", label: "Pointage", href: "/personnel/pointage", icon: Clock },
  { value: "documents", label: "Documents", href: "/personnel/documents", icon: FileText },
] as const;

function getActiveTab(pathname: string): string {
  for (const tab of TABS) {
    if (tab.href !== "/personnel" && pathname.startsWith(tab.href)) return tab.value;
  }
  return "dashboard";
}

export function PersonnelTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = getActiveTab(pathname);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        const tab = TABS.find((t) => t.value === value);
        if (tab) router.push(tab.href);
      }}
    >
      <TabsList className="w-full justify-start overflow-x-auto">
        {TABS.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="min-h-11 gap-2">
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
