import type { QhsServiceCreneau, QhsSettings } from "@/lib/supabase/qhs/types";

const parseTime = (hms: string, base: Date): Date => {
  const [h, m] = hms.split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
};

export function getCreneauActif(now: Date, s: QhsSettings): QhsServiceCreneau | null {
  const midiDebut = parseTime(s.service_midi_debut, now);
  const midiFin = parseTime(s.service_midi_fin, now);
  const soirDebut = parseTime(s.service_soir_debut, now);
  const soirFin = parseTime(s.service_soir_fin, now);

  const avantMidiDebut = new Date(midiDebut.getTime() - 60 * 60_000);
  if (now >= avantMidiDebut && now < midiDebut) return "avant_midi";

  if (now >= midiDebut && now < midiFin) return "midi";

  const apresMidiFin = new Date(midiFin.getTime() + 60 * 60_000);
  if (now >= midiFin && now < apresMidiFin) return "apres_midi";

  const avantSoirDebut = new Date(soirDebut.getTime() - 60 * 60_000);
  if (now >= avantSoirDebut && now < soirDebut) return "avant_soir";

  if (now >= soirDebut && now < soirFin) return "soir";

  const apresSoirFin = new Date(soirFin.getTime() + 60 * 60_000);
  if (now >= soirFin && now < apresSoirFin) return "apres_soir";

  const finJourneeDebut = new Date(now);
  finJourneeDebut.setHours(23, 0, 0, 0);
  if (now >= finJourneeDebut) return "fin_journee";

  return null;
}

export function isInCreneau(now: Date, debut: string, fin: string): boolean {
  const d = new Date(debut).getTime();
  const f = new Date(fin).getTime();
  const n = now.getTime();
  return n >= d && n < f;
}
