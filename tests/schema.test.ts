import { describe, expect, it } from "vitest";
import { adminRsvpSchema, fieldErrors, guestEditSchema, normalizeWhatsapp, participantCount, rowToInput, inputToRow, rsvpSchema, whatsappLink, type RsvpRow } from "@/lib/rsvp-schema";

const base = {
  firstName: "Marie",
  lastName: "Dupont",
  email: " Marie.Dupont@Example.com ",
  attendance: "yes",
  accompanied: false,
  arrivalDate: "2026-11-29",
  departureDate: "2026-12-01",
  accommodation: "own",
  consent: true,
};

const errorsOf = (input: unknown, schema: typeof rsvpSchema = rsvpSchema) => {
  const r = schema.safeParse(input);
  return r.success ? {} : fieldErrors(r.error.issues);
};

describe("normalizeWhatsapp (anciennes réponses)", () => {
  it("accepte le format international avec séparateurs et le préfixe 00", () => {
    expect(normalizeWhatsapp("+237 6 12 34 56 78")).toBe("+237612345678");
    expect(normalizeWhatsapp("0033 6 12 34 56 78")).toBe("+33612345678");
  });
  it("refuse les numéros sans indicatif ou invalides", () => {
    for (const bad of ["06 12 34 56 78", "612345678", "+12345", "abc", ""]) expect(normalizeWhatsapp(bad)).toBeNull();
  });
  it("construit un lien wa.me", () => {
    expect(whatsappLink("+237612345678")).toBe("https://wa.me/237612345678");
  });
});

describe("rsvpSchema — cas valides", () => {
  it("normalise l'e-mail (espaces, casse) et applique les valeurs par défaut", () => {
    const r = rsvpSchema.parse(base);
    expect(r.email).toBe("marie.dupont@example.com");
    expect(r).toMatchObject({ extraAdults: 0, children: 0, companionNames: null, accommodationPeople: null, datesUndecided: false });
    expect(r).not.toHaveProperty("whatsapp");
    expect(r).not.toHaveProperty("dinner");
  });

  it("accepte « dates non connues » sans dates", () => {
    const r = rsvpSchema.parse({ ...base, arrivalDate: null, departureDate: null, datesUndecided: true });
    expect(r.arrivalDate).toBeNull();
    expect(r.datesUndecided).toBe(true);
  });

  it("compte le répondant une seule fois dans le total des participants", () => {
    const r = rsvpSchema.parse({ ...base, accompanied: true, extraAdults: 2, children: 1, companionNames: "Paul, Léa, Sam" });
    expect(r).toMatchObject({ extraAdults: 2, children: 1, companionNames: "Paul, Léa, Sam" });
    expect(participantCount(r.extraAdults, r.children)).toBe(4);
    expect(participantCount(0, 0)).toBe(1);
    // En base : adultes au total (répondant compris) + enfants = participants.
    const row = inputToRow(r);
    expect(row.accompanying_adults + row.accompanying_children).toBe(4);
  });

  it("« Non, je viens seul(e) » ignore les accompagnants saisis auparavant", () => {
    const r = rsvpSchema.parse({ ...base, accompanied: false, extraAdults: 3, children: 2, companionNames: "x" });
    expect(r).toMatchObject({ extraAdults: 0, children: 0, companionNames: null });
  });

  it("logement : nombre de personnes à loger saisi, ou total des participants par défaut, seulement si intéressé", () => {
    const withDefault = rsvpSchema.parse({ ...base, accompanied: true, extraAdults: 1, children: 1, accommodation: "interested" });
    expect(withDefault.accommodationPeople).toBe(3);
    const explicit = rsvpSchema.parse({ ...base, accompanied: true, extraAdults: 1, children: 1, accommodation: "interested", accommodationPeople: 2 });
    expect(explicit.accommodationPeople).toBe(2);
    const notNeeded = rsvpSchema.parse({ ...base, accommodation: "own", accommodationPeople: 4 });
    expect(notNeeded.accommodationPeople).toBeNull();
  });

  it("une réponse « Non » efface accompagnants, voyage et logement", () => {
    const r = rsvpSchema.parse({ ...base, attendance: "no", accompanied: true, extraAdults: 2, accommodation: "interested", accommodationPeople: 3 });
    expect(r).toMatchObject({ attendance: "no", extraAdults: 0, children: 0, arrivalDate: null, departureDate: null, accommodation: null, accommodationPeople: null });
  });

  it("« Non » n'exige que le nom, l'e-mail et le consentement", () => {
    expect(rsvpSchema.safeParse({ firstName: "A", lastName: "B", email: "a@b.co", attendance: "no", consent: true }).success).toBe(true);
  });
});

