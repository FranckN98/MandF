import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserClient, isAuthConfigured } from "./supabase/server";

export interface AdminSession {
  client: SupabaseClient;
  email: string;
}

/**
 * Vérifie à chaque appel : session Supabase valide (jeton contrôlé auprès de Supabase Auth)
 * ET adresse présente dans admin_users (fonction SQL is_admin()). Renvoie null sinon.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  if (!isAuthConfigured()) return null;
  const client = await getUserClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.email) return null;
  const { data: isAdmin, error } = await client.rpc("is_admin");
  if (error || isAdmin !== true) return null;
  return { client, email: user.email };
}
