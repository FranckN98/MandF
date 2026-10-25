import {
  ACCOMMODATION_LABELS,
  ATTENDANCE_LABELS,
  DINNER_LABELS,
  type RsvpInput,
} from "./rsvp-schema";
import { computeStay, formatDateFr } from "./dates";

export interface RecapLine {
  label: string;
  value: string;
}

export function stayLabel(arrival: string | null, departure: string | null): string {
  const stay = computeStay(arrival, departure);
  if (!stay || !arrival || !departure) return "Dates non encore fixées";
  const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? "s" : ""}`;
  return `${formatDateFr(arrival)} → ${formatDateFr(departure)} (${plural(stay.days, "jour")} calendaire${stay.days > 1 ? "s" : ""} / ${plural(stay.nights, "nuit")})`;
}

export function partyLabel(adults: number, children: number, childrenAges: string | null): string {
  const a = `${adults} adulte${adults > 1 ? "s" : ""}`;
  if (children === 0) return a;
  const c = `${children} enfant${children > 1 ? "s" : ""}${childrenAges ? ` (${childrenAges})` : ""}`;
  return `${a}, ${c}`;
}

/** Récapitulatif lisible d'une réponse (page de remerciement et e-mails). */
export function buildRecap(input: RsvpInput): RecapLine[] {
  const lines: RecapLine[] = [
    { label: "Nom", value: `${input.firstName} ${input.lastName}` },
    { label: "E-mail", value: input.email },
  ];
  if (input.whatsapp) lines.push({ label: "WhatsApp", value: input.whatsapp });
  lines.push({ label: "Présence au mariage civil", value: ATTENDANCE_LABELS[input.attendance] });
  if (input.attendance !== "no") {
    lines.push({ label: "Voyage", value: stayLabel(input.arrivalDate, input.departureDate) });
    if (input.accommodation) {
      lines.push({ label: "Logement commun", value: ACCOMMODATION_LABELS[input.accommodation] });
      if (input.accommodation === "interested") {
        lines.push({ label: "Personnes à héberger", value: partyLabel(input.adults, input.children, input.childrenAges) });
        if (input.accommodationNotes) lines.push({ label: "Remarques logement", value: input.accommodationNotes });
      }
    }
    if (input.dinner) lines.push({ label: "Dîner à partir de 17h", value: DINNER_LABELS[input.dinner] });
  }
  if (input.comments) lines.push({ label: "Précisions", value: input.comments });
  return lines;
}
