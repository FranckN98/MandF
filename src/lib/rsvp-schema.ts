import { z } from "zod";
import { MAX_STAY_DAYS, TRAVEL_WINDOW, WEDDING_DATE, diffDays, isValidIsoDate } from "./dates";

export const ATTENDANCE = ["yes", "no", "maybe"] as const;
/** Valeurs possibles en base : « individual » vient d'anciennes réponses et se comporte comme « own » (pas besoin du logement commun). */
export const ACCOMMODATION = ["interested", "own", "individual", "undecided"] as const;
/** Choix proposés dans le formulaire. */
export const ACCOMMODATION_CHOICES = ["interested", "own", "undecided"] as const;
export const DINNER = ["yes", "no", "tbd"] as const;

export type Attendance = (typeof ATTENDANCE)[number];
export type Accommodation = (typeof ACCOMMODATION)[number];
export type AccommodationChoice = (typeof ACCOMMODATION_CHOICES)[number];
export type Dinner = (typeof DINNER)[number];

export const ATTENDANCE_LABELS: Record<Attendance, string> = {
  yes: "Oui",
  no: "Non",
  maybe: "Je ne sais pas encore",
};
export const ATTENDANCE_SHORT: Record<Attendance, string> = { yes: "Présent(e)", no: "Absent(e)", maybe: "Indécis(e)" };

export const ACCOMMODATION_LABELS: Record<Accommodation, string> = {
  interested: "Oui, je suis intéressé(e)",
  own: "Non, je n'en ai pas besoin",
  individual: "Non, je n'en ai pas besoin",
  undecided: "Je ne sais pas encore",
};
export const ACCOMMODATION_SHORT: Record<Accommodation, string> = {
  interested: "Intéressé(e)",
  own: "Pas besoin",
  individual: "Pas besoin",
  undecided: "Ne sait pas encore",
};

/** Ancienne question sur le dîner : conservée en base et dans l'export CSV, plus demandée. */
export const DINNER_SHORT: Record<Dinner, string> = { yes: "Oui", no: "Non", tbd: "À confirmer" };

export interface RsvpInput {
  firstName: string;
  lastName: string;
  email: string | null;
  attendance: Attendance;
  /** Adultes en plus du répondant. */
  extraAdults: number;
  children: number;
  companionNames: string | null;
  datesUndecided: boolean;
  arrivalDate: string | null;
  departureDate: string | null;
  accommodation: AccommodationChoice | null;
  /** Personnes à loger au total (répondant et accompagnants compris), uniquement si le logement commun intéresse. */
  accommodationPeople: number | null;
  consent: boolean;
}

