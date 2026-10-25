import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  configured: true,
  allow: true,
  blockEmail: false,
  turnstile: true,
  createRsvp: vi.fn(),
  findEditUrlByEmail: vi.fn(),
  adminMail: vi.fn(),
  guestMail: vi.fn(),
  guestLinkMail: vi.fn(),
  findByToken: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({ isServiceConfigured: () => h.configured, getServiceClient: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  allowRequest: async (scope: string) => h.allow && !(h.blockEmail && scope === "rsvp-email"),
  clientIp: () => "203.0.113.7",
}));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: async () => h.turnstile }));
vi.mock("@/lib/rsvp-service", () => ({
  createRsvp: h.createRsvp,
  findEditUrlByEmail: h.findEditUrlByEmail,
  findRsvpByToken: h.findByToken,
  updateRsvpByInvitee: h.update,
  deleteRsvpById: h.del,
  editUrlFor: (id: string) => `https://site.test/reponse/${id}`,
}));
vi.mock("@/lib/email", () => ({
  sendAdminNotification: h.adminMail,
  sendGuestConfirmation: h.guestMail,
  sendGuestEditLink: h.guestLinkMail,
}));

import { POST } from "@/app/api/rsvp/route";
import { PUT, DELETE } from "@/app/api/rsvp/[token]/route";

const payload = (over: Record<string, unknown> = {}) => ({
  firstName: "Marie",
  lastName: "Dupont",
  email: "Marie@Example.com",
  attendance: "yes",
  accompanied: true,
  extraAdults: 1,
  children: 1,
  arrivalDate: "2026-11-29",
  departureDate: "2026-12-01",
  accommodation: "interested",
  accommodationPeople: 3,
  consent: true,
  website: "",
  elapsedMs: 9000,
  ...over,
});

