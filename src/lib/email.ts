import "server-only";
import { Resend } from "resend";
import { buildRecap } from "./recap";
import type { RsvpInput } from "./rsvp-schema";
import { SITE, VENUE } from "./site";

// Envoi via Resend (facultatif) : notifications aux organisateurs, confirmation et lien personnel à l'invité.
// Sans configuration, rien n'est envoyé et le site continue de fonctionner (le lien reste affiché à l'écran).
export type MailResult = { ok: true } | { ok: false; reason: "not_configured" | "failed" };

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function adminRecipients(): string[] {
  return (process.env.ADMIN_NOTIFICATION_EMAIL ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function send(to: string[], subject: string, html: string, text: string): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { ok: false, reason: "not_configured" };
  try {
    const { error } = await new Resend(apiKey).emails.send({ from, to, subject, html, text });
    if (error) {
      console.error("[email] Resend a refusé l'envoi :", error.message);
      return { ok: false, reason: "failed" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] Échec d'envoi :", e instanceof Error ? e.message : e);
    return { ok: false, reason: "failed" };
  }
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="fr"><body style="margin:0;padding:0;background:#FFF3F9;font-family:Helvetica,Arial,sans-serif;color:#30203F;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF3F9;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;">
<tr><td style="background:linear-gradient(135deg,#F7C8E0,#EDE4FF);padding:32px 28px;text-align:center;">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.1;color:#30203F;">${escapeHtml(SITE.name)}</div>
<div style="font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#5E3C9E;margin-top:8px;">${escapeHtml(SITE.tagline)}</div>
</td></tr>
<tr><td style="padding:28px;">
<h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:24px;margin:0 0 14px;">${escapeHtml(title)}</h1>
${bodyHtml}
</td></tr>
<tr><td style="padding:18px 28px;background:#EDE4FF;font-size:12px;color:#5A4A68;text-align:center;">
Mariage civil · ${escapeHtml(SITE.dateLong)} · 13h00 · ${escapeHtml(VENUE.name)}, ${escapeHtml(VENUE.street)}, Copenhague
</td></tr>
</table></td></tr></table></body></html>`;
}

function recapTable(input: RsvpInput): string {
  const rows = buildRecap(input)
    .map(
      (l) =>
        `<tr><td style="padding:6px 12px 6px 0;vertical-align:top;color:#5A4A68;font-size:13px;white-space:nowrap;">${escapeHtml(l.label)}</td><td style="padding:6px 0;font-size:14px;">${escapeHtml(l.value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #EDE4FF;margin:14px 0;">${rows}</table>`;
}

function recapText(input: RsvpInput): string {
  return buildRecap(input)
    .map((l) => `- ${l.label} : ${l.value}`)
    .join("\n");
}

function button(href: string, label: string): string {
  return `<p style="margin:22px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;background:#845EC2;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:999px;font-size:15px;">${escapeHtml(label)}</a></p>`;
}

export type AdminMailKind = "created" | "updated" | "deleted";

/** Confirmation envoyée à l'invité avec son lien personnel de modification. */
export async function sendGuestConfirmation(input: RsvpInput, editUrl: string, updated = false): Promise<MailResult> {
  if (!input.email) return { ok: false, reason: "not_configured" };
  const title = updated ? "Votre réponse a été mise à jour" : "Merci, votre réponse a bien été enregistrée";
  const html = layout(
    title,
    `<p style="margin:0 0 6px;font-size:15px;line-height:1.5;">Bonjour ${escapeHtml(input.firstName)}, voici ce que nous avons noté :</p>${recapTable(input)}<p style="font-size:14px;line-height:1.5;">Un changement ? Vous pouvez modifier ou supprimer votre réponse à tout moment.</p>${button(editUrl, "Modifier ma réponse")}`,
  );
  const text = `${title}\n\nBonjour ${input.firstName}, voici ce que nous avons noté :\n${recapText(input)}\n\nModifier ma réponse : ${editUrl}`;
  return send([input.email], `${SITE.name} — ${title}`, html, text);
}

/** Renvoie le lien personnel à l'adresse qui a déjà répondu (jamais affiché à l'écran). */
export async function sendGuestEditLink(email: string, editUrl: string): Promise<MailResult> {
  const html = layout("Votre lien pour modifier votre réponse", `<p style="margin:0;font-size:15px;line-height:1.5;">Une réponse existe déjà pour cette adresse. Utilisez ce lien pour la consulter, la modifier ou la supprimer.</p>${button(editUrl, "Modifier ma réponse")}<p style="font-size:12px;color:#5A4A68;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement ce message.</p>`);
  const text = `Une réponse existe déjà pour cette adresse. Pour la modifier ou la supprimer : ${editUrl}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.`;
  return send([email], `${SITE.name} — Votre lien personnel`, html, text);
}

/** Notification aux organisateurs (si ADMIN_NOTIFICATION_EMAIL et Resend sont configurés). */
export async function sendAdminNotification(input: RsvpInput, kind: AdminMailKind, adminUrl: string): Promise<MailResult> {
  const to = adminRecipients();
  if (to.length === 0) return { ok: false, reason: "not_configured" };
  const verb = { created: "Nouvelle réponse", updated: "Réponse modifiée", deleted: "Réponse supprimée par l'invité" }[kind];
  const name = `${input.firstName} ${input.lastName}`;
  const html = layout(`${verb} : ${name}`, `${kind === "deleted" ? "" : recapTable(input)}${button(adminUrl, "Ouvrir le tableau de bord")}`);
  const text = `${verb} : ${name}\n\n${kind === "deleted" ? "" : recapText(input) + "\n\n"}Tableau de bord : ${adminUrl}`;
  return send(to, `${verb} — ${name}`, html, text);
}
