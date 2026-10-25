import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { PhotoData } from "@/content/photos";

// Emplacements des photographies personnelles. Déposez les originaux dans public/images/couple/originals/<emplacement>.jpg
// puis lancez `npm run photos` : les variantes WebP et le manifeste sont générés, le site les affiche automatiquement.
export const COUPLE_SLOTS = [
  "hero-1",
  "hero-2",
  "hero-3",
  "hero-4",
  "hero-5",
  "hero-6",
  "story-2018",
  "story-2024-a",
  "story-2024-b",
  "story-2025",
  "story-2025-b",
] as const;

export type CoupleSlot = (typeof COUPLE_SLOTS)[number];

const DEFAULT_ALT: Record<CoupleSlot, string> = {
  "hero-1": "Marleine et Franck",
  "hero-2": "Marleine et Franck",
  "hero-3": "Marleine et Franck",
  "hero-4": "Marleine et Franck",
  "hero-5": "Marleine et Franck",
  "hero-6": "Marleine et Franck",
  "story-2018": "Marleine et Franck à leurs débuts, en 2018",
  "story-2024-a": "Marleine et Franck lors de leurs fiançailles, en 2024",
  "story-2024-b": "Marleine et Franck lors de leur mariage traditionnel au Cameroun, en 2024",
  "story-2025": "Marleine, Franck et leur petite fille Elikia, en 2025",
  "story-2025-b": "Marleine et Franck embrassent leur petite fille Elikia, en 2025",
};

interface ManifestEntry {
  width: number;
  height: number;
  widths: number[];
  lqip?: string;
  alt?: string;
  focus?: string;
  version?: string;
}

export type CouplePhotos = Partial<Record<CoupleSlot, PhotoData>>;

export function getCouplePhotos(): CouplePhotos {
  const file = path.join(process.cwd(), "public", "images", "couple", "manifest.json");
  let manifest: Record<string, ManifestEntry>;
  try {
    manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return {};
  }
  const out: CouplePhotos = {};
  for (const slot of COUPLE_SLOTS) {
    const m = manifest[slot];
    if (!m) continue;
    out[slot] = {
      src: `/images/couple/${slot}`,
      width: m.width,
      height: m.height,
      widths: m.widths,
      lqip: m.lqip,
      alt: m.alt || DEFAULT_ALT[slot],
      focus: m.focus,
      version: m.version,
    };
  }
  return out;
}
