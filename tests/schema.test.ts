import { describe, expect, it } from "vitest";
import { adminRsvpSchema, fieldErrors, rsvpSchema } from "@/lib/rsvp-schema";

const base = {
  firstName: "Marie",
  lastName: "Dupont",
  email: "Marie.Dupont@Example.com ",
  attendance: "yes",
  arrivalDate: "2026-11-29",
  departureDate: "2026-12-01",
  accommodation: "own",
  consent: true,
};

const errorsOf = (input: unknown) => {
  const r = rsvpSchema.safeParse(input);
  return r.success ? {} : fieldErrors(r.error.issues);
};

describe("rsvpSchema — cas valides", () => {
  it("normalise l'e-mail en minuscules et applique les valeurs par défaut", () => {
    const r = rsvpSchema.parse(base);
    expect(r.email).toBe("marie.dupont@example.com");
    expect(r.adults).toBe(1);
    expect(r.children).toBe(0);
    expect(r.dinner).toBe("tbd");
    expect(r.datesUndecided).toBe(false);
  });

  it("accepte « dates non fixées » sans dates", () => {
    const r = rsvpSchema.parse({ ...base, arrivalDate: null, departureDate: null, datesUndecided: true });
    expect(r.arrivalDate).toBeNull();
    expect(r.datesUndecided).toBe(true);
  });

  it("conserve la composition du groupe seulement si le logement commun intéresse", () => {
    const shared = rsvpSchema.parse({ ...base, accommodation: "interested", adults: 2, children: 1, childrenAges: "5 ans", accommodationNotes: "RDC" });
    expect(shared).toMatchObject({ adults: 2, children: 1, childrenAges: "5 ans", accommodationNotes: "RDC" });

    const own = rsvpSchema.parse({ ...base, accommodation: "own", adults: 4, children: 3, childrenAges: "x", accommodationNotes: "y" });
    expect(own).toMatchObject({ adults: 1, children: 0, childrenAges: null, accommodationNotes: null });
  });

  it("une réponse « Non » efface voyage, logement et dîner", () => {
    const r = rsvpSchema.parse({ ...base, attendance: "no", dinner: "yes", accommodation: "interested", comments: "Désolé" });
    expect(r).toMatchObject({ attendance: "no", arrivalDate: null, departureDate: null, accommodation: null, dinner: null, comments: "Désolé" });
  });

  it("« Non » n'exige ni dates ni logement", () => {
    expect(rsvpSchema.safeParse({ firstName: "A", lastName: "B", email: "a@b.co", attendance: "no", consent: true }).success).toBe(true);
  });
});

describe("rsvpSchema — rejets côté serveur", () => {
  it("exige les champs obligatoires", () => {
    const e = errorsOf({ consent: true });
    expect(e).toHaveProperty("firstName");
    expect(e).toHaveProperty("lastName");
    expect(e).toHaveProperty("email");
    expect(e).toHaveProperty("attendance");
  });

  it("exige le consentement", () => {
    expect(errorsOf({ ...base, consent: false })).toHaveProperty("consent");
    expect(errorsOf({ ...base, consent: undefined })).toHaveProperty("consent");
  });

  it("refuse une adresse e-mail invalide", () => {
    expect(errorsOf({ ...base, email: "pas-un-email" })).toHaveProperty("email");
  });

  it("remonte plusieurs erreurs d'un coup (champ, dates, consentement)", () => {
    const e = errorsOf({ ...base, email: "nope", consent: false, arrivalDate: "2026-12-01", departureDate: "2026-11-29" });
    expect(Object.keys(e).sort()).toEqual(["consent", "departureDate", "email"]);
  });

  it("refuse un départ antérieur à l'arrivée", () => {
    const e = errorsOf({ ...base, arrivalDate: "2026-12-01", departureDate: "2026-11-29" });
    expect(e.departureDate).toMatch(/ne peut pas précéder/);
  });

  it("refuse des dates qui n'incluent pas le 30 novembre pour un « Oui »", () => {
    expect(errorsOf({ ...base, arrivalDate: "2026-12-01", departureDate: "2026-12-03" })).toHaveProperty("departureDate");
    expect(errorsOf({ ...base, attendance: "maybe", arrivalDate: "2026-12-01", departureDate: "2026-12-03" })).toEqual({});
  });

  it("exige des dates ou la case « pas encore fixées », et une réponse logement", () => {
    expect(errorsOf({ ...base, arrivalDate: null, departureDate: null })).toHaveProperty("arrivalDate");
    expect(errorsOf({ ...base, accommodation: undefined })).toHaveProperty("accommodation");
  });

  it("refuse les dates invalides et les valeurs hors bornes", () => {
    expect(errorsOf({ ...base, arrivalDate: "2026-02-31" })).toHaveProperty("arrivalDate");
    expect(errorsOf({ ...base, accommodation: "interested", adults: 0 })).toHaveProperty("adults");
    expect(errorsOf({ ...base, accommodation: "interested", children: 99 })).toHaveProperty("children");
  });

  it("refuse un numéro WhatsApp invalide et des caractères suspects dans les noms", () => {
    expect(errorsOf({ ...base, whatsapp: "abc" })).toHaveProperty("whatsapp");
    expect(errorsOf({ ...base, firstName: "<script>" })).toHaveProperty("firstName");
    expect(errorsOf({ ...base, whatsapp: "+45 12 34 56 78" })).toEqual({});
  });

  it("limite la longueur des textes libres", () => {
    expect(errorsOf({ ...base, comments: "x".repeat(2001) })).toHaveProperty("comments");
  });
});

describe("adminRsvpSchema", () => {
  it("n'exige pas le consentement", () => {
    expect(adminRsvpSchema.safeParse({ ...base, consent: undefined }).success).toBe(true);
  });
});
