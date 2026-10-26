import { NextResponse } from "next/server";
import { RSVP_COLUMNS } from "@/lib/rsvp-service";
import { getServiceClient, isDatabaseConfigured } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { data, error } = await getServiceClient().from("wedding_rsvps").select(RSVP_COLUMNS).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "server" }, { status: 500 });
  return NextResponse.json({ rows: data ?? [] });
}
