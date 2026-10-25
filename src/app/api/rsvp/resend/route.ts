import { NextResponse, after } from "next/server";
import { z } from "zod";
import { sendExistingResponseLink } from "@/lib/email";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { findEditLinkByEmail } from "@/lib/rsvp-service";
import { isServiceConfigured } from "@/lib/supabase/service";
import { verifyTurnstile } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });
const emailSchema = z.email().max(254);

/**
 * « J'ai déjà répondu » : renvoie le lien personnel par e-mail. La réponse est identique que l'adresse soit connue ou non,
 * et l'envoi se fait après la réponse HTTP, pour ne pas révéler quelles adresses figurent dans la liste.
 */
export async function POST(req: Request) {
  if (!isServiceConfigured()) return json({ error: "not_configured", message: "Service indisponible pour le moment." }, 503);

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 4000) return json({ error: "too_large" }, 413);
    const parsedBody: unknown = JSON.parse(raw);
    if (typeof parsedBody !== "object" || parsedBody === null || Array.isArray(parsedBody)) throw new Error("bad body");
    body = parsedBody as Record<string, unknown>;
  } catch {
    return json({ error: "invalid", message: "Requête invalide." }, 400);
  }
  if (typeof body.website === "string" && body.website.trim() !== "") return json({ error: "invalid", message: "Requête invalide." }, 400);

  const parsedEmail = emailSchema.safeParse(typeof body.email === "string" ? body.email.trim().toLowerCase() : "");
  if (!parsedEmail.success) return json({ error: "validation", message: "Adresse e-mail invalide." }, 400);
  const email = parsedEmail.data;

  const ip = clientIp(req);
  try {
    if (!(await allowRequest("resend-ip", ip, 8, 600)) || !(await allowRequest("resend-email", email, 3, 3600))) {
      return json({ error: "rate_limited", message: "Trop de demandes. Merci de réessayer plus tard." }, 429);
    }
    if (!(await verifyTurnstile(body.turnstileToken, ip))) {
      return json({ error: "captcha", message: "La vérification anti-robot a échoué. Merci de réessayer." }, 400);
    }
    after(async () => {
      try {
        const found = await findEditLinkByEmail(email);
        if (found) await sendExistingResponseLink(email, found.firstName, found.editUrl);
      } catch (e) {
        console.error("[rsvp:resend] échec :", e instanceof Error ? e.message : e);
      }
    });
    return json({ ok: true });
  } catch (e) {
    console.error("[rsvp:resend] échec :", e instanceof Error ? e.message : e);
    return json({ error: "server", message: "Une erreur est survenue. Merci de réessayer." }, 500);
  }
}
