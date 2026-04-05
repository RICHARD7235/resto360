"use client";

import { Bell, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/app/(auth)/connexion/actions";

export function Header() {
  return (
    <header className="flex h-14 items-center gap-2 border-b bg-card px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />

      <div className="flex-1" />

      <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Rechercher">
        <Search className="h-4 w-4" />
      </Button>

      <Button variant="ghost" size="icon" className="h-9 w-9 relative" aria-label="Notifications">
        <Bell className="h-4 w-4" />
        <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
          3
        </span>
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" className="h-9 gap-2 px-2" />}
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              PG
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden sm:inline">Pascal G.</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Pascal GIRAULT</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Mon profil</DropdownMenuItem>
          <DropdownMenuItem>Paramètres</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
