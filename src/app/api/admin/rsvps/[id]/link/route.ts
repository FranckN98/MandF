import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { editUrlFor } from "@/lib/rsvp-service";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lien personnel de modification d'un invité, à lui transmettre (réservé aux administrateurs). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { data, error } = await admin.client.from("wedding_rsvps").select("id,edit_token_version").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: "server" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ url: editUrlFor(data.id, data.edit_token_version) });
}
