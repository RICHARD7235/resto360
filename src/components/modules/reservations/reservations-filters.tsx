"use client";

import { Search, Calendar, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReservationsStore } from "@/stores/reservations.store";

const statusOptions = [
  { value: "all", label: "Tous les statuts" },
  { value: "pending", label: "En attente" },
  { value: "confirmed", label: "Confirmé" },
  { value: "seated", label: "Installé" },
  { value: "completed", label: "Terminé" },
  { value: "cancelled", label: "Annulé" },
  { value: "no_show", label: "No-show" },
] as const;

const typeOptions = [
  { value: "all", label: "Tous les types" },
  { value: "restaurant", label: "Restaurant" },
  { value: "salle", label: "Location salle" },
  { value: "seminaire", label: "Séminaire" },
] as const;

export function ReservationsFilters() {
  const { view, filters, setView, setFilters } = useReservationsStore();

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFilters({ search: e.target.value });
  }

  function handleStatusChange(value: string | null) {
    if (!value || value === "all") {
      setFilters({ status: [] });
    } else {
      setFilters({ status: [value] });
    }
  }

  function handleTypeChange(value: string | null) {
    if (!value || value === "all") {
      setFilters({ type: [] });
    } else {
      setFilters({ type: [value] });
    }
  }

  function toggleView() {
    setView(view === "calendar" ? "list" : "calendar");
  }

  const currentStatus = filters.status.length === 1 ? filters.status[0] : "all";
  const currentType = filters.type.length === 1 ? filters.type[0] : "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Recherche */}
      <div className="relative min-w-48 flex-1 sm:max-w-64">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un client..."
          value={filters.search}
          onChange={handleSearchChange}
          className="pl-8"
        />
      </div>

      {/* Filtre statut */}
      <Select value={currentStatus} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-auto min-w-36">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Filtre type */}
      <Select value={currentType} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-auto min-w-36">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          {typeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Bascule vue */}
      <button
        type="button"
        onClick={toggleView}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-transparent px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={
          view === "calendar" ? "Passer en vue liste" : "Passer en vue calendrier"
        }
      >
        {view === "calendar" ? (
          <>
            <Calendar className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Calendrier</span>
          </>
        ) : (
          <>
            <List className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Liste</span>
          </>
        )}
      </button>
    </div>
  );
}
