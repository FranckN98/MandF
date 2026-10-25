import type { Accommodation, Attendance, Dinner, RsvpInput } from "@/lib/rsvp-schema";

export interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  whatsapp: string;
  attendance: Attendance | "";
  datesUndecided: boolean;
  arrivalDate: string;
  departureDate: string;
  accommodation: Accommodation | "";
  adults: number;
  children: number;
  childrenAges: string;
  accommodationNotes: string;
  dinner: Dinner | "";
  comments: string;
  consent: boolean;
}

export const emptyValues = (): FormValues => ({
  firstName: "",
  lastName: "",
  email: "",
  whatsapp: "",
  attendance: "",
  datesUndecided: false,
  arrivalDate: "",
  departureDate: "",
  accommodation: "",
  adults: 1,
  children: 0,
  childrenAges: "",
  accommodationNotes: "",
  dinner: "",
  comments: "",
  consent: false,
});

/** Convertit l'état du formulaire en objet à valider (même schéma côté navigateur et côté serveur). */
export function toPayload(v: FormValues): Record<string, unknown> {
  return {
    firstName: v.firstName,
    lastName: v.lastName,
    email: v.email,
    whatsapp: v.whatsapp || null,
    attendance: v.attendance || undefined,
    datesUndecided: v.datesUndecided,
    arrivalDate: v.arrivalDate || null,
    departureDate: v.departureDate || null,
    accommodation: v.accommodation || null,
    adults: v.adults,
    children: v.children,
    childrenAges: v.childrenAges || null,
    accommodationNotes: v.accommodationNotes || null,
    dinner: v.dinner || null,
    comments: v.comments || null,
    consent: v.consent,
  };
}

export function inputToValues(i: RsvpInput): FormValues {
  return {
    firstName: i.firstName,
    lastName: i.lastName,
    email: i.email,
    whatsapp: i.whatsapp ?? "",
    attendance: i.attendance,
    datesUndecided: i.datesUndecided,
    arrivalDate: i.arrivalDate ?? "",
    departureDate: i.departureDate ?? "",
    accommodation: i.accommodation ?? "",
    adults: i.adults,
    children: i.children,
    childrenAges: i.childrenAges ?? "",
    accommodationNotes: i.accommodationNotes ?? "",
    dinner: i.dinner ?? "",
    comments: i.comments ?? "",
    consent: true,
  };
}

export const FIELD_LABELS: Record<string, string> = {
  firstName: "Prénom",
  lastName: "Nom de famille",
  email: "Adresse e-mail",
  whatsapp: "Numéro WhatsApp",
  attendance: "Présence",
  arrivalDate: "Date d'arrivée",
  departureDate: "Date de départ",
  accommodation: "Logement",
  adults: "Adultes",
  children: "Enfants",
  childrenAges: "Âge des enfants",
  accommodationNotes: "Remarques logement",
  dinner: "Dîner",
  comments: "Précisions",
  consent: "Consentement",
  form: "Formulaire",
};