describe("rsvpSchema — rejets côté serveur", () => {
  it("exige les champs obligatoires, dont l'e-mail", () => {
    const e = errorsOf({ consent: true });
    expect(e).toHaveProperty("firstName");
    expect(e).toHaveProperty("lastName");
    expect(e).toHaveProperty("email");
    expect(e).toHaveProperty("attendance");
  });

  it("refuse une adresse e-mail incorrecte", () => {
    for (const bad of ["marie", "marie@", "@example.com", "marie@example", "ma rie@example.com"]) {
      expect(errorsOf({ ...base, email: bad }).email).toMatch(/e-mail/);
    }
  });

  it("exige le consentement", () => {
    expect(errorsOf({ ...base, consent: false })).toHaveProperty("consent");
    expect(errorsOf({ ...base, consent: undefined })).toHaveProperty("consent");
  });

  it("exige une réponse à « Viendrez-vous accompagné(e) ? » et au moins un accompagnant si « Oui »", () => {
    expect(errorsOf({ ...base, accompanied: undefined })).toHaveProperty("accompanied");
    expect(errorsOf({ ...base, accompanied: true })).toHaveProperty("extraAdults");
    expect(errorsOf({ ...base, accompanied: true, children: 1 })).toEqual({});
  });

  it("remonte plusieurs erreurs d'un coup (champ, dates, consentement)", () => {
    const e = errorsOf({ ...base, email: "nope", consent: false, arrivalDate: "2026-12-01", departureDate: "2026-11-29" });
    expect(Object.keys(e).sort()).toEqual(["consent", "departureDate", "email"]);
  });

  it("refuse un départ antérieur à l'arrivée", () => {
    expect(errorsOf({ ...base, arrivalDate: "2026-12-01", departureDate: "2026-11-29" }).departureDate).toMatch(/ne peut pas précéder/);
  });

  it("refuse des dates qui n'incluent pas le 30 novembre pour un « Oui »", () => {
    expect(errorsOf({ ...base, arrivalDate: "2026-12-01", departureDate: "2026-12-03" })).toHaveProperty("departureDate");
    expect(errorsOf({ ...base, attendance: "maybe", arrivalDate: "2026-12-01", departureDate: "2026-12-03" })).toEqual({});
  });

  it("exige des dates ou la case « dates inconnues », et une réponse logement", () => {
    expect(errorsOf({ ...base, arrivalDate: null, departureDate: null })).toHaveProperty("arrivalDate");
    expect(errorsOf({ ...base, accommodation: undefined })).toHaveProperty("accommodation");
    expect(errorsOf({ ...base, accommodation: "individual" })).toHaveProperty("accommodation");
  });

  it("refuse les valeurs hors bornes", () => {
    expect(errorsOf({ ...base, arrivalDate: "2026-02-31" })).toHaveProperty("arrivalDate");
    expect(errorsOf({ ...base, accompanied: true, extraAdults: -1 })).toHaveProperty("extraAdults");
    expect(errorsOf({ ...base, accompanied: true, children: 99 })).toHaveProperty("children");
    expect(errorsOf({ ...base, accommodation: "interested", accommodationPeople: 0 })).toHaveProperty("accommodationPeople");
    expect(errorsOf({ ...base, accommodation: "interested", accommodationPeople: 41 })).toHaveProperty("accommodationPeople");
  });

  it("refuse des caractères suspects dans les noms", () => {
    expect(errorsOf({ ...base, firstName: "<script>" })).toHaveProperty("firstName");
    expect(errorsOf({ ...base, firstName: "Jean-Marie", lastName: "N'Gami" })).toEqual({});
  });

  it("limite la longueur des prénoms des accompagnants", () => {
    expect(errorsOf({ ...base, accompanied: true, extraAdults: 1, companionNames: "x".repeat(301) })).toHaveProperty("companionNames");
  });
});

describe("guestEditSchema et adminRsvpSchema", () => {
  it("la modification par l'invité n'exige pas le consentement mais exige l'e-mail", () => {
    expect(guestEditSchema.safeParse({ ...base, consent: undefined }).success).toBe(true);
    expect(errorsOf({ ...base, email: undefined, consent: undefined }, guestEditSchema)).toHaveProperty("email");
  });
  it("l'administration n'exige ni consentement, ni e-mail, ni choix « accompagné(e) » (anciennes réponses)", () => {
    expect(adminRsvpSchema.safeParse({ ...base, consent: undefined, email: null, accompanied: undefined }).success).toBe(true);
  });
});

const legacyRow = (over: Partial<RsvpRow>): RsvpRow => ({
  id: "1",
  first_name: "Ancien",
  last_name: "Invité",
  email: null,
  whatsapp: "+237612345678",
  attendance_status: "yes",
  arrival_date: "2026-11-29",
  departure_date: "2026-12-01",
  stay_days: 3,
  stay_nights: 2,
  travel_dates_confirmed: true,
  accommodation_status: "interested",
  interested_in_shared_accommodation: true,
  accompanying_adults: 2,
  accompanying_children: 1,
  companion_names: null,
  accommodation_people: null,
  children_ages: "5 ans",
  accommodation_notes: "RDC",
  dinner_status: "yes",
  comments: "Hâte !",
  privacy_consent_at: "2026-10-01T10:00:00Z",
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-01T10:00:00Z",
  ...over,
});

describe("réponses existantes", () => {
  it("se rechargent dans le nouveau formulaire sans perte (adultes en plus, personnes à loger)", () => {
    expect(rowToInput(legacyRow({}))).toMatchObject({ extraAdults: 1, children: 1, accommodation: "interested", accommodationPeople: 3, email: null });
    expect(rowToInput(legacyRow({ accommodation_status: "individual", interested_in_shared_accommodation: false })).accommodation).toBe("own");
  });

  it("l'enregistrement d'une modification ne touche ni WhatsApp, ni dîner, ni commentaires, ni anciennes remarques", () => {
    const row = inputToRow(rowToInput(legacyRow({ email: "a@b.co" })));
    for (const kept of ["whatsapp", "dinner_status", "comments", "children_ages", "accommodation_notes"]) expect(row).not.toHaveProperty(kept);
  });

  it("passer à « Non » vide le dîner pour respecter la contrainte de la base", () => {
    expect(inputToRow(rsvpSchema.parse({ ...base, attendance: "no" }))).toMatchObject({ dinner_status: null, accommodation_status: null, accommodation_people: null });
  });
});