/** Nombre total de participants : le répondant n'est compté qu'une fois. */
export const participantCount = (extraAdults: number, children: number) => 1 + extraAdults + children;

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const FORBIDDEN_IN_NAME = /[<>{}[\]\\/|@#$%^*=+_~`"]/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

/** Ancien identifiant des réponses (conservé pour les réponses existantes) : format international, ex. +237 6 12 34 56 78. */
export function normalizeWhatsapp(raw: string): string | null {
  let s = raw.replace(CONTROL_CHARS, "").trim().replace(/[\s().-]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  return /^\+[1-9]\d{6,14}$/.test(s) ? s : null;
}

export const whatsappLink = (number: string, text?: string) =>
  `https://wa.me/${number.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

const count = (max: number) =>
  z.number({ error: "Nombre invalide." }).int({ error: "Nombre invalide." }).min(0, { error: "Minimum 0." }).max(max, { error: `Maximum ${max}.` }).optional().default(0);

const emailField = (required: boolean) =>
  z
    .string()
    .nullish()
    .transform((v) => (v ? v.replace(CONTROL_CHARS, "").trim().toLowerCase() : null))
    .refine((v) => !required || v !== null, { error: "Veuillez indiquer votre adresse e-mail." })
    .refine((v) => v === null || (v.length <= 254 && EMAIL_RE.test(v)), { error: "Cette adresse e-mail semble incorrecte." });

const shape = {
  firstName: nameField("prénom"),
  lastName: nameField("nom de famille"),
  attendance: z.enum(ATTENDANCE, { error: "Merci de choisir une réponse." }),
  accompanied: z.boolean().nullish(),
  extraAdults: count(19),
  children: count(19),
  companionNames: optionalText(300),
  datesUndecided: z.boolean().optional().default(false),
  arrivalDate: optionalDate,
  departureDate: optionalDate,
  accommodation: z.enum(ACCOMMODATION_CHOICES, { error: "Merci de choisir une réponse." }).nullish(),
  accommodationPeople: z.number({ error: "Nombre invalide." }).int({ error: "Nombre invalide." }).min(1, { error: "Minimum 1." }).max(40, { error: "Maximum 40." }).nullish(),
};

interface SchemaOptions {
  requireConsent: boolean;
  /** Invité (création ou modification) : e-mail et choix « accompagné(e) » obligatoires. L'administration reste souple pour les anciennes réponses. */
  guest: boolean;
}

export function makeRsvpSchema(opts: SchemaOptions) {
  return z
    .object({
      ...shape,
      email: emailField(opts.guest),
      // Le consentement est contrôlé dans superRefine (et non par un literal) pour que les autres erreurs soient toutes remontées en une fois.
      consent: z.boolean().optional().default(false),
    })
    .superRefine((v, ctx) => {
      if (opts.requireConsent && v.consent !== true) {
        ctx.addIssue({ code: "custom", path: ["consent"], message: "Votre consentement est nécessaire pour enregistrer votre réponse." });
      }
      if (v.attendance === "no") return;

      if (opts.guest && v.accompanied == null) {
        ctx.addIssue({ code: "custom", path: ["accompanied"], message: "Merci de choisir une réponse." });
      }
      if (v.accompanied === true && v.extraAdults + v.children === 0) {
        ctx.addIssue({ code: "custom", path: ["extraAdults"], message: "Indiquez au moins un adulte ou un enfant, ou choisissez « Non, je viens seul(e) »." });
      }

      if (!v.accommodation) {
        ctx.addIssue({ code: "custom", path: ["accommodation"], message: "Merci de choisir une réponse." });
      }

      const { arrivalDate: a, departureDate: d } = v;
      if (!v.datesUndecided) {
        if (!a && !d) {
          ctx.addIssue({
            code: "custom",
            path: ["arrivalDate"],
            message: "Indiquez vos dates ou cochez « Je ne connais pas encore mes dates ».",
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
      const withCompanions = coming && v.accompanied !== false;
      const extraAdults = withCompanions ? v.extraAdults : 0;
      const children = withCompanions ? v.children : 0;
      const wantsShared = coming && v.accommodation === "interested";
      const hasDates = coming && !v.datesUndecided && !!v.arrivalDate && !!v.departureDate;
      return {
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        attendance: v.attendance,
        extraAdults,
        children,
        companionNames: extraAdults + children > 0 ? v.companionNames : null,
        datesUndecided: coming && !hasDates,
        arrivalDate: hasDates ? v.arrivalDate : null,
        departureDate: hasDates ? v.departureDate : null,
        accommodation: coming ? (v.accommodation ?? null) : null,
        accommodationPeople: wantsShared ? (v.accommodationPeople ?? participantCount(extraAdults, children)) : null,
        consent: opts.requireConsent ? v.consent === true : true,
      };
    });
}

export const rsvpSchema = makeRsvpSchema({ requireConsent: true, guest: true });
export const guestEditSchema = makeRsvpSchema({ requireConsent: false, guest: true });
export const adminRsvpSchema = makeRsvpSchema({ requireConsent: false, guest: false });

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
  email: string | null;
  /** Anciennes réponses uniquement : le numéro n'est plus demandé. */
  whatsapp: string | null;
  attendance_status: Attendance;
  arrival_date: string | null;
  departure_date: string | null;
  stay_days: number | null;
  stay_nights: number | null;
  travel_dates_confirmed: boolean;
  accommodation_status: Accommodation | null;
  interested_in_shared_accommodation: boolean;
  /** Adultes au total, répondant compris. */
  accompanying_adults: number;
  accompanying_children: number;
  companion_names: string | null;
  accommodation_people: number | null;
  children_ages: string | null;
  accommodation_notes: string | null;
  dinner_status: Dinner | null;
  comments: string | null;
  privacy_consent_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Colonnes insérées/mises à jour depuis le formulaire (les colonnes calculées stay_* sont générées par PostgreSQL).
 * whatsapp, dinner_status, comments, children_ages et accommodation_notes n'y figurent pas : les anciennes valeurs sont conservées.
 */
export function inputToRow(input: RsvpInput) {
  return {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    attendance_status: input.attendance,
    arrival_date: input.arrivalDate,
    departure_date: input.departureDate,
    travel_dates_confirmed: input.arrivalDate !== null && input.departureDate !== null,
    accommodation_status: input.accommodation,
    interested_in_shared_accommodation: input.accommodation === "interested",
    accompanying_adults: 1 + input.extraAdults,
    accompanying_children: input.children,
    companion_names: input.companionNames,
    accommodation_people: input.accommodationPeople,
    // La contrainte « absent_has_no_trip » interdit un dîner sur une réponse « Non » (ancienne donnée).
    ...(input.attendance === "no" ? { dinner_status: null } : {}),
  };
}

export function rowToInput(row: RsvpRow): RsvpInput {
  const extraAdults = Math.max(0, row.accompanying_adults - 1);
  const interested = row.attendance_status !== "no" && row.accommodation_status === "interested";
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    attendance: row.attendance_status,
    extraAdults,
    children: row.accompanying_children,
    companionNames: row.companion_names,
    datesUndecided: row.attendance_status !== "no" && !(row.arrival_date && row.departure_date),
    arrivalDate: row.arrival_date,
    departureDate: row.departure_date,
    accommodation: row.accommodation_status === "individual" ? "own" : row.accommodation_status,
    accommodationPeople: interested ? (row.accommodation_people ?? row.accompanying_adults + row.accompanying_children) : null,
    consent: true,
  };
}
