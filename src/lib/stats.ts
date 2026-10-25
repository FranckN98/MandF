import type { RsvpRow } from "./rsvp-schema";
import { TRACKED_NIGHTS, nightLabel, nightStarts } from "./dates";

export interface DashboardStats {
  total: number;
  confirmed: number;
  absent: number;
  undecided: number;
  /** Personnes attendues (répondants « Oui » et leurs accompagnants, chacun compté une fois). */
  participantsConfirmed: number;
  /** Personnes dont la présence reste incertaine (« Je ne sais pas encore »). */
  participantsMaybe: number;
  sharedInterestedResponses: number;
  sharedPeople: number;
  /** Réponses (présents ou indécis) qui ne savent pas encore pour le logement. */
  sharedUndecidedResponses: number;
}

const coming = (r: RsvpRow) => r.attendance_status !== "no";

/** Total des participants d'une réponse : adultes (répondant compris) + enfants. */
export const rowParticipants = (r: RsvpRow) => r.accompanying_adults + r.accompanying_children;

/** Personnes à loger : valeur déclarée, ou à défaut le total des participants (anciennes réponses). */
export const rowHousingPeople = (r: RsvpRow) => r.accommodation_people ?? rowParticipants(r);

/** Statistiques calculées uniquement à partir des réponses enregistrées. */
export function computeStats(rows: RsvpRow[]): DashboardStats {
  const shared = rows.filter((r) => coming(r) && r.accommodation_status === "interested");
  return {
    total: rows.length,
    confirmed: rows.filter((r) => r.attendance_status === "yes").length,
    absent: rows.filter((r) => r.attendance_status === "no").length,
    undecided: rows.filter((r) => r.attendance_status === "maybe").length,
    participantsConfirmed: rows.filter((r) => r.attendance_status === "yes").reduce((n, r) => n + rowParticipants(r), 0),
    participantsMaybe: rows.filter((r) => r.attendance_status === "maybe").reduce((n, r) => n + rowParticipants(r), 0),
    sharedInterestedResponses: shared.length,
    sharedPeople: shared.reduce((n, r) => n + rowHousingPeople(r), 0),
    sharedUndecidedResponses: rows.filter((r) => coming(r) && r.accommodation_status === "undecided").length,
  };
}

export interface NightNeed {
  night: string;
  label: string;
  people: number;
  /** dont personnes dont la présence est encore incertaine ("peut-être") */
  tentativePeople: number;
}

export interface NightlyNeeds {
  nights: NightNeed[];
  /** Personnes intéressées dont les nuits tombent hors de la période suivie. */
  outsideWindow: number;
  /** Personnes intéressées qui n'ont pas encore fixé leurs dates. */
  datesNotFixed: number;
}

/** Besoin de logement commun par nuit, selon les dates déclarées et le nombre de personnes à loger. */
export function computeNightlyNeeds(rows: RsvpRow[], tracked: readonly string[] = TRACKED_NIGHTS): NightlyNeeds {
  const nights = new Map<string, NightNeed>(tracked.map((night) => [night, { night, label: nightLabel(night), people: 0, tentativePeople: 0 }]));
  let outsideWindow = 0;
  let datesNotFixed = 0;

  for (const r of rows) {
    if (!coming(r) || r.accommodation_status !== "interested") continue;
    const people = rowHousingPeople(r);
    if (!r.arrival_date || !r.departure_date) {
      datesNotFixed += people;
      continue;
    }
    let outside = false;
    for (const night of nightStarts(r.arrival_date, r.departure_date)) {
      const slot = nights.get(night);
      if (!slot) {
        outside = true;
        continue;
      }
      slot.people += people;
      if (r.attendance_status === "maybe") slot.tentativePeople += people;
    }
    if (outside) outsideWindow += people;
  }
  return { nights: [...nights.values()], outsideWindow, datesNotFixed };
}
