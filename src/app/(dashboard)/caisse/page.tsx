"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Upload } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useCaisseStore, type CaisseTab } from "@/stores/caisse.store";

import { CaisseDashboard } from "@/components/modules/caisse/caisse-dashboard";
import { ClosingForm } from "@/components/modules/caisse/closing-form";
import { ClosingImport } from "@/components/modules/caisse/closing-import";
import { ClosingList } from "@/components/modules/caisse/closing-list";
import { BankImport } from "@/components/modules/caisse/bank-import";
import { ReconciliationPanel } from "@/components/modules/caisse/reconciliation-panel";
import { VatPeriodCard } from "@/components/modules/caisse/vat-period-card";
import { VatHistory } from "@/components/modules/caisse/vat-history";
import { TreasuryTable } from "@/components/modules/caisse/treasury-table";
import { TreasuryForm } from "@/components/modules/caisse/treasury-form";
import { TreasuryChart } from "@/components/modules/caisse/treasury-chart";
import { TreasurySummary } from "@/components/modules/caisse/treasury-summary";
import { JournalList } from "@/components/modules/caisse/journal-list";
import { ExportPanel } from "@/components/modules/caisse/export-panel";

import {
  getClosings, deleteClosing,
  getVatPeriods, createVatPeriod,
  getTreasuryEntries, deleteTreasuryEntry,
} from "./actions";

import type { CashRegisterClosing, VatPeriod, TreasuryEntry } from "@/types/caisse";

export default function CaissePage() {
  const store = useCaisseStore();

  const [closings, setClosings] = useState<CashRegisterClosing[]>([]);
  const [vatPeriods, setVatPeriods] = useState<VatPeriod[]>([]);
  const [treasuryEntries, setTreasuryEntries] = useState<TreasuryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [c, v, t] = await Promise.all([
        getClosings(),
        getVatPeriods(),
        getTreasuryEntries(),
      ]);
      setClosings(c);
      setVatPeriods(v);
      setTreasuryEntries(t);
    } catch (err) {
      toast.error("Erreur chargement données");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleDeleteClosing(id: string) {
    try {
      await deleteClosing(id);
      setClosings((prev) => prev.filter((c) => c.id !== id));
      toast.success("Z supprimé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function handleDeleteTreasuryEntry(id: string) {
    try {
      await deleteTreasuryEntry(id);
      setTreasuryEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Entrée supprimée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Caisse & Facturation</h1>
          <p className="text-muted-foreground">Hub financier — consolidation caisse, banque, trésorerie</p>
        </div>
      </div>

      <Tabs
        value={store.activeTab}
        onValueChange={(v) => store.setActiveTab(v as CaisseTab)}
      >
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="z-caisse">Z de caisse</TabsTrigger>
          <TabsTrigger value="rapprochement">Rapprochement</TabsTrigger>
          <TabsTrigger value="tva">TVA</TabsTrigger>
          <TabsTrigger value="tresorerie">Trésorerie</TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <CaisseDashboard />
        </TabsContent>

        <TabsContent value="z-caisse" className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={() => store.setClosingFormOpen(true)} className="min-h-[44px]">
              <Plus className="mr-2 h-4 w-4" /> Saisir un Z
            </Button>
            <Button variant="outline" onClick={() => store.setClosingImportOpen(true)} className="min-h-[44px]">
              <Upload className="mr-2 h-4 w-4" /> Importer
            </Button>
          </div>
          <ClosingList closings={closings} onDelete={handleDeleteClosing} />
          <ClosingForm
            open={store.closingFormOpen}
            onOpenChange={store.setClosingFormOpen}
            onCreated={(c) => { setClosings((prev) => [c, ...prev]); loadData(); }}
          />
          <ClosingImport
            open={store.closingImportOpen}
            onOpenChange={store.setClosingImportOpen}
            onImported={loadData}
          />
        </TabsContent>

        <TabsContent value="rapprochement" className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => store.setBankImportOpen(true)} className="min-h-[44px]">
              <Upload className="mr-2 h-4 w-4" /> Importer un relevé
            </Button>
          </div>
          <ReconciliationPanel onReconciled={loadData} />
          <BankImport
            open={store.bankImportOpen}
            onOpenChange={store.setBankImportOpen}
            onImported={loadData}
          />
        </TabsContent>

        <TabsContent value="tva" className="space-y-6">
          <VatPeriodCard
            periods={vatPeriods}
            onCreatePeriod={async (start, end) => {
              const p = await createVatPeriod(start, end);
              setVatPeriods((prev) => [p, ...prev]);
            }}
            onUpdated={loadData}
          />
          <VatHistory periods={vatPeriods} />
        </TabsContent>

        <TabsContent value="tresorerie" className="space-y-6">
          <div className="flex gap-2">
            <Button onClick={() => store.setTreasuryFormOpen(true)} className="min-h-[44px]">
              <Plus className="mr-2 h-4 w-4" /> Nouvelle entrée
            </Button>
          </div>
          <TreasurySummary />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TreasuryTable entries={treasuryEntries} onDelete={handleDeleteTreasuryEntry} />
            </div>
            <TreasuryChart entries={treasuryEntries} />
          </div>
          <TreasuryForm
            open={store.treasuryFormOpen}
            onOpenChange={store.setTreasuryFormOpen}
            onCreated={(e) => { setTreasuryEntries((prev) => [e, ...prev]); }}
          />
        </TabsContent>

        <TabsContent value="historique" className="space-y-6">
          <ExportPanel closings={closings} treasuryEntries={treasuryEntries} />
          <JournalList closings={closings} treasuryEntries={treasuryEntries} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
