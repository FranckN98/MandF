import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createEditToken, parseEditToken, verifyEditSignature } from "@/lib/tokens";

const ID = "3f2b8c1e-5a7d-4e90-b1c2-7d8e9f0a1b2c";
const original = process.env.RSVP_TOKEN_SECRET;

beforeEach(() => {
  process.env.RSVP_TOKEN_SECRET = "test-secret-test-secret-test-secret-1234";
});
afterEach(() => {
  process.env.RSVP_TOKEN_SECRET = original;
});

describe("liens personnels de modification", () => {
  it("se régénèrent à l'identique (renvoi par e-mail possible sans rotation)", () => {
    expect(createEditToken(ID, 1)).toBe(createEditToken(ID, 1));
  });

  it("font l'aller-retour identifiant / signature", () => {
    const parsed = parseEditToken(createEditToken(ID, 1));
    expect(parsed?.id).toBe(ID);
    expect(verifyEditSignature(ID, 1, parsed!.signature)).toBe(true);
  });

  it("sont invalidés quand la version change", () => {
    const parsed = parseEditToken(createEditToken(ID, 1))!;
    expect(verifyEditSignature(ID, 2, parsed.signature)).toBe(false);
  });

  it("rejettent une signature falsifiée ou un autre identifiant", () => {
    const parsed = parseEditToken(createEditToken(ID, 1))!;
    const forged = parsed.signature.slice(0, -1) + (parsed.signature.endsWith("A") ? "B" : "A");
    expect(verifyEditSignature(ID, 1, forged)).toBe(false);
    expect(verifyEditSignature("00000000-0000-4000-8000-000000000000", 1, parsed.signature)).toBe(false);
  });

  it("rejettent les formats incorrects", () => {
    for (const bad of ["", "abc", "a.b", `${"x".repeat(22)}.${"y".repeat(43)}.z`, "x".repeat(300)]) {
      expect(parseEditToken(bad)).toBeNull();
    }
  });

  it("refusent de fonctionner sans secret suffisamment long", () => {
    process.env.RSVP_TOKEN_SECRET = "court";
    expect(() => createEditToken(ID, 1)).toThrow(/RSVP_TOKEN_SECRET/);
  });
});
