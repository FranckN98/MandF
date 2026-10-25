// Télécharge les photographies listées dans photos.config.mjs depuis Wikimedia Commons, génère les variantes WebP
// (480 / 960 / 1600 px) dans public/images/places et écrit src/content/photos.generated.json (crédits + dimensions).
// Usage : npm run photos:fetch            (PHOTO_CACHE=<dossier> pour choisir où stocker les originaux)
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { PHOTOS } from "./photos.config.mjs";

const root = path.resolve(import.meta.dirname, "..");
const cacheDir = process.env.PHOTO_CACHE ?? path.join(root, ".cache", "originals");
const outDir = path.join(root, "public", "images", "places");
const manifestFile = path.join(root, "src", "content", "photos.generated.json");
const WIDTHS = [480, 960, 1600];
const UA = { "User-Agent": "MandF-wedding-site/1.0 (private wedding website; image attribution preserved)" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

sharp.cache(false);

async function api(title) {
  const qs = new URLSearchParams({
    action: "query",
    format: "json",
    redirects: "1",
    titles: `File:${title}`,
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
  });
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch(`https://commons.wikimedia.org/w/api.php?${qs}`, { headers: UA });
      const text = await res.text();
      const json = JSON.parse(text);
      const page = Object.values(json.query?.pages ?? {})[0];
      if (page?.imageinfo?.[0]) return page.imageinfo[0];
      throw new Error(`Fichier introuvable sur Commons : ${title}`);
    } catch (e) {
      if (e.message.startsWith("Fichier")) throw e;
      await sleep(4000 * (i + 1));
    }
  }
  throw new Error(`API Commons indisponible pour ${title}`);
}

async function download(url, file) {
  for (let i = 0; i < 6; i++) {
    try {
      const res = await fetch(url, { headers: UA });
      if (res.ok) {
        await fs.writeFile(file, Buffer.from(await res.arrayBuffer()));
        return;
      }
    } catch {
      // connexion coupée : nouvelle tentative
    }
    await sleep(4000 * (i + 1));
  }
  throw new Error(`Téléchargement impossible : ${url}`);
}

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
const plain = (html) => decode((html ?? "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

await fs.mkdir(cacheDir, { recursive: true });
await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(path.dirname(manifestFile), { recursive: true });

const manifest = {};
for (const photo of PHOTOS) {
  const info = await api(photo.title);
  const md = info.extmetadata ?? {};
  const license = md.LicenseShortName?.value ?? "";
  if (!/^(CC BY|CC0|Public domain)/i.test(license) || /-(NC|ND)\b/i.test(license)) {
    throw new Error(`Licence non autorisée pour ${photo.title} : "${license}"`);
  }
  const original = path.join(cacheDir, `${photo.slug}.jpg`);
  try {
    await fs.access(original);
  } catch {
    await download(info.url, original);
    await sleep(800);
  }

  const meta = await sharp(original).metadata();
  const swap = (meta.orientation ?? 1) >= 5;
  const width = swap ? meta.height : meta.width;
  const height = swap ? meta.width : meta.height;

  const widths = WIDTHS.filter((w) => w <= width);
  if (widths.length === 0) widths.push(width);
  for (const w of widths) {
    await sharp(original)
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 78, effort: 5 })
      .toFile(path.join(outDir, `${photo.slug}-${w}.webp`));
  }
  const lqip = await sharp(original).rotate().resize({ width: 24 }).blur(1).webp({ quality: 45 }).toBuffer();

  manifest[photo.slug] = {
    slug: photo.slug,
    width,
    height,
    widths,
    alt: photo.alt,
    caption: photo.caption,
    lqip: `data:image/webp;base64,${lqip.toString("base64")}`,
    credit: {
      author: plain(md.Artist?.value) || "Auteur non renseigné",
      license,
      licenseUrl: md.LicenseUrl?.value ?? "",
      sourceUrl: info.descriptionurl,
      title: photo.title,
    },
  };
  console.log(`ok  ${photo.slug}  ${width}x${height}  ${license}  (${manifest[photo.slug].credit.author})`);
}

await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(`\n${Object.keys(manifest).length} photos traitées -> ${path.relative(root, manifestFile)}`);
