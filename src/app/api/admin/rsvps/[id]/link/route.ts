import { NextResponse } from "next/server";
import { editUrlFor } from "@/lib/rsvp-service";
import { getServiceClient, isServiceConfigured } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lien personnel de modification d'un invité, à lui transmettre (réservé aux administrateurs). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isServiceConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { data, error } = await getServiceClient().from("wedding_rsvps").select("id,edit_token_version").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "server" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ url: editUrlFor(data.id, data.edit_token_version) });
}
