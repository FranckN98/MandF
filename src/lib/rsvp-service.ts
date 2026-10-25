import "server-only";
import { createEditToken, parseEditToken, verifyEditSignature } from "./tokens";
import { getServiceClient } from "./supabase/service";
import { inputToRow, type RsvpInput, type RsvpRow } from "./rsvp-schema";
import { getSiteUrl } from "./site";

/** Colonnes renvoyées au client : edit_token_version n'en fait volontairement pas partie. */
export const RSVP_COLUMNS =
  "id,first_name,last_name,email,whatsapp,attendance_status,arrival_date,departure_date,stay_days,stay_nights,travel_dates_confirmed,accommodation_status,interested_in_shared_accommodation,accompanying_adults,accompanying_children,children_ages,accommodation_notes,dinner_status,comments,privacy_consent_at,created_at,updated_at";

export type CreateResult =
  | { status: "created"; row: RsvpRow; editUrl: string }
  | { status: "exists"; editUrl: string; firstName: string };

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

  if (error?.code === "23505") {
    const { data: existing, error: lookupError } = await sb
      .from("wedding_rsvps")
      .select("id,first_name,edit_token_version")
      .eq("email", input.email)
      .single();
    if (lookupError || !existing) throw new Error("Réponse existante introuvable après conflit.");
    return { status: "exists", editUrl: editUrlFor(existing.id, existing.edit_token_version), firstName: existing.first_name };
  }
  throw new Error(error?.message ?? "Insertion impossible.");
}

export async function findEditLinkByEmail(email: string): Promise<{ editUrl: string; firstName: string } | null> {
  const { data, error } = await getServiceClient()
    .from("wedding_rsvps")
    .select("id,first_name,edit_token_version")
    .eq("email", email)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { editUrl: editUrlFor(data.id, data.edit_token_version), firstName: data.first_name } : null;
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

/** L'adresse e-mail n'est pas modifiable par l'invité : elle identifie la réponse. */
export async function updateRsvpByInvitee(id: string, input: RsvpInput): Promise<RsvpRow> {
  const { email: _email, ...columns } = inputToRow(input);
  void _email;
  const { data, error } = await getServiceClient()
    .from("wedding_rsvps")
    .update(columns)
    .eq("id", id)
    .select(RSVP_COLUMNS)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Mise à jour impossible.");
  return data as unknown as RsvpRow;
}

export async function deleteRsvpById(id: string): Promise<void> {
  const { error } = await getServiceClient().from("wedding_rsvps").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
