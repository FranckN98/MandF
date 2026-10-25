import "server-only";
import { getServiceClient, isServiceConfigured } from "./supabase/service";
import { DEFAULT_SETTINGS, mergeSettings, type SiteSettings } from "./settings-schema";

/** Lecture côté serveur (clé service) ; retombe sur les valeurs par défaut si la base est indisponible ou non configurée. */
export async function getSiteSettings(): Promise<SiteSettings> {
  if (!isServiceConfigured()) return DEFAULT_SETTINGS;
  try {
    const { data } = await getServiceClient().from("site_settings").select("value").eq("key", "content").maybeSingle();
    return mergeSettings(data?.value);
  } catch {
    return DEFAULT_SETTINGS;
  }
}
