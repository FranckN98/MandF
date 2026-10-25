import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";
import type { RsvpRow } from "@/lib/rsvp-schema";
import { computeNightlyNeeds, computeStats } from "@/lib/stats";

let n = 0;
const row = (over: Partial<RsvpRow>): RsvpRow => ({
  id: `id-${++n}`,
  first_name: "A",
  last_name: "B",
  email: `a${n}@b.co`,
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
  children_ages: null,
  accommodation_notes: null,
  dinner_status: null,
  comments: null,
  privacy_consent_at: "2026-10-01T10:00:00Z",
  created_at: "2026-10-01T10:00:00Z",
  updated_at: "2026-10-01T10:00:00Z",
  ...over,
});

const rows: RsvpRow[] = [
  // 2 adultes + 1 enfant, 29 nov -> 1er déc : nuits 29->30 et 30->1er
  row({ accommodation_status: "interested", interested_in_shared_accommodation: true, accompanying_adults: 2, accompanying_children: 1, arrival_date: "2026-11-29", departure_date: "2026-12-01", dinner_status: "yes" }),
  // indécis, 28 -> 30 nov : nuits 28->29 et 29->30
  row({ attendance_status: "maybe", accommodation_status: "interested", interested_in_shared_accommodation: true, arrival_date: "2026-11-28", departure_date: "2026-11-30", dinner_status: "tbd" }),
  // intéressé mais dates non fixées
  row({ accommodation_status: "interested", interested_in_shared_accommodation: true, accompanying_adults: 3 }),
  // reste après la période suivie (1er -> 4 déc)
  row({ accommodation_status: "interested", interested_in_shared_accommodation: true, arrival_date: "2026-11-30", departure_date: "2026-12-04" }),
  // absent : jamais compté, même avec des données résiduelles
  row({ attendance_status: "no", accommodation_status: "interested", accompanying_adults: 5 }),
  row({ accommodation_status: "own", dinner_status: "no" }),
];

describe("computeStats", () => {
  const s = computeStats(rows);
  it("compte les réponses par statut", () => {
    expect(s).toMatchObject({ total: 6, confirmed: 4, absent: 1, undecided: 1 });
  });
  it("compte les intéressés par le logement (hors absents) et les personnes à héberger", () => {
    expect(s.sharedInterestedResponses).toBe(4);
    expect(s.sharedAdults).toBe(2 + 1 + 3 + 1);
    expect(s.sharedChildren).toBe(1);
    expect(s.sharedPeople).toBe(8);
  });
  it("compte le dîner", () => {
    expect(s.dinnerYes).toBe(1);
    expect(s.dinnerToConfirm).toBe(1);
  });
});

describe("computeNightlyNeeds", () => {
  const needs = computeNightlyNeeds(rows);
  const byLabel = Object.fromEntries(needs.nights.map((x) => [x.label, x]));

  it("calcule les personnes par nuit selon les dates réelles", () => {
    expect(byLabel["28 → 29 novembre"].people).toBe(1);
    expect(byLabel["29 → 30 novembre"].people).toBe(3 + 1); // famille de 3 + indécis
    expect(byLabel["30 novembre → 1er décembre"].people).toBe(3 + 1); // famille de 3 + séjour long (1 pers.)
    expect(byLabel["1er → 2 décembre"].people).toBe(1);
  });
  it("distingue adultes, enfants et indécis", () => {
    expect(byLabel["29 → 30 novembre"]).toMatchObject({ adults: 3, children: 1, tentativePeople: 1 });
  });
  it("signale dates non fixées et nuits hors période", () => {
    expect(needs.datesNotFixed).toBe(3);
    expect(needs.outsideWindow).toBe(1);
  });
});

describe("toCsv", () => {
  it("produit un CSV Excel (BOM, point-virgule) avec les libellés français", () => {
    const csv = toCsv([row({ first_name: "Zoé", last_name: "Nguyen", attendance_status: "maybe" })]);
    expect(csv.startsWith("\uFEFFPrénom;Nom;")).toBe(true);
    expect(csv).toContain("Zoé;Nguyen;");
    expect(csv).toContain("Indécis(e)");
    expect(csv.split("\r\n")).toHaveLength(3);
  });
  it("neutralise l'injection de formules et échappe guillemets et séparateurs", () => {
    const csv = toCsv([row({ comments: '=HYPERLINK("http://x")', accommodation_notes: "a;b" })]);
    expect(csv).toContain(`"'=HYPERLINK(""http://x"")"`);
    expect(csv).toContain('"a;b"');
  });
});
