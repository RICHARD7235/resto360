"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useReservationsStore } from "@/stores/reservations.store";
import { ReservationsStats } from "@/components/modules/reservations/reservations-stats";
import { ReservationsFilters } from "@/components/modules/reservations/reservations-filters";
import { ReservationsCalendar } from "@/components/modules/reservations/reservations-calendar";
import { ReservationsList } from "@/components/modules/reservations/reservations-list";
import { ReservationForm } from "@/components/modules/reservations/reservation-form";
import { ReservationDetail } from "@/components/modules/reservations/reservation-detail";
import type { ReservationFormData } from "@/components/modules/reservations/reservation-form";
import {
  getReservations,
  getReservationStats,
  getReservation,
  createReservation,
  updateReservation,
  updateReservationStatus,
} from "./actions";
import type { Tables } from "@/types/database.types";

type Reservation = Tables<"reservations">;

export default function ReservationsPage() {
  const {
    view,
    selectedDate,
    filters,
    selectedReservationId,
    setSelectedDate,
    setSelectedReservationId,
  } = useReservationsStore();

  // Data state
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState({ total: 0, totalGuests: 0, confirmed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  // Dialog/Sheet state
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().slice(0, 10);

      const [reservationsData, statsData] = await Promise.all([
        getReservations({
          status: filters.status.length > 0 ? (filters.status as never[]) : undefined,
          type: filters.type.length > 0 ? (filters.type as never[]) : undefined,
          search: filters.search || undefined,
          // In calendar view, load the whole month; in list view, load from today
          dateFrom:
            view === "calendar"
              ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
                  .toISOString()
                  .slice(0, 10)
              : dateStr,
          dateTo:
            view === "calendar"
              ? new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
                  .toISOString()
                  .slice(0, 10)
              : undefined,
        }),
        getReservationStats(dateStr),
      ]);

      setReservations(reservationsData);
      setStats({
        total: statsData.total,
        totalGuests: statsData.totalCovers,
        confirmed: statsData.byStatus.confirmed,
        pending: statsData.byStatus.pending,
      });
    } catch (error) {
      console.error("Erreur chargement réservations:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, filters, view]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -------------------------------------------------------------------------
  // Detail sheet
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (selectedReservationId) {
      getReservation(selectedReservationId).then((r) => {
        setSelectedReservation(r);
        setDetailOpen(true);
      });
    }
  }, [selectedReservationId]);

  function handleSelectReservation(id: string) {
    setSelectedReservationId(id);
  }

  function handleDetailClose(open: boolean) {
    setDetailOpen(open);
    if (!open) {
      setSelectedReservationId(null);
      setSelectedReservation(null);
    }
  }

  // -------------------------------------------------------------------------
  // Form handlers
  // -------------------------------------------------------------------------

  function handleNewReservation() {
    setEditingReservation(null);
    setFormOpen(true);
  }

  function handleEditFromDetail() {
    setDetailOpen(false);
    setEditingReservation(selectedReservation);
    setFormOpen(true);
  }

  async function handleFormSubmit(data: ReservationFormData) {
    // Convertir les chaînes vides en null pour les champs optionnels
    const cleaned = {
      customer_name: data.customer_name,
      date: data.date,
      time: data.time,
      party_size: data.party_size,
      customer_phone: data.customer_phone || null,
      customer_email: data.customer_email || null,
      end_time: data.end_time || null,
      type: data.type || null,
      table_number: data.table_number || null,
      notes: data.notes || null,
      ...(data.status ? { status: data.status } : {}),
    };

    if (editingReservation) {
      await updateReservation(editingReservation.id, cleaned);
    } else {
      await createReservation(cleaned);
    }
    setFormOpen(false);
    setEditingReservation(null);
    await fetchData();
  }

  async function handleStatusChange(status: string) {
    if (!selectedReservation) return;
    try {
      await updateReservationStatus(selectedReservation.id, status as never);
      const updated = await getReservation(selectedReservation.id);
      setSelectedReservation(updated);
      await fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur lors du changement de statut";
      toast.error(message);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Réservations</h1>
          <p className="text-muted-foreground">
            Gérez vos réservations, locations de salle et séminaires
          </p>
        </div>
        <Button onClick={handleNewReservation} className="min-h-11 gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle réservation
        </Button>
      </div>

      {/* Stats */}
      <ReservationsStats stats={stats} />

      {/* Filters */}
      <ReservationsFilters />

      {/* Main view */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : view === "calendar" ? (
        <ReservationsCalendar
          reservations={reservations}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onSelectReservation={handleSelectReservation}
        />
      ) : (
        <ReservationsList
          reservations={reservations}
          onSelectReservation={handleSelectReservation}
        />
      )}

      {/* Form dialog */}
      <ReservationForm
        open={formOpen}
        onOpenChange={setFormOpen}
        reservation={editingReservation}
        onSubmit={handleFormSubmit}
      />

      {/* Detail sheet */}
      <ReservationDetail
        reservation={selectedReservation}
        open={detailOpen}
        onOpenChange={handleDetailClose}
        onEdit={handleEditFromDetail}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
