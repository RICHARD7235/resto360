"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Truck, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useFournisseursStore } from "@/stores/fournisseurs.store";
import { SupplierCard } from "@/components/modules/fournisseurs/supplier-card";
import { SupplierForm } from "@/components/modules/fournisseurs/supplier-form";
import type { SupplierFormData } from "@/components/modules/fournisseurs/supplier-form";
import {
  getSuppliers,
  getSupplierStats,
  createSupplier,
  updateSupplier,
  toggleSupplierActive,
} from "./actions";
import type { SupplierWithCatalogCount, SupplierStats } from "./actions";
import type { Tables } from "@/types/database.types";

type Supplier = Tables<"suppliers">;

export default function FournisseursPage() {
  const router = useRouter();
  const {
    searchQuery,
    showInactive,
    supplierFormOpen,
    selectedSupplierId,
    setSearchQuery,
    setShowInactive,
    setSupplierFormOpen,
    setSelectedSupplierId,
  } = useFournisseursStore();

  const [suppliers, setSuppliers] = useState<SupplierWithCatalogCount[]>([]);
  const [stats, setStats] = useState<SupplierStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [suppliersData, statsData] = await Promise.all([
        getSuppliers({
          isActive: showInactive ? undefined : true,
          search: searchQuery || undefined,
        }),
        getSupplierStats(),
      ]);
      setSuppliers(suppliersData);
      setStats(statsData);
    } catch {
      toast.error("Erreur lors du chargement des fournisseurs");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, showInactive]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCreateSupplier(data: SupplierFormData) {
    try {
      await createSupplier(data);
      toast.success("Fournisseur créé");
      loadData();
    } catch {
      toast.error("Erreur lors de la création");
    }
  }

  async function handleUpdateSupplier(data: SupplierFormData) {
    if (!selectedSupplierId) return;
    try {
      await updateSupplier(selectedSupplierId, data);
      toast.success("Fournisseur modifié");
      loadData();
    } catch {
      toast.error("Erreur lors de la modification");
    }
  }

  async function handleToggleActive(id: string) {
    try {
      await toggleSupplierActive(id);
      toast.success("Statut mis à jour");
      loadData();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  }

  function openEditForm(supplier: SupplierWithCatalogCount) {
    setSelectedSupplierId(supplier.id);
    setEditingSupplier(supplier);
    setSupplierFormOpen(true);
  }

  function openCreateForm() {
    setSelectedSupplierId(null);
    setEditingSupplier(null);
    setSupplierFormOpen(true);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fournisseurs</h1>
          <p className="text-muted-foreground">
            Gestion des fournisseurs et catalogues produits
          </p>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau fournisseur
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Truck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">
                  Fournisseurs ({stats.active} actifs)
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Package className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.totalCatalogItems}</p>
                <p className="text-sm text-muted-foreground">Articles catalogue</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un fournisseur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={setShowInactive}
          />
          <Label htmlFor="show-inactive" className="text-sm">
            Voir inactifs
          </Label>
        </div>
      </div>

      {/* Supplier list */}
      {suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-24">
          <Truck className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-lg font-semibold text-muted-foreground">
            Aucun fournisseur
          </h2>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Ajoutez votre premier fournisseur pour commencer.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((supplier) => (
            <SupplierCard
              key={supplier.id}
              supplier={supplier}
              onClick={() => router.push(`/fournisseurs/${supplier.id}`)}
              onEdit={() => openEditForm(supplier)}
              onToggleActive={() => handleToggleActive(supplier.id)}
            />
          ))}
        </div>
      )}

      {/* Form dialog */}
      <SupplierForm
        open={supplierFormOpen}
        onOpenChange={setSupplierFormOpen}
        supplier={editingSupplier}
        onSubmit={editingSupplier ? handleUpdateSupplier : handleCreateSupplier}
      />
    </div>
  );
}
