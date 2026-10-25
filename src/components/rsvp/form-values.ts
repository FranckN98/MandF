import type { AccommodationChoice, Attendance, RsvpInput } from "@/lib/rsvp-schema";

export interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  attendance: Attendance | "";
  accompanied: "yes" | "no" | "";
  /** Adultes en plus du répondant. */
  extraAdults: number;
  children: number;
  companionNames: string;
  datesUndecided: boolean;
  arrivalDate: string;
  departureDate: string;
  accommodation: AccommodationChoice | "";
  /** "" = non modifié : on reprend le nombre total de participants. */
  housingPeople: number | "";
  consent: boolean;
}

export const emptyValues = (): FormValues => ({
  firstName: "",
  lastName: "",
  email: "",
  attendance: "",
  accompanied: "",
  extraAdults: 0,
  children: 0,
  companionNames: "",
  datesUndecided: false,
  arrivalDate: "",
  departureDate: "",
  accommodation: "",
  housingPeople: "",
  consent: false,
});

/** Convertit l'état du formulaire en objet à valider (même schéma côté navigateur et côté serveur). */
export function toPayload(v: FormValues): Record<string, unknown> {
  return {
    firstName: v.firstName,
    lastName: v.lastName,
    email: v.email || null,
    attendance: v.attendance || undefined,
    accompanied: v.accompanied === "" ? null : v.accompanied === "yes",
    extraAdults: v.extraAdults,
    children: v.children,
    companionNames: v.companionNames || null,
    datesUndecided: v.datesUndecided,
    arrivalDate: v.arrivalDate || null,
    departureDate: v.departureDate || null,
    accommodation: v.accommodation || null,
    accommodationPeople: v.housingPeople === "" ? null : v.housingPeople,
    consent: v.consent,
  };
}

export function inputToValues(i: RsvpInput): FormValues {
  const coming = i.attendance !== "no";
  return {
    firstName: i.firstName,
    lastName: i.lastName,
    email: i.email ?? "",
    attendance: i.attendance,
    accompanied: coming ? (i.extraAdults + i.children > 0 ? "yes" : "no") : "",
    extraAdults: i.extraAdults,
    children: i.children,
    companionNames: i.companionNames ?? "",
    datesUndecided: i.datesUndecided,
    arrivalDate: i.arrivalDate ?? "",
    departureDate: i.departureDate ?? "",
    accommodation: i.accommodation ?? "",
    housingPeople: i.accommodationPeople ?? "",
    consent: true,
  };
}

export const FIELD_LABELS: Record<string, string> = {
  firstName: "Prénom",
  lastName: "Nom",
  email: "E-mail",
  attendance: "Présence",
  accompanied: "Accompagnants",
  extraAdults: "Adultes accompagnants",
  children: "Enfants",
  companionNames: "Prénoms des accompagnants",
  arrivalDate: "Date d'arrivée",
  departureDate: "Date de départ",
  accommodation: "Logement",
  accommodationPeople: "Personnes à loger",
  consent: "Consentement",
  form: "Formulaire",
};
