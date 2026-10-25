import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { WEDDING_DATE, addDays, todayIso } from "@/lib/dates";
import { retentionDays } from "@/lib/site";
import { getServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Tâche quotidienne (Vercel Cron) : supprime toutes les réponses une fois la durée de conservation écoulée. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "cron_disabled" }, { status: 503 });
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const deadline = addDays(WEDDING_DATE, retentionDays());
  if (todayIso() <= deadline) return NextResponse.json({ purged: 0, deadline });

  const sb = getServiceClient();
  const { data, error } = await sb.from("wedding_rsvps").delete().not("id", "is", null).select("id");
  if (error) return NextResponse.json({ error: "server" }, { status: 500 });
  return NextResponse.json({ purged: data?.length ?? 0, deadline });
}
