import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/lib/admin-auth";
import { settingsSchema } from "@/lib/settings-schema";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", message: "Valeurs invalides." }, { status: 400 });
  }

  const { error } = await admin.client
    .from("site_settings")
    .upsert({ key: "content", value: parsed.data }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: "server", message: "Enregistrement impossible." }, { status: 500 });

  revalidatePath("/");
  return NextResponse.json({ ok: true, settings: parsed.data });
}
