import {
  ACCOMMODATION_SHORT,
  ATTENDANCE_SHORT,
  DINNER_SHORT,
  type RsvpRow,
} from "./rsvp-schema";

const HEADERS = [
  "Prénom",
  "Nom",
  "E-mail",
  "WhatsApp",
  "Présence",
  "Arrivée",
  "Départ",
  "Jours",
  "Nuits",
  "Dates fixées",
  "Logement",
  "Intéressé(e) logement commun",
  "Adultes",
  "Enfants",
  "Âge des enfants",
  "Remarques logement",
  "Dîner",
  "Commentaires",
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
    lines.push(
      [
        r.first_name,
        r.last_name,
        r.email,
        r.whatsapp,
        ATTENDANCE_SHORT[r.attendance_status],
        r.arrival_date,
        r.departure_date,
        r.stay_days,
        r.stay_nights,
        r.travel_dates_confirmed ? "Oui" : "Non",
        r.accommodation_status ? ACCOMMODATION_SHORT[r.accommodation_status] : "",
        r.interested_in_shared_accommodation ? "Oui" : "Non",
        r.accompanying_adults,
        r.accompanying_children,
        r.children_ages,
        r.accommodation_notes,
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