const post = (body: unknown) =>
  POST(new Request("http://site.test/api/rsvp", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

beforeEach(() => {
  h.configured = true;
  h.allow = true;
  h.blockEmail = false;
  h.turnstile = true;
  vi.clearAllMocks();
  h.createRsvp.mockResolvedValue({ status: "created", row: { id: "abc" }, editUrl: "https://site.test/reponse/secret-link" });
  h.adminMail.mockResolvedValue({ ok: true });
  h.guestMail.mockResolvedValue({ ok: true });
  h.guestLinkMail.mockResolvedValue({ ok: true });
  h.findEditUrlByEmail.mockResolvedValue("https://site.test/reponse/existing-link");
});

describe("POST /api/rsvp", () => {
  it("n'enregistre rien et le dit clairement quand la base n'est pas configurée (503)", async () => {
    h.configured = false;
    const res = await post(payload());
    expect(res.status).toBe(503);
    expect(h.createRsvp).not.toHaveBeenCalled();
  });

  it("rejette le champ leurre rempli par un robot", async () => {
    const res = await post(payload({ website: "http://spam" }));
    expect(res.status).toBe(400);
    expect(h.createRsvp).not.toHaveBeenCalled();
  });

  it("rejette un envoi trop rapide ou sans durée", async () => {
    expect((await post(payload({ elapsedMs: 300 }))).status).toBe(400);
    expect((await post(payload({ elapsedMs: undefined }))).status).toBe(400);
  });

  it("rejette un JSON invalide ou trop volumineux", async () => {
    expect((await post("{pas du json")).status).toBe(400);
    expect((await post(JSON.stringify({ comments: "x".repeat(40_000) }))).status).toBe(413);
  });

  it("limite le débit (429)", async () => {
    h.allow = false;
    expect((await post(payload())).status).toBe(429);
    expect(h.createRsvp).not.toHaveBeenCalled();
  });

  it("refuse si la vérification anti-robot échoue", async () => {
    h.turnstile = false;
    expect((await post(payload())).status).toBe(400);
    expect(h.createRsvp).not.toHaveBeenCalled();
  });

  it("valide côté serveur et renvoie les erreurs par champ sans toucher à la base", async () => {
    const res = await post(payload({ consent: false, email: "pas-un-email", arrivalDate: "2026-12-01", departureDate: "2026-11-29" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("validation");
    expect(Object.keys(body.fieldErrors)).toEqual(expect.arrayContaining(["email", "consent", "departureDate"]));
    expect(h.createRsvp).not.toHaveBeenCalled();
  });

  it("enregistre avec e-mail normalisé, total de participants correct et notifie organisateurs et invité", async () => {
    const res = await post(payload());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ status: "created", editUrl: "https://site.test/reponse/secret-link", emailSent: true });
    expect(JSON.stringify(body.recap)).toContain("3 personnes : vous, 1 adulte, 1 enfant");
    expect(JSON.stringify(body.recap)).toContain("2 nuits");
    expect(h.createRsvp.mock.calls[0][0]).toMatchObject({
      email: "marie@example.com",
      extraAdults: 1,
      children: 1,
      accommodation: "interested",
      accommodationPeople: 3,
    });
    expect(h.createRsvp.mock.calls[0][0]).not.toHaveProperty("whatsapp");
    expect(h.adminMail).toHaveBeenCalledOnce();
    expect(h.guestMail).toHaveBeenCalledOnce();
  });

  it("un échec des e-mails n'empêche pas la confirmation", async () => {
    h.adminMail.mockResolvedValue({ ok: false, reason: "not_configured" });
    h.guestMail.mockResolvedValue({ ok: false, reason: "not_configured" });
    const res = await post(payload());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "created", emailSent: false });
  });

  it("limite aussi par adresse e-mail (429)", async () => {
    h.blockEmail = true;
    expect((await post(payload())).status).toBe(429);
    expect(h.createRsvp).not.toHaveBeenCalled();
  });

  it("sur adresse déjà utilisée : pas de doublon, lien envoyé par e-mail uniquement, jamais dans la réponse", async () => {
    h.createRsvp.mockResolvedValue({ status: "exists" });
    const res = await post(payload());
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(JSON.parse(text)).toEqual({ status: "exists", emailSent: true });
    expect(text).not.toContain("existing-link");
    expect(h.guestLinkMail).toHaveBeenCalledWith("marie@example.com", "https://site.test/reponse/existing-link");
    expect(h.adminMail).not.toHaveBeenCalled();
  });

  it("renvoie une erreur générique sans détail technique si la base échoue (500)", async () => {
    h.createRsvp.mockRejectedValue(new Error("duplicate key value violates unique constraint secret_table"));
    const res = await post(payload());
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("secret_table");
  });
});

describe("/api/rsvp/[token]", () => {
  const ctx = { params: Promise.resolve({ token: "tok" }) };
  const put = (body: unknown) => PUT(new Request("http://site.test/api/rsvp/tok", { method: "PUT", body: JSON.stringify(body) }), ctx);
  const row = {
    id: "11111111-1111-4111-8111-111111111111", first_name: "Marie", last_name: "Dupont", email: "marie@example.com", whatsapp: null,
    attendance_status: "maybe", arrival_date: null, departure_date: null, accommodation_status: "undecided", accompanying_adults: 1,
    accompanying_children: 0, companion_names: null, accommodation_people: null, children_ages: null, accommodation_notes: null, dinner_status: null, comments: null,
  };

  it("refuse un lien invalide ou périmé (404) sans rien modifier", async () => {
    h.findByToken.mockResolvedValue(null);
    expect((await put(payload())).status).toBe(404);
    expect((await DELETE(new Request("http://site.test/api/rsvp/tok", { method: "DELETE" }), ctx)).status).toBe(404);
    expect(h.update).not.toHaveBeenCalled();
    expect(h.del).not.toHaveBeenCalled();
  });

  it("met à jour la réponse liée au lien, sans redemander le consentement", async () => {
    h.findByToken.mockResolvedValue({ row, version: 1 });
    h.update.mockResolvedValue({ status: "updated", row });
    const res = await put(payload({ consent: undefined, attendance: "maybe", accompanied: false, accommodation: "undecided", accommodationPeople: undefined, arrivalDate: null, departureDate: null, datesUndecided: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "updated" });
    expect(h.update).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", expect.objectContaining({ attendance: "maybe", extraAdults: 0 }));
  });

  it("signale une adresse e-mail déjà utilisée par une autre réponse (409)", async () => {
    h.findByToken.mockResolvedValue({ row, version: 1 });
    h.update.mockResolvedValue({ status: "email_taken" });
    const res = await put(payload({ consent: undefined }));
    expect(res.status).toBe(409);
    expect((await res.json()).fieldErrors).toHaveProperty("email");
  });

  it("supprime les données de l'invité sur demande", async () => {
    h.findByToken.mockResolvedValue({ row: { ...row, id: "22222222-2222-4222-8222-222222222222", attendance_status: "no" }, version: 1 });
    const res = await DELETE(new Request("http://site.test/api/rsvp/tok", { method: "DELETE" }), ctx);
    expect(res.status).toBe(200);
    expect(h.del).toHaveBeenCalledWith("22222222-2222-4222-8222-222222222222");
  });
});
