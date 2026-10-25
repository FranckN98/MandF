import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { RSVP_COLUMNS } from "@/lib/rsvp-service";
import { adminRsvpSchema, fieldErrors, inputToRow } from "@/lib/rsvp-schema";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const parsed = adminRsvpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", fieldErrors: fieldErrors(parsed.error.issues) }, { status: 400 });
  }

  // Passe par la session de l'administrateur : les politiques RLS décident, pas seulement ce code.
  const { data, error } = await admin.client
    .from("wedding_rsvps")
    .update(inputToRow(parsed.data))
    .eq("id", id)
    .select(RSVP_COLUMNS)
    .maybeSingle();

  if (error?.code === "23505") {
    return NextResponse.json({ error: "validation", fieldErrors: { email: "Cette adresse e-mail est déjà utilisée." } }, { status: 409 });
  }
  if (error) return NextResponse.json({ error: "server", message: "Modification impossible." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, row: data });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { data, error } = await admin.client.from("wedding_rsvps").delete().eq("id", id).select("id");
  if (error) return NextResponse.json({ error: "server", message: "Suppression impossible." }, { status: 500 });
  if (!data || data.length === 0) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
