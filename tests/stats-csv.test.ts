import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";
import type { RsvpRow } from "@/lib/rsvp-schema";
import { computeNightlyNeeds, computeStats } from "@/lib/stats";

let n = 0;
const row = (over: Partial<RsvpRow>): RsvpRow => ({
  id: `id-${++n}`,
  first_name: "A",
  last_name: "B",
  email: `a${n}@example.com`,
  whatsapp: null,
  attendance_status: "yes",
  arrival_date: null,
  departure_date: null,
  stay_days: null,
  stay_nights: null,
  travel_dates_confirmed: false,
  accommodation_status: null,
  interested_in_shared_accommodation: false,
  accompanying_adults: 1,
  accompanying_children: 0,
  companion_names: null,
  accommodation_people: null,
  children_ages: null,
  accommodation_notes: null,
  dinner_status: null,
  comments: null,
  privacy_consent_at: "2026-10-01T10:00:00Z",
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-01T10:00:00Z",
  ...over,
});

const shared = { accommodation_status: "interested", interested_in_shared_accommodation: true } as const;

const rows: RsvpRow[] = [
  // 3 participants (2 adultes + 1 enfant), tous logés, 29 nov -> 1er déc : nuits 29->30 et 30->1er
  row({ ...shared, accompanying_adults: 2, accompanying_children: 1, accommodation_people: 3, arrival_date: "2026-11-29", departure_date: "2026-12-01" }),
  // indécis, seul, 28 -> 30 nov : nuits 28->29 et 29->30
  row({ attendance_status: "maybe", ...shared, accommodation_people: 1, arrival_date: "2026-11-28", departure_date: "2026-11-30" }),
  // 4 participants mais seulement 2 à loger, dates inconnues
  row({ ...shared, accompanying_adults: 3, accompanying_children: 1, accommodation_people: 2 }),
  // ancienne réponse : pas de accommodation_people, retombe sur adultes + enfants (1), reste après la période suivie
  row({ ...shared, arrival_date: "2026-11-30", departure_date: "2026-12-04" }),
  // absent : jamais compté, même avec des données résiduelles
  row({ attendance_status: "no", accommodation_status: "interested", accompanying_adults: 5 }),
  row({ accommodation_status: "own" }),
  row({ attendance_status: "maybe", accommodation_status: "undecided", accompanying_adults: 2 }),
];

describe("computeStats", () => {
  const s = computeStats(rows);
  it("compte les réponses par statut", () => {
    expect(s).toMatchObject({ total: 7, confirmed: 4, absent: 1, undecided: 2 });
  });
  it("compte les participants sans compter deux fois le répondant", () => {
    expect(s.participantsConfirmed).toBe(3 + 4 + 1 + 1);
    expect(s.participantsMaybe).toBe(1 + 2);
  });
  it("compte le besoin de logement commun à partir des personnes à loger déclarées (hors absents)", () => {
    expect(s.sharedInterestedResponses).toBe(4);
    expect(s.sharedPeople).toBe(3 + 1 + 2 + 1);
    expect(s.sharedUndecidedResponses).toBe(1);
  });
});

describe("computeNightlyNeeds", () => {
  const needs = computeNightlyNeeds(rows);
  const byLabel = Object.fromEntries(needs.nights.map((x) => [x.label, x]));

  it("calcule les personnes à loger par nuit selon les dates réelles", () => {
    expect(byLabel["28 → 29 novembre"].people).toBe(1);
    expect(byLabel["29 → 30 novembre"].people).toBe(3 + 1);
    expect(byLabel["30 novembre → 1er décembre"].people).toBe(3 + 1);
    expect(byLabel["1er → 2 décembre"].people).toBe(1);
  });
  it("distingue les indécis", () => {
    expect(byLabel["29 → 30 novembre"].tentativePeople).toBe(1);
  });
  it("signale dates inconnues et nuits hors période", () => {
    expect(needs.datesNotFixed).toBe(2);
    expect(needs.outsideWindow).toBe(1);
  });
});

describe("toCsv", () => {
  it("produit un CSV Excel (BOM, point-virgule) avec les libellés français", () => {
    const csv = toCsv([row({ first_name: "Zoé", last_name: "Nguyen", attendance_status: "maybe" })]);
    expect(csv.startsWith("\uFEFFPrénom;Nom;E-mail;Présence;Participants (total);")).toBe(true);
    expect(csv).toContain("Zoé;Nguyen;");
    expect(csv).toContain("Indécis(e)");
    expect(csv.split("\r\n")).toHaveLength(3);
  });
  it("exporte participants, nuits et personnes à loger", () => {
    const csv = toCsv([row({ ...shared, accompanying_adults: 2, accompanying_children: 1, accommodation_people: 2, stay_nights: 2, arrival_date: "2026-11-29", departure_date: "2026-12-01" })]);
    const cells = csv.split("\r\n")[1].split(";");
    expect(cells.slice(4, 7)).toEqual(["3", "2", "1"]); // participants, adultes, enfants
    expect(cells[10]).toBe("2"); // nuits
    expect(cells[12]).toBe("2"); // personnes à loger
  });
  it("neutralise l'injection de formules et échappe guillemets et séparateurs", () => {
    const csv = toCsv([row({ comments: '=HYPERLINK("http://x")', companion_names: "a;b" })]);
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(csv).toContain('"a;b"');
  });
});
