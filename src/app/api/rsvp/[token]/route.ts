import { NextResponse } from "next/server";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { buildRecap } from "@/lib/recap";
import { sendAdminNotification, sendGuestConfirmation } from "@/lib/email";
import { deleteRsvpById, editUrlFor, findRsvpByToken, updateRsvpByInvitee } from "@/lib/rsvp-service";
import { fieldErrors, guestEditSchema, rowToInput } from "@/lib/rsvp-schema";
import { getSiteUrl } from "@/lib/site";
import { isServiceConfigured } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };
const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status });
// L'invité a déjà donné son consentement à la création : il n'est pas redemandé à chaque modification.
const editSchema = guestEditSchema;

async function guard(req: Request, token: string) {
  if (!isServiceConfigured()) return { error: json({ error: "not_configured", message: "Service indisponible." }, 503) };
  if (!(await allowRequest("rsvp-edit", clientIp(req), 40, 600))) {
    return { error: json({ error: "rate_limited", message: "Trop de tentatives. Merci de patienter quelques minutes." }, 429) };
  }
  const found = await findRsvpByToken(token);
  if (!found) return { error: json({ error: "invalid_link", message: "Ce lien n'est plus valide." }, 404) };
  return { found };
}

export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { token } = await params;
    const g = await guard(req, token);
    if (g.error) return g.error;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid", message: "Requête invalide." }, 400);
    }
    const parsed = editSchema.safeParse(body);
    if (!parsed.success) return json({ error: "validation", fieldErrors: fieldErrors(parsed.error.issues) }, 400);

    const updated = await updateRsvpByInvitee(g.found.row.id, parsed.data);
    if (updated.status === "email_taken") {
      return json({ error: "validation", fieldErrors: { email: "Cette adresse e-mail est déjà utilisée par une autre réponse." } }, 409);
    }
    const input = rowToInput(updated.row);
    await sendAdminNotification(input, "updated", `${getSiteUrl()}/admin`);
    const mail = await sendGuestConfirmation(input, editUrlFor(updated.row.id, g.found.version), true);
    return json({ status: "updated", recap: buildRecap(input), emailSent: mail.ok });
  } catch (e) {
    console.error("[rsvp:update] échec :", e instanceof Error ? e.message : e);
    return json({ error: "server", message: "La modification n'a pas pu être enregistrée. Merci de réessayer." }, 500);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  try {
    const { token } = await params;
    const g = await guard(req, token);
    if (g.error) return g.error;

    const input = rowToInput(g.found.row);
    await deleteRsvpById(g.found.row.id);
    await sendAdminNotification(input, "deleted", `${getSiteUrl()}/admin`);
    return json({ status: "deleted" });
  } catch (e) {
    console.error("[rsvp:delete] échec :", e instanceof Error ? e.message : e);
    return json({ error: "server", message: "La suppression n'a pas pu être effectuée. Merci de réessayer." }, 500);
  }
}
