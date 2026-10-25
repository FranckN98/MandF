import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  configured: true,
  allow: true,
  turnstile: true,
  createRsvp: vi.fn(),
  guestMail: vi.fn(),
  adminMail: vi.fn(),
  existingMail: vi.fn(),
  findByToken: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
}));

vi.mock("@/lib/supabase/service", () => ({ isServiceConfigured: () => h.configured, getServiceClient: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ allowRequest: async () => h.allow, clientIp: () => "203.0.113.7" }));
vi.mock("@/lib/turnstile", () => ({ verifyTurnstile: async () => h.turnstile }));
vi.mock("@/lib/rsvp-service", () => ({
  createRsvp: h.createRsvp,
  findRsvpByToken: h.findByToken,
  updateRsvpByInvitee: h.update,
  deleteRsvpById: h.del,
  editUrlFor: (id: string) => `https://site.test/reponse/${id}`,
}));
vi.mock("@/lib/email", () => ({
  sendGuestConfirmation: h.guestMail,
  sendAdminNotification: h.adminMail,
  sendExistingResponseLink: h.existingMail,
}));

import { POST } from "@/app/api/rsvp/route";
import { PUT, DELETE } from "@/app/api/rsvp/[token]/route";

const payload = (over: Record<string, unknown> = {}) => ({
  firstName: "Marie",
  lastName: "Dupont",
  email: "Marie@Example.com",
  attendance: "yes",
  arrivalDate: "2026-11-29",
  departureDate: "2026-12-01",
  accommodation: "interested",
  adults: 2,
  children: 1,
  dinner: "yes",
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
  h.turnstile = true;
  vi.clearAllMocks();
  h.createRsvp.mockResolvedValue({ status: "created", row: { id: "abc" }, editUrl: "https://site.test/reponse/secret-link" });
  h.guestMail.mockResolvedValue({ ok: true });
  h.adminMail.mockResolvedValue({ ok: true });
  h.existingMail.mockResolvedValue({ ok: true });
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
    const res = await post(payload({ consent: false, email: "nope", arrivalDate: "2026-12-01", departureDate: "2026-11-29" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("validation");
    expect(Object.keys(body.fieldErrors)).toEqual(expect.arrayContaining(["email", "consent", "departureDate"]));
    expect(h.createRsvp).not.toHaveBeenCalled();
  });

  it("enregistre, envoie les e-mails et renvoie le récapitulatif (e-mail normalisé)", async () => {
    const res = await post(payload());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ status: "created", emailSent: true });
    expect(body.editUrl).toBeUndefined();
    expect(body.recap.map((l: { label: string }) => l.label)).toContain("Voyage");
    expect(JSON.stringify(body.recap)).toContain("3 jours calendaires / 2 nuits");
    expect(h.createRsvp.mock.calls[0][0]).toMatchObject({ email: "marie@example.com", adults: 2, children: 1, accommodation: "interested" });
    expect(h.guestMail).toHaveBeenCalledOnce();
    expect(h.adminMail).toHaveBeenCalledOnce();
  });

  it("ne simule pas un e-mail envoyé : si l'envoi échoue, le lien est affiché une fois", async () => {
    h.guestMail.mockResolvedValue({ ok: false, reason: "not_configured" });
    const body = await (await post(payload())).json();
    expect(body).toMatchObject({ status: "created", emailSent: false, editUrl: "https://site.test/reponse/secret-link" });
  });

  it("sur adresse déjà utilisée : pas de doublon, lien renvoyé par e-mail, jamais dans la réponse HTTP", async () => {
    h.createRsvp.mockResolvedValue({ status: "exists", editUrl: "https://site.test/reponse/existing", firstName: "Marie" });
    const res = await post(payload());
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(JSON.parse(text)).toEqual({ status: "exists", emailSent: true });
    expect(text).not.toContain("existing");
    expect(h.existingMail).toHaveBeenCalledWith("marie@example.com", "Marie", "https://site.test/reponse/existing");
    expect(h.guestMail).not.toHaveBeenCalled();
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

  it("refuse un lien invalide ou périmé (404) sans rien modifier", async () => {
    h.findByToken.mockResolvedValue(null);
    expect((await put(payload())).status).toBe(404);
    expect((await DELETE(new Request("http://site.test/api/rsvp/tok", { method: "DELETE" }), ctx)).status).toBe(404);
    expect(h.update).not.toHaveBeenCalled();
    expect(h.del).not.toHaveBeenCalled();
  });

  it("met à jour la réponse liée au lien, sans demander à nouveau le consentement", async () => {
    const row = {
      id: "11111111-1111-4111-8111-111111111111", first_name: "Marie", last_name: "Dupont", email: "marie@example.com", whatsapp: null,
      attendance_status: "maybe", arrival_date: null, departure_date: null, accommodation_status: "undecided", accompanying_adults: 1,
      accompanying_children: 0, children_ages: null, accommodation_notes: null, dinner_status: "tbd", comments: null,
    };
    h.findByToken.mockResolvedValue({ row, version: 1 });
    h.update.mockResolvedValue(row);
    const res = await put(payload({ consent: undefined, attendance: "maybe", accommodation: "undecided", arrivalDate: null, departureDate: null, datesUndecided: true }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "updated" });
    expect(h.update).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111", expect.objectContaining({ attendance: "maybe" }));
  });

  it("supprime les données de l'invité sur demande", async () => {
    const row = { id: "22222222-2222-4222-8222-222222222222", first_name: "A", last_name: "B", email: "a@b.co", attendance_status: "no" };
    h.findByToken.mockResolvedValue({ row, version: 1 });
    const res = await DELETE(new Request("http://site.test/api/rsvp/tok", { method: "DELETE" }), ctx);
    expect(res.status).toBe(200);
    expect(h.del).toHaveBeenCalledWith("22222222-2222-4222-8222-222222222222");
  });
});
