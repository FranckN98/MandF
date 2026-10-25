import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { toCsv } from "@/lib/csv";
import { RSVP_COLUMNS } from "@/lib/rsvp-service";
import type { RsvpRow } from "@/lib/rsvp-schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await admin.client
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
