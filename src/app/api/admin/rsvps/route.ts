import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { RSVP_COLUMNS } from "@/lib/rsvp-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await admin.client.from("wedding_rsvps").select(RSVP_COLUMNS).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "server" }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}
