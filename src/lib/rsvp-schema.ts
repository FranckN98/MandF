import { z } from "zod";
import { MAX_STAY_DAYS, TRAVEL_WINDOW, WEDDING_DATE, diffDays, isValidIsoDate } from "./dates";

export const ATTENDANCE = ["yes", "no", "maybe"] as const;
export const ACCOMMODATION = ["interested", "own", "individual", "undecided"] as const;
export const DINNER = ["yes", "no", "tbd"] as const;

export type Attendance = (typeof ATTENDANCE)[number];
export type Accommodation = (typeof ACCOMMODATION)[number];
export type Dinner = (typeof DINNER)[number];

export const ATTENDANCE_LABELS: Record<Attendance, string> = {
  yes: "Oui, je serai présent(e).",
  no: "Non, je ne pourrai pas venir.",
  maybe: "Je ne sais pas encore.",
};
export const ATTENDANCE_SHORT: Record<Attendance, string> = { yes: "Présent(e)", no: "Absent(e)", maybe: "Indécis(e)" };

export const ACCOMMODATION_LABELS: Record<Accommodation, string> = {
  interested: "Oui, je suis intéressé(e).",
  own: "Non, j'ai déjà mon logement.",
  individual: "Non, je préfère réserver individuellement.",
  undecided: "Je ne sais pas encore.",
};
export const ACCOMMODATION_SHORT: Record<Accommodation, string> = {
  interested: "Intéressé(e) par le logement commun",
  own: "Logement déjà trouvé",
  individual: "Réservation individuelle",
  undecided: "Ne sait pas encore",
};

export const DINNER_LABELS: Record<Dinner, string> = { yes: "Oui.", no: "Non.", tbd: "À confirmer." };
export const DINNER_SHORT: Record<Dinner, string> = { yes: "Oui", no: "Non", tbd: "À confirmer" };

export interface RsvpInput {
  firstName: string;
  lastName: string;
  email: string;
  whatsapp: string | null;
  attendance: Attendance;
  datesUndecided: boolean;
  arrivalDate: string | null;
  departureDate: string | null;
  accommodation: Accommodation | null;
  adults: number;
  children: number;
  childrenAges: string | null;
  accommodationNotes: string | null;
  dinner: Dinner | null;
  comments: string | null;
  consent: boolean;
}

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const FORBIDDEN_IN_NAME = /[<>{}[\]\\/|@#$%^*=+_~`"]/;

const cleanText = (max: number) =>
  z
    .string()
    .max(max * 2)
    .transform((v) => v.replace(CONTROL_CHARS, "").trim())
    .refine((v) => v.length <= max, { error: `Maximum ${max} caractères.` });

const nameField = (label: string) =>
  cleanText(80)
    .refine((v) => v.length > 0, { error: `Veuillez indiquer votre ${label}.` })
    .refine((v) => !FORBIDDEN_IN_NAME.test(v), { error: `Caractères non autorisés dans le ${label}.` });

const optionalText = (max: number) => cleanText(max).nullish().transform((v) => (v ? v : null));

const optionalDate = z
  .string()
  .nullish()
  .transform((v) => (v ? v.trim() : null))
  .refine((v) => v === null || isValidIsoDate(v), { error: "Date invalide." });

const phoneField = z
  .string()
  .nullish()
  .transform((v) => (v ? v.replace(CONTROL_CHARS, "").trim() : null))
  .refine(
    (v) => {
      if (v === null) return true;
      if (!/^\+?[0-9 ().-]{6,25}$/.test(v)) return false;
      const digits = v.replace(/\D/g, "").length;
      return digits >= 6 && digits <= 15;
    },
    { error: "Numéro WhatsApp invalide (ex. : +45 12 34 56 78)." },
  );

const shape = {
  firstName: nameField("prénom"),
  lastName: nameField("nom de famille"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: "Veuillez indiquer votre adresse e-mail." })
    .max(254, { error: "Adresse e-mail trop longue." })
    .pipe(z.email({ error: "Adresse e-mail invalide." })),
  whatsapp: phoneField,
  attendance: z.enum(ATTENDANCE, { error: "Merci de choisir une réponse." }),
  datesUndecided: z.boolean().optional().default(false),
  arrivalDate: optionalDate,
  departureDate: optionalDate,
  accommodation: z.enum(ACCOMMODATION, { error: "Merci de choisir une réponse." }).nullish(),
  adults: z.number({ error: "Nombre invalide." }).int().min(1, { error: "Au moins 1 adulte (vous)." }).max(20, { error: "Maximum 20." }).optional().default(1),
  children: z.number({ error: "Nombre invalide." }).int().min(0, { error: "Minimum 0." }).max(20, { error: "Maximum 20." }).optional().default(0),
  childrenAges: optionalText(200),
  accommodationNotes: optionalText(1000),
  dinner: z.enum(DINNER, { error: "Merci de choisir une réponse." }).nullish(),
  comments: optionalText(2000),
};

