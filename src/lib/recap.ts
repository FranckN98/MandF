import { computeStay, formatDateFr } from "./dates";
import { ACCOMMODATION_LABELS, ATTENDANCE_LABELS, participantCount, type RsvpInput } from "./rsvp-schema";

export interface RecapLine {
  label: string;
  value: string;
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

export function stayLabel(arrival: string | null, departure: string | null): string {
  const stay = computeStay(arrival, departure);
  if (!stay || !arrival || !departure) return "Dates non encore connues";
  return `${formatDateFr(arrival, { year: false })} → ${formatDateFr(departure, { year: false })} (${plural(stay.nights, "nuit")})`;
}

/** « 3 personnes : vous, 1 adulte, 1 enfant » — le répondant n'est compté qu'une fois. */
export function participantsLabel(extraAdults: number, children: number): string {
  const total = participantCount(extraAdults, children);
  if (total === 1) return "1 personne (vous seul(e))";
  const parts = ["vous"];
  if (extraAdults > 0) parts.push(plural(extraAdults, "adulte"));
  if (children > 0) parts.push(plural(children, "enfant"));
  return `${total} personnes : ${parts.join(", ")}`;
}

/** Récapitulatif lisible d'une réponse (notification aux organisateurs et e-mail à l'invité). */
export function buildRecap(input: RsvpInput): RecapLine[] {
  const lines: RecapLine[] = [{ label: "Nom", value: `${input.firstName} ${input.lastName}` }];
  if (input.email) lines.push({ label: "E-mail", value: input.email });
  lines.push({ label: "Présence", value: ATTENDANCE_LABELS[input.attendance] });
  if (input.attendance !== "no") {
    lines.push({ label: "Participants", value: participantsLabel(input.extraAdults, input.children) });
    if (input.companionNames) lines.push({ label: "Accompagnants", value: input.companionNames });
    lines.push({ label: "Séjour", value: stayLabel(input.arrivalDate, input.departureDate) });
    if (input.accommodation) {
      lines.push({ label: "Logement commun", value: ACCOMMODATION_LABELS[input.accommodation] });
      if (input.accommodation === "interested" && input.accommodationPeople) {
        lines.push({ label: "Personnes à loger", value: String(input.accommodationPeople) });
      }
    }
  }
  return lines;
}
