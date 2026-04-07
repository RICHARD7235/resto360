import { describe, it, expect } from "vitest";
import { getCreneauActif, isInCreneau } from "../creneaux";
import type { QhsSettings } from "@/lib/supabase/qhs/types";

const settings: QhsSettings = {
  restaurant_id: "r1",
  service_midi_debut: "11:30:00",
  service_midi_fin: "14:30:00",
  service_soir_debut: "18:30:00",
  service_soir_fin: "22:30:00",
  delai_alerte_manager_min: 15,
  delai_creation_nc_min: 60,
  email_rapport_quotidien: null,
  updated_at: "2026-04-07T00:00:00Z",
};

describe("getCreneauActif", () => {
  it("retourne avant_midi à 11h00", () => {
    expect(getCreneauActif(new Date("2026-04-07T11:00:00"), settings)).toBe("avant_midi");
  });
  it("retourne apres_midi à 14h45", () => {
    expect(getCreneauActif(new Date("2026-04-07T14:45:00"), settings)).toBe("apres_midi");
  });
  it("retourne avant_soir à 18h00", () => {
    expect(getCreneauActif(new Date("2026-04-07T18:00:00"), settings)).toBe("avant_soir");
  });
  it("retourne apres_soir à 22h45", () => {
    expect(getCreneauActif(new Date("2026-04-07T22:45:00"), settings)).toBe("apres_soir");
  });
  it("retourne fin_journee à 23h30", () => {
    expect(getCreneauActif(new Date("2026-04-07T23:30:00"), settings)).toBe("fin_journee");
  });
  it("retourne null à 03h00 (hors service)", () => {
    expect(getCreneauActif(new Date("2026-04-07T03:00:00"), settings)).toBeNull();
  });
});

describe("isInCreneau", () => {
  it("true si maintenant entre debut et fin", () => {
    const now = new Date("2026-04-07T12:00:00");
    expect(isInCreneau(now, "2026-04-07T11:00:00", "2026-04-07T13:00:00")).toBe(true);
  });
  it("false si maintenant après fin", () => {
    const now = new Date("2026-04-07T14:00:00");
    expect(isInCreneau(now, "2026-04-07T11:00:00", "2026-04-07T13:00:00")).toBe(false);
  });
});
