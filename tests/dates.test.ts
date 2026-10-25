import { describe, expect, it } from "vitest";
import { addDays, computeStay, diffDays, formatDateFr, isValidIsoDate, nightLabel, nightStarts } from "@/lib/dates";

describe("computeStay", () => {
  it("compte les jours calendaires et les nuits (exemple du cahier des charges)", () => {
    expect(computeStay("2026-11-29", "2026-12-01")).toEqual({ days: 3, nights: 2 });
  });
  it("gère un séjour d'une seule journée", () => {
    expect(computeStay("2026-11-30", "2026-11-30")).toEqual({ days: 1, nights: 0 });
  });
  it("refuse un départ avant l'arrivée et les dates absentes", () => {
    expect(computeStay("2026-12-01", "2026-11-29")).toBeNull();
    expect(computeStay(null, "2026-11-29")).toBeNull();
    expect(computeStay("2026-11-29", undefined)).toBeNull();
  });
});

describe("dates", () => {
  it("valide strictement les dates ISO", () => {
    expect(isValidIsoDate("2026-11-30")).toBe(true);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("30/11/2026")).toBe(false);
  });
  it("calcule sans décalage de fuseau", () => {
    expect(diffDays("2026-10-24", "2026-10-26")).toBe(2); // passage à l'heure d'hiver en Europe
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
  });
  it("formate en français avec « 1er »", () => {
    expect(formatDateFr("2026-12-01")).toBe("1er décembre 2026");
    expect(formatDateFr("2026-11-29")).toBe("29 novembre 2026");
  });
  it("libelle les nuits comme dans le tableau de bord", () => {
    expect(nightLabel("2026-11-28")).toBe("28 → 29 novembre");
    expect(nightLabel("2026-11-30")).toBe("30 novembre → 1er décembre");
    expect(nightLabel("2026-12-01")).toBe("1er → 2 décembre");
  });
  it("liste les nuits passées sur place", () => {
    expect(nightStarts("2026-11-29", "2026-12-01")).toEqual(["2026-11-29", "2026-11-30"]);
    expect(nightStarts("2026-11-30", "2026-11-30")).toEqual([]);
  });
});
