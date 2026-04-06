"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Package,
  Phone,
  Mail,
  MapPin,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SupplierForm } from "@/components/modules/fournisseurs/supplier-form";
import type { SupplierFormData } from "@/components/modules/fournisseurs/supplier-form";
import { CatalogItemForm } from "@/components/modules/fournisseurs/catalog-item-form";
import type { CatalogItemFormData } from "@/components/modules/fournisseurs/catalog-item-form";
import {
  getSupplier,
  updateSupplier,
  toggleSupplierActive,
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
} from "../actions";
import type { Tables } from "@/types/database.types";

type Supplier = Tables<"suppliers">;
type CatalogItem = Tables<"supplier_catalog_items">;

const CATEGORY_LABELS: Record<string, string> = {
  viandes: "Viandes",
  poissons: "Poissons",
  légumes: "Légumes",
  produits_laitiers: "Produits laitiers",
  boissons: "Boissons",
  épicerie: "Épicerie",
  autre: "Autre",
};

const UNIT_LABELS: Record<string, string> = {
  kg: "kg",
  L: "L",
  piece: "pièce",
  pack: "pack",
};

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [catalogFormOpen, setCatalogFormOpen] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<CatalogItem | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await getSupplier(supplierId);
      setSupplier(data.supplier);
      setCatalogItems(data.catalogItems);
    } catch {
      toast.error("Fournisseur introuvable");
      router.push("/fournisseurs");
    } finally {
      setLoading(false);
    }
  }, [supplierId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleUpdateSupplier(data: SupplierFormData) {
    try {
      await updateSupplier(supplierId, data);
      toast.success("Fournisseur modifié");
      loadData();
    } catch {
      toast.error("Erreur lors de la modification");
    }
  }

  async function handleToggleActive() {
    try {
      await toggleSupplierActive(supplierId);
      toast.success("Statut mis à jour");
      loadData();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  }

  async function handleCreateCatalogItem(data: CatalogItemFormData) {
    try {
      await createCatalogItem(supplierId, data);
      toast.success("Article ajouté au catalogue");
      loadData();
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  }

  async function handleUpdateCatalogItem(data: CatalogItemFormData) {
    if (!editingCatalogItem) return;
    try {
      await updateCatalogItem(editingCatalogItem.id, data);
      toast.success("Article modifié");
      loadData();
    } catch {
      toast.error("Erreur lors de la modification");
    }
  }

  async function handleDeleteCatalogItem(id: string) {
    try {
      await deleteCatalogItem(id);
      toast.success("Article supprimé");
      loadData();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }

  if (loading || !supplier) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/fournisseurs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{supplier.name}</h1>
            {!supplier.is_active && <Badge variant="secondary">Inactif</Badge>}
          </div>
          {supplier.contact_name && (
            <p className="text-muted-foreground">{supplier.contact_name}</p>
          )}
        </div>
        <Button variant="outline" onClick={handleToggleActive}>
          {supplier.is_active ? "Désactiver" : "Réactiver"}
        </Button>
        <Button variant="outline" onClick={() => setEditFormOpen(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Modifier
        </Button>
        <Button onClick={() => router.push(`/stock/commande/nouvelle?supplier=${supplierId}`)}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          Nouveau bon de commande
        </Button>
      </div>

      {/* Contact info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-6 text-sm">
            {supplier.phone && (
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {supplier.phone}
              </span>
            )}
            {supplier.email && (
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {supplier.email}
              </span>
            )}
            {supplier.address && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {supplier.address}
              </span>
            )}
          </div>
          {supplier.notes && (
            <p className="mt-3 text-sm text-muted-foreground border-t pt-3">
              {supplier.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Catalog */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Catalogue ({catalogItems.length} article{catalogItems.length > 1 ? "s" : ""})
          </CardTitle>
          <Button
            size="sm"
            onClick={() => {
              setEditingCatalogItem(null);
              setCatalogFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un article
          </Button>
        </CardHeader>
        <CardContent>
          {catalogItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun article dans le catalogue. Ajoutez-en un pour commencer.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Désignation</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Prix unitaire</TableHead>
                  <TableHead>Unité</TableHead>
                  <TableHead>Dispo</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {catalogItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.reference || "—"}
                    </TableCell>
                    <TableCell>
                      {item.category ? CATEGORY_LABELS[item.category] || item.category : "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(item.unit_price).toFixed(2)} €
                    </TableCell>
                    <TableCell>{UNIT_LABELS[item.unit] || item.unit}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_available ? "default" : "secondary"}>
                        {item.is_available ? "Oui" : "Non"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCatalogItem(item);
                            setCatalogFormOpen(true);
                          }}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCatalogItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SupplierForm
        open={editFormOpen}
        onOpenChange={setEditFormOpen}
        supplier={supplier}
        onSubmit={handleUpdateSupplier}
      />
      <CatalogItemForm
        open={catalogFormOpen}
        onOpenChange={setCatalogFormOpen}
        item={editingCatalogItem}
        onSubmit={editingCatalogItem ? handleUpdateCatalogItem : handleCreateCatalogItem}
      />
    </div>
  );
}
