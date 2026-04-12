import { requirePermission } from "@/lib/rbac";
import { getRegisters } from "@/lib/documents/queries";
import { seedRegistersIfMissing } from "../actions";
import { RegisterCard } from "../_components/register-card";

export default async function RegistresPage() {
  const { restaurantId } = await requirePermission("m12_documents", "read");
  await seedRegistersIfMissing(restaurantId);
  const registers = await getRegisters(restaurantId);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Registres légaux</h1>
        <p className="text-muted-foreground">
          Vue consolidée des registres obligatoires alimentés par les autres
          modules Resto360.
        </p>
      </div>

      {registers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun registre disponible.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {registers.map((r) => (
            <RegisterCard key={r.id} register={r} />
          ))}
        </div>
      )}
    </div>
  );
}
