"use client";

import { Phone, Mail, Package, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SupplierWithCatalogCount } from "@/app/(dashboard)/fournisseurs/actions";

interface SupplierCardProps {
  supplier: SupplierWithCatalogCount;
  onClick: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
}

export function SupplierCard({
  supplier,
  onClick,
  onEdit,
  onToggleActive,
}: SupplierCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{supplier.name}</h3>
              {!supplier.is_active && (
                <Badge variant="secondary">Inactif</Badge>
              )}
            </div>
            {supplier.contact_name && (
              <p className="text-sm text-muted-foreground">
                {supplier.contact_name}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()} />
              }
            >
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleActive();
                }}
              >
                {supplier.is_active ? "Désactiver" : "Réactiver"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          {supplier.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {supplier.phone}
            </span>
          )}
          {supplier.email && (
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              {supplier.email}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            {supplier.catalog_count} article{supplier.catalog_count > 1 ? "s" : ""}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