export function makeRsvpSchema(opts: { requireConsent: boolean }) {
  return z
    .object({
      ...shape,
      // Le consentement est contrôlé dans superRefine (et non par un literal) pour que les autres erreurs soient toutes remontées en une fois.
      consent: z.boolean().optional().default(false),
    })
    .superRefine((v, ctx) => {
      if (opts.requireConsent && v.consent !== true) {
        ctx.addIssue({ code: "custom", path: ["consent"], message: "Votre consentement est nécessaire pour enregistrer votre réponse." });
      }
      if (v.attendance === "no") return;

      if (!v.accommodation) {
        ctx.addIssue({ code: "custom", path: ["accommodation"], message: "Merci de choisir une réponse." });
      }

      const { arrivalDate: a, departureDate: d } = v;
      if (!v.datesUndecided) {
        if (!a && !d) {
          ctx.addIssue({
            code: "custom",
            path: ["arrivalDate"],
            message: "Indiquez vos dates ou cochez « Mes dates ne sont pas encore fixées ».",
          });
        } else if (!a) {
          ctx.addIssue({ code: "custom", path: ["arrivalDate"], message: "Indiquez votre date d'arrivée." });
        } else if (!d) {
          ctx.addIssue({ code: "custom", path: ["departureDate"], message: "Indiquez votre date de départ." });
        }
      }
      if (a && (a < TRAVEL_WINDOW.min || a > TRAVEL_WINDOW.max)) {
        ctx.addIssue({ code: "custom", path: ["arrivalDate"], message: "Cette date d'arrivée semble hors période." });
      }
      if (d && (d < TRAVEL_WINDOW.min || d > TRAVEL_WINDOW.max)) {
        ctx.addIssue({ code: "custom", path: ["departureDate"], message: "Cette date de départ semble hors période." });
      }
      if (a && d) {
        const nights = diffDays(a, d);
        if (nights !== null && nights < 0) {
          ctx.addIssue({
            code: "custom",
            path: ["departureDate"],
            message: "La date de départ ne peut pas précéder la date d'arrivée.",
          });
        } else if (nights !== null && nights + 1 > MAX_STAY_DAYS) {
          ctx.addIssue({ code: "custom", path: ["departureDate"], message: `Séjour limité à ${MAX_STAY_DAYS} jours.` });
        } else if (v.attendance === "yes" && (a > WEDDING_DATE || d < WEDDING_DATE)) {
          ctx.addIssue({
            code: "custom",
            path: ["departureDate"],
            message: "Vos dates doivent inclure le 30 novembre 2026, jour du mariage.",
          });
        }
      }
    })
    .transform((v): RsvpInput => {
      const coming = v.attendance !== "no";
      const wantsShared = coming && v.accommodation === "interested";
      const hasDates = coming && !v.datesUndecided && !!v.arrivalDate && !!v.departureDate;
      return {
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        whatsapp: v.whatsapp,
        attendance: v.attendance,
        datesUndecided: coming && !hasDates,
        arrivalDate: hasDates ? v.arrivalDate : null,
        departureDate: hasDates ? v.departureDate : null,
        accommodation: coming ? (v.accommodation ?? null) : null,
        adults: wantsShared ? v.adults : 1,
        children: wantsShared ? v.children : 0,
        childrenAges: wantsShared && v.children > 0 ? v.childrenAges : null,
        accommodationNotes: wantsShared ? v.accommodationNotes : null,
        dinner: coming ? (v.dinner ?? "tbd") : null,
        comments: v.comments,
        consent: opts.requireConsent ? v.consent === true : true,
      };
    });
}

export const rsvpSchema = makeRsvpSchema({ requireConsent: true });
export const adminRsvpSchema = makeRsvpSchema({ requireConsent: false });

/** Premier message d'erreur par champ, pour affichage sous les champs du formulaire. */
export function fieldErrors(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** Ligne de la table wedding_rsvps telle que lue en base. */
export interface RsvpRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  whatsapp: string | null;
  attendance_status: Attendance;
  arrival_date: string | null;
  departure_date: string | null;
  stay_days: number | null;
  stay_nights: number | null;
  travel_dates_confirmed: boolean;
  accommodation_status: Accommodation | null;
  interested_in_shared_accommodation: boolean;
  accompanying_adults: number;
  accompanying_children: number;
  children_ages: string | null;
  accommodation_notes: string | null;
  dinner_status: Dinner | null;
  comments: string | null;
  privacy_consent_at: string;
  created_at: string;
  updated_at: string;
}

/** Colonnes insérées/mises à jour depuis le formulaire (les colonnes calculées stay_* sont générées par PostgreSQL). */
export function inputToRow(input: RsvpInput) {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    whatsapp: input.whatsapp,
    attendance_status: input.attendance,
    arrival_date: input.arrivalDate,
    departure_date: input.departureDate,
    travel_dates_confirmed: input.arrivalDate !== null && input.departureDate !== null,
    accommodation_status: input.accommodation,
    interested_in_shared_accommodation: input.accommodation === "interested",
    accompanying_adults: input.adults,
    accompanying_children: input.children,
    children_ages: input.childrenAges,
    accommodation_notes: input.accommodationNotes,
    dinner_status: input.dinner,
    comments: input.comments,
  };
}

export function rowToInput(row: RsvpRow): RsvpInput {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    whatsapp: row.whatsapp,
    attendance: row.attendance_status,
    datesUndecided: row.attendance_status !== "no" && !(row.arrival_date && row.departure_date),
    arrivalDate: row.arrival_date,
    departureDate: row.departure_date,
    accommodation: row.accommodation_status,
    adults: row.accompanying_adults,
    children: row.accompanying_children,
    childrenAges: row.children_ages,
    accommodationNotes: row.accommodation_notes,
    dinner: row.dinner_status,
    comments: row.comments,
    consent: true,
  };
}
