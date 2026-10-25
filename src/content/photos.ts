import data from "./photos.generated.json";

export interface PhotoCredit {
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  title: string;
}

export interface PhotoData {
  /** Chemin public sans suffixe : "/images/places/cityhall-facade" (variantes -480.webp, -960.webp, -1600.webp). */
  src: string;
  width: number;
  height: number;
  widths: number[];
  alt: string;
  caption?: string;
  lqip?: string;
  /** Point d'intérêt pour le recadrage (object-position CSS), ex. "50% 30%" pour garder les visages dans le cadre. */
  focus?: string;
  /** Empreinte du fichier source : change quand la photo est remplacée, ce qui contourne le cache navigateur ("immutable"). */
  version?: string;
  credit?: PhotoCredit;
}

export const photoUrl = (photo: Pick<PhotoData, "src" | "version">, width: number) =>
  `${photo.src}-${width}.webp${photo.version ? `?v=${photo.version}` : ""}`;

export type PlaceSlug = keyof typeof data;

type Generated = Record<
  string,
  { width: number; height: number; widths: number[]; alt: string; caption: string; lqip: string; version?: string; credit: PhotoCredit }
>;

export function getPlacePhoto(slug: PlaceSlug): PhotoData {
  const p = (data as Generated)[slug];
  return { src: `/images/places/${slug}`, ...p };
}

export function getAllPlaceCredits(): Array<{ slug: string; caption: string; credit: PhotoCredit }> {
  return Object.entries(data as Generated).map(([slug, p]) => ({ slug, caption: p.caption, credit: p.credit }));
}
