// Informations générales du site et constantes partagées.

export const SITE = {
  name: "Marleine & Franck",
  tagline: "Notre histoire continue…",
  title: "Marleine & Franck — Notre histoire continue",
  description:
    "Mariage civil de Marleine & Franck le 30 novembre 2026 à Copenhague. Notre histoire, le programme de la journée, le logement, le voyage et la confirmation de présence.",
  dateLabel: "30 novembre 2026",
  dateLong: "Lundi 30 novembre 2026",
  place: "Copenhagen, Denmark",
} as const;

export const VENUE = {
  name: "Copenhagen City Hall",
  localName: "Københavns Rådhus",
  street: "Rådhuspladsen 1",
  city: "1550 København, Danemark",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Copenhagen+City+Hall+R%C3%A5dhuspladsen+1+1550+K%C3%B8benhavn",
} as const;

export const DINNER_VENUE = {
  name: "Restaurant Donna",
  street: "Vester Voldgade 25",
  city: "1552 Copenhagen V",
  officialUrl: "https://cofoco.dk/en/restaurant/donna",
  galleryUrl: "https://cofoco.dk/en/restaurant/donna#gallery",
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Restaurant+Donna+Vester+Voldgade+25+1552+K%C3%B8benhavn",
} as const;

export const NAV_ITEMS = [
  { id: "histoire", label: "Notre histoire" },
  { id: "jour-j", label: "Le Jour J" },
  { id: "programme", label: "Programme" },
  { id: "logement", label: "Logement" },
  { id: "voyage", label: "Voyage" },
  { id: "confirmation", label: "Confirmation" },
] as const;

export type NavId = (typeof NAV_ITEMS)[number]["id"];

/** Durée de conservation des données après le mariage (jours), configurable via DATA_RETENTION_DAYS. */
export function retentionDays(): number {
  const n = Number.parseInt(process.env.DATA_RETENTION_DAYS ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : 90;
}

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}
