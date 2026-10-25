import { ACCOMMODATION_SHORT, ATTENDANCE_SHORT, DINNER_SHORT, type RsvpRow } from "./rsvp-schema";
import { rowHousingPeople, rowParticipants } from "./stats";

const HEADERS = [
  "Prénom",
  "Nom",
  "E-mail",
  "Présence",
  "Participants (total)",
  "Adultes (total)",
  "Enfants",
  "Prénoms des accompagnants",
  "Arrivée",
  "Départ",
  "Nuits",
  "Logement commun",
  "Personnes à loger",
  "WhatsApp (anciennes réponses)",
  "Dîner (anciennes réponses)",
  "Commentaires (anciennes réponses)",
  "Consentement le",
  "Réponse créée le",
  "Dernière modification",
] as const;

// Neutralise l'injection de formules (=, +, -, @) à l'ouverture dans Excel / LibreOffice.
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let s = String(value).replace(/\r?\n/g, " ");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV compatible Excel (BOM UTF-8, séparateur point-virgule, fins de ligne CRLF). */
export function toCsv(rows: RsvpRow[]): string {
  const lines = [HEADERS.join(";")];
  for (const r of rows) {
    const coming = r.attendance_status !== "no";
    lines.push(
      [
        r.first_name,
        r.last_name,
        r.email,
        ATTENDANCE_SHORT[r.attendance_status],
        coming ? rowParticipants(r) : "",
        coming ? r.accompanying_adults : "",
        coming ? r.accompanying_children : "",
        r.companion_names,
        r.arrival_date,
        r.departure_date,
        r.stay_nights,
        r.accommodation_status ? ACCOMMODATION_SHORT[r.accommodation_status] : "",
        coming && r.accommodation_status === "interested" ? rowHousingPeople(r) : "",
        r.whatsapp,
        r.dinner_status ? DINNER_SHORT[r.dinner_status] : "",
        r.comments,
        r.privacy_consent_at,
        r.created_at,
        r.updated_at,
      ]
        .map(cell)
        .join(";"),
    );
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
