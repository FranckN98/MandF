import { z } from "zod";

export const ACCOMMODATION_STATUS = ["in_progress", "confirmed"] as const;
export const DINNER_VENUE_STATUS = ["to_confirm", "confirmed"] as const;

export const settingsSchema = z.object({
  accommodationStatus: z.enum(ACCOMMODATION_STATUS),
  accommodationName: z.string().trim().max(200),
  accommodationDetails: z.string().trim().max(1000),
  dinnerStatus: z.enum(DINNER_VENUE_STATUS),
  dinnerDetails: z.string().trim().max(1000),
});

export type SiteSettings = z.infer<typeof settingsSchema>;

/** Valeurs affichées tant que rien n'est confirmé : aucun logement ni dîner ne doit apparaître comme réservé. */
export const DEFAULT_SETTINGS: SiteSettings = {
  accommodationStatus: "in_progress",
  accommodationName: "",
  accommodationDetails: "Coût et conditions à communiquer ultérieurement.",
  dinnerStatus: "to_confirm",
  dinnerDetails:
    "Les modalités définitives et l'éventuelle participation financière seront communiquées après confirmation du restaurant.",
};

export function mergeSettings(raw: unknown): SiteSettings {
  const parsed = settingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...(typeof raw === "object" && raw ? raw : {}) });
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}
