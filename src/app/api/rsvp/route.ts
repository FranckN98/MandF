import { NextResponse } from "next/server";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { buildRecap } from "@/lib/recap";
import { createRsvp } from "@/lib/rsvp-service";
import { fieldErrors, rsvpSchema } from "@/lib/rsvp-schema";
import { isServiceConfigured } from "@/lib/supabase/service";
import { verifyTurnstile } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

const MIN_FILL_MS = 2500;
const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });

export async function POST(req: Request) {
  if (!isServiceConfigured()) {
    return json(
      { error: "not_configured", message: "L'enregistrement des réponses n'est pas encore activé sur ce site. Merci de réessayer plus tard." },
      503,
    );
  }

  const raw = await req.text();
  if (raw.length > 30_000) return json({ error: "too_large" }, 413);
  let body: Record<string, unknown>;
  try {
    const parsedBody: unknown = JSON.parse(raw);
    if (typeof parsedBody !== "object" || parsedBody === null || Array.isArray(parsedBody)) throw new Error("bad body");
    body = parsedBody as Record<string, unknown>;
  } catch {
    return json({ error: "invalid", message: "Requête invalide." }, 400);
  }

  // Pièges anti-robots : champ leurre invisible + durée minimale de remplissage mesurée côté navigateur.
  if (typeof body.website === "string" && body.website.trim() !== "") return json({ error: "invalid", message: "Requête invalide." }, 400);
  const elapsed = Number(body.elapsedMs);
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) {
    return json({ error: "too_fast", message: "Envoi trop rapide. Merci de réessayer dans un instant." }, 400);
  }

  const ip = clientIp(req);
  try {
    if (!(await allowRequest("rsvp-ip", ip, 15, 600))) {
      return json({ error: "rate_limited", message: "Trop de tentatives. Merci de patienter quelques minutes." }, 429);
    }
    if (!(await verifyTurnstile(body.turnstileToken, ip))) {
      return json({ error: "captcha", message: "La vérification anti-robot a échoué. Merci de réessayer." }, 400);
    }

    const parsed = rsvpSchema.safeParse(body);
    if (!parsed.success) return json({ error: "validation", fieldErrors: fieldErrors(parsed.error.issues) }, 400);
    const input = parsed.data;

    if (!(await allowRequest("rsvp-email", input.email ?? "", 6, 3600))) {
      return json({ error: "rate_limited", message: "Trop de tentatives pour cette adresse. Merci de réessayer plus tard." }, 429);
    }

    const result = await createRsvp(input);

    if (result.status === "exists") {
      // Le lien personnel n'est envoyé qu'à l'adresse e-mail concernée, jamais affiché à l'écran.
      return json({ status: "exists" });
    }

    return json({ status: "created", recap: buildRecap(input), editUrl: result.editUrl });
  } catch (e) {
    console.error("[rsvp] échec :", e instanceof Error ? e.message : e);
    return json({ error: "server", message: "Votre réponse n'a pas pu être enregistrée. Merci de réessayer dans un instant." }, 500);
  }
}
