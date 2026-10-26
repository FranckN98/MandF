import { NextResponse } from "next/server";
import { toCsv } from "@/lib/csv";
import { RSVP_COLUMNS } from "@/lib/rsvp-service";
import type { RsvpRow } from "@/lib/rsvp-schema";
import { getServiceClient, isDatabaseConfigured } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { data, error } = await getServiceClient()
    .from("wedding_rsvps")
    .select(RSVP_COLUMNS)
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });
  if (error) return NextResponse.json({ error: "server" }, { status: 500 });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv((data ?? []) as unknown as RsvpRow[]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reponses-mariage-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
