import { createHmac, timingSafeEqual } from "node:crypto";

// Lien personnel de modification : "<id en base64url>.<signature HMAC-SHA256>".
// Rien n'est stocké : le lien se régénère à l'identique (par l'organisateur, depuis /admin) tant que la version du jeton n'a pas changé.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function secret(): string {
  const s = process.env.RSVP_TOKEN_SECRET;
  if (!s || s.length < 32) {
    throw new Error("RSVP_TOKEN_SECRET manquant ou trop court (32 caractères minimum).");
  }
  return s;
}

function sign(id: string, version: number): string {
  return createHmac("sha256", secret()).update(`${id}:${version}`).digest("base64url");
}

export function createEditToken(id: string, version: number): string {
  if (!UUID_RE.test(id)) throw new Error("Identifiant invalide.");
  const idPart = Buffer.from(id.replace(/-/g, ""), "hex").toString("base64url");
  return `${idPart}.${sign(id.toLowerCase(), version)}`;
}

/** Extrait l'identifiant d'un jeton sans en vérifier la signature (la vérification se fait avec la version lue en base). */
export function parseEditToken(token: string): { id: string; signature: string } | null {
  if (token.length > 120) return null;
  const [idPart, signature, extra] = token.split(".");
  if (!idPart || !signature || extra !== undefined) return null;
  if (!/^[A-Za-z0-9_-]{22}$/.test(idPart) || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return null;
  const hex = Buffer.from(idPart, "base64url").toString("hex");
  if (hex.length !== 32) return null;
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return { id, signature };
}

export function verifyEditSignature(id: string, version: number, signature: string): boolean {
  const expected = Buffer.from(sign(id.toLowerCase(), version));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
