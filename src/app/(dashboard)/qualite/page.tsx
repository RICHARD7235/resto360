import {
  Sparkles, Thermometer, Truck, Tag, FlaskConical,
  Droplets, AlertTriangle, CalendarCheck, FileText,
} from "lucide-react";
import { ModuleCard } from "./_components/ModuleCard";

export const metadata = { title: "Qualité, Hygiène & Sécurité" };

const modules = [
  { title: "Plan de nettoyage & désinfection", description: "Planning, validation par PIN, photos, registre", icon: Sparkles, href: "/qualite/nettoyage" },
  { title: "Surveillance températures", description: "Sondes IoT, relevés automatiques, alertes", icon: Thermometer, v2: true },
  { title: "Traçabilité réception marchandises", description: "Contrôle T°, DLC, intégrité", icon: Truck, v2: true },
  { title: "Étiquetage DLC & préparations", description: "Étiquettes maison, dates secondaires", icon: Tag, v2: true },
  { title: "Plats témoins", description: "Prélèvements quotidiens conservés 5 jours", icon: FlaskConical, v2: true },
  { title: "Suivi huiles de friture", description: "Polarité, changements", icon: Droplets, v2: true },
  { title: "Non-conformités & actions correctives", description: "Registre dédié, suivi, rapports", icon: AlertTriangle, v2: true },
  { title: "Obligations annuelles", description: "Hottes, bac graisse, extincteurs, électricité", icon: CalendarCheck, v2: true },
  { title: "Documents PMS", description: "Plan de Maîtrise Sanitaire complet", icon: FileText, v2: true },
];

export default function QualitePage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Qualité, Hygiène & Sécurité</h1>
        <p className="text-muted-foreground mt-2">
          Module HACCP — traçabilité, contrôles et conformité réglementaire
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m) => <ModuleCard key={m.title} {...m} />)}
      </div>
    </div>
  );
}