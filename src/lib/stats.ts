import type { RsvpRow } from "./rsvp-schema";
import { TRACKED_NIGHTS, nightLabel, nightStarts } from "./dates";

export interface DashboardStats {
  total: number;
  confirmed: number;
  absent: number;
  undecided: number;
  sharedInterestedResponses: number;
  sharedAdults: number;
  sharedChildren: number;
  sharedPeople: number;
  dinnerYes: number;
  dinnerToConfirm: number;
}

const coming = (r: RsvpRow) => r.attendance_status !== "no";

/** Statistiques calculées uniquement à partir des réponses enregistrées. */
export function computeStats(rows: RsvpRow[]): DashboardStats {
  const shared = rows.filter((r) => coming(r) && r.accommodation_status === "interested");
  return {
    total: rows.length,
    confirmed: rows.filter((r) => r.attendance_status === "yes").length,
    absent: rows.filter((r) => r.attendance_status === "no").length,
    undecided: rows.filter((r) => r.attendance_status === "maybe").length,
    sharedInterestedResponses: shared.length,
    sharedAdults: shared.reduce((n, r) => n + r.accompanying_adults, 0),
    sharedChildren: shared.reduce((n, r) => n + r.accompanying_children, 0),
    sharedPeople: shared.reduce((n, r) => n + r.accompanying_adults + r.accompanying_children, 0),
    dinnerYes: rows.filter((r) => coming(r) && r.dinner_status === "yes").length,
    dinnerToConfirm: rows.filter((r) => coming(r) && r.dinner_status === "tbd").length,
  };
}

export interface NightNeed {
  night: string;
  label: string;
  people: number;
  adults: number;
  children: number;
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

/** Besoin de logement commun par nuit, selon les dates déclarées et le nombre de voyageurs concernés. */
export function computeNightlyNeeds(rows: RsvpRow[], tracked: readonly string[] = TRACKED_NIGHTS): NightlyNeeds {
  const nights = new Map<string, NightNeed>(
    tracked.map((night) => [night, { night, label: nightLabel(night), people: 0, adults: 0, children: 0, tentativePeople: 0 }]),
  );
  let outsideWindow = 0;
  let datesNotFixed = 0;

  for (const r of rows) {
    if (!coming(r) || r.accommodation_status !== "interested") continue;
    const people = r.accompanying_adults + r.accompanying_children;
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
      slot.adults += r.accompanying_adults;
      slot.children += r.accompanying_children;
      if (r.attendance_status === "maybe") slot.tentativePeople += people;
    }
    if (outside) outsideWindow += people;
  }
  return { nights: [...nights.values()], outsideWindow, datesNotFixed };
}
