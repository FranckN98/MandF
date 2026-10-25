// Dates du site manipulées en ISO (AAAA-MM-JJ) et calculées en UTC pour éviter tout décalage de fuseau horaire.

export const WEDDING_DATE = "2026-11-30";

/** Fenêtre de voyage acceptée par le formulaire (les dates restent libres, mais cohérentes). */
export const TRAVEL_WINDOW = { min: "2026-11-01", max: "2027-01-31" } as const;
export const MAX_STAY_DAYS = 60;

/** Période recommandée et nuits suivies dans le tableau de bord. */
export const RECOMMENDED_STAY = { arrival: "2026-11-29", departure: "2026-12-01" } as const;
export const TRACKED_NIGHTS = ["2026-11-28", "2026-11-29", "2026-11-30", "2026-12-01"] as const;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export function toUtcMs(iso: string): number | null {
  const m = ISO_RE.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) return null;
  return ms;
}

export function isValidIsoDate(iso: string): boolean {
  return toUtcMs(iso) !== null;
}

export function addDays(iso: string, days: number): string {
  const ms = toUtcMs(iso);
  if (ms === null) throw new Error(`Date invalide : ${iso}`);
  return new Date(ms + days * DAY_MS).toISOString().slice(0, 10);
}

export function diffDays(fromIso: string, toIso: string): number | null {
  const a = toUtcMs(fromIso);
  const b = toUtcMs(toIso);
  if (a === null || b === null) return null;
  return Math.round((b - a) / DAY_MS);
}

export interface Stay {
  days: number;
  nights: number;
}

/** Durée du séjour : jours calendaires (arrivée et départ inclus) et nuits. 29/11 -> 01/12 = 3 jours / 2 nuits. */
export function computeStay(arrival?: string | null, departure?: string | null): Stay | null {
  if (!arrival || !departure) return null;
  const nights = diffDays(arrival, departure);
  if (nights === null || nights < 0) return null;
  return { days: nights + 1, nights };
}

/** Dates de début de chaque nuit passée sur place (de l'arrivée à la veille du départ). */
export function nightStarts(arrival: string, departure: string): string[] {
  const nights = diffDays(arrival, departure);
  if (nights === null || nights <= 0) return [];
  return Array.from({ length: nights }, (_, i) => addDays(arrival, i));
}

const fmtLong = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const fmtShort = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" });
const fmtWeekday = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" });

function withOrdinal(text: string): string {
  return text.replace(/^1 /, "1er ");
}

export function formatDateFr(iso: string | null | undefined, opts: { year?: boolean } = {}): string {
  if (!iso) return "";
  const ms = toUtcMs(iso);
  if (ms === null) return iso;
  return withOrdinal((opts.year === false ? fmtShort : fmtLong).format(ms));
}

export function weekdayFr(iso: string): string {
  const ms = toUtcMs(iso);
  return ms === null ? "" : fmtWeekday.format(ms);
}

/** Libellé d'une nuit : « 29 → 30 novembre » ou « 30 novembre → 1er décembre ». */
export function nightLabel(startIso: string): string {
  const startMs = toUtcMs(startIso);
  if (startMs === null) return startIso;
  const endIso = addDays(startIso, 1);
  const start = new Date(startMs);
  const end = new Date(startMs + DAY_MS);
  if (start.getUTCMonth() === end.getUTCMonth()) {
    const startDay = start.getUTCDate() === 1 ? "1er" : String(start.getUTCDate());
    return `${startDay} → ${formatDateFr(endIso, { year: false })}`;
  }
  return `${formatDateFr(startIso, { year: false })} → ${formatDateFr(endIso, { year: false })}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
