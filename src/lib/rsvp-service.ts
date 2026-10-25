import "server-only";
import { createEditToken, parseEditToken, verifyEditSignature } from "./tokens";
import { getServiceClient } from "./supabase/service";
import { inputToRow, type RsvpInput, type RsvpRow } from "./rsvp-schema";
import { getSiteUrl } from "./site";

/** Colonnes renvoyées au client : edit_token_version n'en fait volontairement pas partie. */
export const RSVP_COLUMNS =
  "id,first_name,last_name,email,whatsapp,attendance_status,arrival_date,departure_date,stay_days,stay_nights,travel_dates_confirmed,accommodation_status,interested_in_shared_accommodation,accompanying_adults,accompanying_children,companion_names,accommodation_people,children_ages,accommodation_notes,dinner_status,comments,privacy_consent_at,created_at,updated_at";

export type CreateResult =
  | { status: "created"; row: RsvpRow; editUrl: string }
  | { status: "exists" };

export function editUrlFor(id: string, version: number): string {
  return `${getSiteUrl()}/reponse/${createEditToken(id, version)}`;
}

export async function createRsvp(input: RsvpInput): Promise<CreateResult> {
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("wedding_rsvps")
    .insert({ ...inputToRow(input), privacy_consent_at: new Date().toISOString() })
    .select(`${RSVP_COLUMNS},edit_token_version`)
    .single();

  if (!error && data) {
    const { edit_token_version, ...row } = data as unknown as RsvpRow & { edit_token_version: number };
    return { status: "created", row, editUrl: editUrlFor(row.id, edit_token_version) };
  }

  // Adresse e-mail déjà enregistrée : pas de doublon, et le lien personnel n'est jamais renvoyé à l'écran d'un inconnu.
  if (error?.code === "23505") return { status: "exists" };
  throw new Error(error?.message ?? "Insertion impossible.");
}

/** Lien personnel de la réponse associée à cette adresse (envoyé par e-mail uniquement) ; null si aucune réponse. */
export async function findEditUrlByEmail(email: string): Promise<string | null> {
  const { data, error } = await getServiceClient().from("wedding_rsvps").select("id,edit_token_version").eq("email", email).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return editUrlFor(data.id as string, data.edit_token_version as number);
}

/** Retrouve une réponse à partir de son lien personnel ; null si le jeton est invalide, falsifié ou périmé. */
export async function findRsvpByToken(token: string): Promise<{ row: RsvpRow; version: number } | null> {
  const parsed = parseEditToken(token);
  if (!parsed) return null;
  const { data, error } = await getServiceClient()
    .from("wedding_rsvps")
    .select(`${RSVP_COLUMNS},edit_token_version`)
    .eq("id", parsed.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { edit_token_version, ...row } = data as unknown as RsvpRow & { edit_token_version: number };
  if (!verifyEditSignature(row.id, edit_token_version, parsed.signature)) return null;
  return { row, version: edit_token_version };
}

export type UpdateResult = { status: "updated"; row: RsvpRow } | { status: "email_taken" };

export async function updateRsvpByInvitee(id: string, input: RsvpInput): Promise<UpdateResult> {
  const { data, error } = await getServiceClient()
    .from("wedding_rsvps")
    .update(inputToRow(input))
    .eq("id", id)
    .select(RSVP_COLUMNS)
    .single();
  if (error?.code === "23505") return { status: "email_taken" };
  if (error || !data) throw new Error(error?.message ?? "Mise à jour impossible.");
  return { status: "updated", row: data as unknown as RsvpRow };
}

export async function deleteRsvpById(id: string): Promise<void> {
  const { error } = await getServiceClient().from("wedding_rsvps").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
