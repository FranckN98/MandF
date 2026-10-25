// Génère les variantes WebP (mobile / tablette / bureau) des photos personnelles du couple.
// 1) Déposez vos originaux dans public/images/couple/originals/ en les nommant d'après l'emplacement : hero-1.jpg, story-2018.jpg, story-2024-a.jpg…
// 2) (Optionnel) Réglez le texte alternatif et le point de cadrage dans public/images/couple/settings.json.
// 3) npm run photos. Les photos sont seulement redimensionnées : jamais retouchées, déformées ni générées.
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const dir = path.join(root, "public", "images", "couple");
const originals = path.join(dir, "originals");
const manifestFile = path.join(dir, "manifest.json");
const settingsFile = path.join(dir, "settings.json");
const WIDTHS = [480, 960, 1600];
// Doit rester identique à COUPLE_SLOTS dans src/lib/couple-photos.ts
const SLOTS = ["hero-1", "hero-2", "hero-3", "hero-4", "hero-5", "hero-6", "story-2018", "story-2024-a", "story-2024-b", "story-2025", "story-2025-b"];

const readJson = async (file, fallback) => {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
};

sharp.cache(false);
const settings = await readJson(settingsFile, {});
const manifest = await readJson(manifestFile, {});

let files = [];
try {
  files = await fs.readdir(originals);
} catch {
  console.log(`Dossier introuvable : ${path.relative(root, originals)} — rien à traiter.`);
}

for (const file of files.sort()) {
  const { name, ext } = path.parse(file);
  if (!/^\.(jpe?g|png|webp|tiff?)$/i.test(ext)) {
    if (!/^\.(md|txt|json)$/i.test(ext)) console.warn(`Ignoré (format non pris en charge, convertissez en JPG/PNG) : ${file}`);
    continue;
  }
  if (!SLOTS.includes(name)) {
    console.warn(`Ignoré (emplacement inconnu "${name}"). Emplacements valides : ${SLOTS.join(", ")}`);
    continue;
  }

  const source = path.join(originals, file);
  const meta = await sharp(source).metadata();
  const swap = (meta.orientation ?? 1) >= 5;
  const width = swap ? meta.height : meta.width;
  const height = swap ? meta.width : meta.height;

  // Variantes plus étroites que l'original + l'original lui-même (jusqu'à 1600 px) : aucun agrandissement artificiel.
  const widths = [...new Set([...WIDTHS.filter((w) => w < width), Math.min(width, 1600)])].sort((a, b) => a - b);

  for (const old of await fs.readdir(dir)) if (old.startsWith(`${name}-`) && old.endsWith(".webp")) await fs.rm(path.join(dir, old));
  for (const w of widths) {
    await sharp(source).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 84, effort: 5 }).toFile(path.join(dir, `${name}-${w}.webp`));
  }
  const lqip = await sharp(source).rotate().resize({ width: 24 }).blur(1).webp({ quality: 45 }).toBuffer();

  manifest[name] = {
    width,
    height,
    widths,
    lqip: `data:image/webp;base64,${lqip.toString("base64")}`,
    version: createHash("sha1").update(await fs.readFile(source)).digest("hex").slice(0, 8),
    ...(settings[name]?.alt ? { alt: settings[name].alt } : {}),
    ...(settings[name]?.focus ? { focus: settings[name].focus } : {}),
  };
  console.log(`ok  ${name}  ${width}x${height}  -> ${widths.join(", ")} px`);
}

// Les réglages (alt, focus) s'appliquent aussi aux emplacements déjà traités.
for (const slot of Object.keys(manifest)) {
  if (!SLOTS.includes(slot)) delete manifest[slot];
  else {
    const s = settings[slot] ?? {};
    if (s.alt) manifest[slot].alt = s.alt;
    if (s.focus) manifest[slot].focus = s.focus;
  }
}

await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`\n${Object.keys(manifest).length} photo(s) personnelle(s) dans ${path.relative(root, manifestFile)}`);
