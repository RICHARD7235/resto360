"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Monitor } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveStations } from "../../../admin-operationnelle/actions";
import type { Tables } from "@/types/database.types";

type Station = Tables<"preparation_stations">;

const STORAGE_KEY = "resto360_kds_station";

export default function CuisineSetupPage() {
  const router = useRouter();
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentStationId, setCurrentStationId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setCurrentStationId(stored);

    getActiveStations()
      .then(setStations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function selectStation(stationId: string) {
    localStorage.setItem(STORAGE_KEY, stationId);
    router.push(`/commandes/cuisine?station=${stationId}`);
  }

  function clearStation() {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStationId(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          className="min-h-11 min-w-11"
          render={<Link href="/commandes/cuisine" />}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Configuration tablette
          </h1>
          <p className="text-muted-foreground">
            Choisissez le poste pour cet ecran
          </p>
        </div>
      </div>

      {currentStationId && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Poste actuel : {stations.find((s) => s.id === currentStationId)?.name ?? "Inconnu"}
          <Button
            variant="link"
            className="ml-2 h-auto p-0 text-amber-800 underline"
            onClick={clearStation}
          >
            Reinitialiser
          </Button>
        </div>
      )}

      <div className="grid gap-3">
        {stations.map((station) => (
          <Card
            key={station.id}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => selectStation(station.id)}
          >
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <div
                className="size-5 rounded-full"
                style={{ backgroundColor: station.color ?? "#6B7280" }}
              />
              <CardTitle className="text-lg">{station.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
              <Monitor className="h-4 w-4" />
              Afficher uniquement les tickets de ce poste
            </CardContent>
          </Card>
        ))}

        <Card
          className="cursor-pointer border-dashed transition-shadow hover:shadow-md"
          onClick={() => router.push("/commandes/cuisine")}
        >
          <CardHeader>
            <CardTitle className="text-lg text-muted-foreground">
              Vue superviseur
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Voir tous les postes avec onglets de filtrage
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
