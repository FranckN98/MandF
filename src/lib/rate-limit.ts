import "server-only";
import { createHmac } from "node:crypto";
import { getServiceClient } from "./supabase/service";

export function clientIp(req: Request): string {
  const h = req.headers;
  const forwarded = h.get("x-vercel-forwarded-for") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function anonymize(value: string): string {
  const salt = process.env.RATE_LIMIT_SALT || process.env.RSVP_TOKEN_SECRET || "";
  return createHmac("sha256", salt).update(value).digest("hex").slice(0, 32);
}

/** Retourne true si l'appel est autorisé. Les identifiants (IP, e-mail) sont hachés avant d'être stockés. */
export async function allowRequest(scope: string, identifier: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await getServiceClient().rpc("check_rate_limit", {
    p_key: `${scope}:${anonymize(identifier)}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error(`Limitation de débit indisponible : ${error.message}`);
  return data === true;
}
