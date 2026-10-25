"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FieldShell } from "@/components/rsvp/fields";
import { RsvpForm, type SubmitOutcome } from "@/components/rsvp/RsvpForm";
import { inputToValues } from "@/components/rsvp/form-values";
import { formatDateFr } from "@/lib/dates";
import { partyLabel, stayLabel } from "@/lib/recap";
import {
  ACCOMMODATION_LABELS,
  ACCOMMODATION_SHORT,
  ATTENDANCE_SHORT,
  DINNER_SHORT,
  rowToInput,
  type Attendance,
  type RsvpRow,
} from "@/lib/rsvp-schema";
import { ACCOMMODATION_STATUS, DINNER_VENUE_STATUS, type SiteSettings } from "@/lib/settings-schema";
import { computeNightlyNeeds, computeStats } from "@/lib/stats";
import { SignOutButton } from "./LoginForm";

type LodgingFilter = "all" | "interested" | "not_interested" | "undecided";
type SortKey = "created" | "name" | "arrival";

const selectClass =
  "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm text-ink focus:border-violet focus:outline-none focus:ring-4 focus:ring-violet/20";

function StatCard({ label, value, hint, tone = "plain" }: { label: string; value: string | number; hint?: string; tone?: "plain" | "accent" }) {
  return (
    <div className={`rounded-3xl p-5 shadow-card ${tone === "accent" ? "bg-gradient-to-br from-violet-deep to-violet text-white" : "bg-white"}`}>
      <p className={`text-xs font-medium uppercase tracking-[0.16em] ${tone === "accent" ? "text-rose" : "text-ink-soft"}`}>{label}</p>
      <p className={`mt-2 font-display text-5xl leading-none ${tone === "accent" ? "text-white" : "text-violet-deep"}`}>{value}</p>
      {hint ? <p className={`mt-2 text-xs ${tone === "accent" ? "text-white/85" : "text-ink-soft"}`}>{hint}</p> : null}
    </div>
  );
}

function AttendanceBadge({ status }: { status: Attendance }) {
  const style = status === "yes" ? "bg-emerald-100 text-emerald-900" : status === "no" ? "bg-rose/60 text-ink" : "bg-lavender text-violet-deep";
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>{ATTENDANCE_SHORT[status]}</span>;
}

const dateCell = (iso: string | null) => (iso ? formatDateFr(iso, { year: false }) : "—");

interface DashboardProps {
  adminEmail: string;
  initialRows: RsvpRow[];
  initialSettings: SiteSettings;
}

export function AdminDashboard({ adminEmail, initialRows, initialSettings }: DashboardProps) {
  const router = useRouter();
  const [rows, setRows] = useState<RsvpRow[]>(initialRows);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [attendance, setAttendance] = useState<Attendance | "all">("all");
  const [lodging, setLodging] = useState<LodgingFilter>("all");
  const [arrivalFrom, setArrivalFrom] = useState("");
  const [arrivalTo, setArrivalTo] = useState("");
  const [departureFrom, setDepartureFrom] = useState("");
  const [departureTo, setDepartureTo] = useState("");
  const [sort, setSort] = useState<SortKey>("created");

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/rsvps", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/admin/login");
        return;
      }
      if (!res.ok) throw new Error("refresh");
      const data = (await res.json()) as { rows: RsvpRow[] };
      setRows(data.rows);
      setRefreshError(false);
    } catch {
      setRefreshError(true);
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  // Actualisation automatique : au retour sur l'onglet et toutes les 60 secondes.
  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(onVisible, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const stats = useMemo(() => computeStats(rows), [rows]);
  const nightly = useMemo(() => computeNightlyNeeds(rows), [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (q && !`${r.first_name} ${r.last_name} ${r.last_name} ${r.first_name} ${r.email}`.toLowerCase().includes(q)) return false;
      if (attendance !== "all" && r.attendance_status !== attendance) return false;
      if (lodging === "interested" && r.accommodation_status !== "interested") return false;
      if (lodging === "not_interested" && !(r.accommodation_status === "own" || r.accommodation_status === "individual")) return false;
      if (lodging === "undecided" && r.accommodation_status !== "undecided") return false;
      if (arrivalFrom && (!r.arrival_date || r.arrival_date < arrivalFrom)) return false;
      if (arrivalTo && (!r.arrival_date || r.arrival_date > arrivalTo)) return false;
      if (departureFrom && (!r.departure_date || r.departure_date < departureFrom)) return false;
      if (departureTo && (!r.departure_date || r.departure_date > departureTo)) return false;
      return true;
    });
    const by: Record<SortKey, (a: RsvpRow, b: RsvpRow) => number> = {
      created: (a, b) => b.created_at.localeCompare(a.created_at),
      name: (a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, "fr"),
      arrival: (a, b) => (a.arrival_date ?? "9999").localeCompare(b.arrival_date ?? "9999"),
    };
    return [...list].sort(by[sort]);
  }, [rows, search, attendance, lodging, arrivalFrom, arrivalTo, departureFrom, departureTo, sort]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const filtersActive = search || attendance !== "all" || lodging !== "all" || arrivalFrom || arrivalTo || departureFrom || departureTo;

  const resetFilters = () => {
    setSearch("");
    setAttendance("all");
    setLodging("all");
    setArrivalFrom("");
    setArrivalTo("");
    setDepartureFrom("");
    setDepartureTo("");
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-blush via-white to-blush">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <h1 className="font-display text-2xl font-medium text-ink">Tableau de bord</h1>
            <p className="text-xs text-ink-soft">Connecté : {adminEmail}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="md" onClick={refresh} disabled={refreshing}>
              {refreshing ? "Actualisation…" : "Actualiser"}
            </Button>
            <ButtonLink href="/api/admin/export" variant="secondary" size="md" download>
              Exporter en CSV
            </ButtonLink>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6">
        {refreshError ? (
          <p role="alert" className="rounded-2xl bg-rose/40 px-4 py-3 text-sm text-ink">
            L&apos;actualisation a échoué : les chiffres affichés peuvent ne pas être à jour.
          </p>
        ) : null}

        <section aria-labelledby="stats-title">
          <h2 id="stats-title" className="sr-only">
            Statistiques
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Réponses reçues" value={stats.total} />
            <StatCard label="Participants confirmés" value={stats.confirmed} tone="accent" />
            <StatCard label="Absents" value={stats.absent} />
            <StatCard label="Indécis" value={stats.undecided} />
            <StatCard label="Intéressés par le logement commun" value={stats.sharedInterestedResponses} hint="réponses (présents et indécis)" />
            <StatCard
              label="Personnes à héberger"
              value={stats.sharedPeople}
              hint={`${stats.sharedAdults} adulte${stats.sharedAdults > 1 ? "s" : ""} · ${stats.sharedChildren} enfant${stats.sharedChildren > 1 ? "s" : ""}`}
            />
            <StatCard label="Intéressés par le dîner" value={stats.dinnerYes} hint={`${stats.dinnerToConfirm} à confirmer`} />
          </div>
        </section>

        <section aria-labelledby="nights-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
          <h2 id="nights-title" className="font-display text-2xl font-medium text-ink">
            Besoin de logement commun par nuit
          </h2>
          <p className="mt-1 text-sm text-ink-soft">Calculé selon les dates déclarées et le nombre de voyageurs (adultes + enfants) des personnes intéressées.</p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-ink-soft">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Nuit
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Personnes intéressées
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Adultes
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Enfants
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    dont indécis
                  </th>
                </tr>
              </thead>
              <tbody>
                {nightly.nights.map((n) => (
                  <tr key={n.night} className="border-b border-line/60">
                    <th scope="row" className="py-3 pr-4 font-medium text-ink">
                      {n.label}
                    </th>
                    <td className="py-3 pr-4 font-display text-2xl text-violet-deep">{n.people}</td>
                    <td className="py-3 pr-4 text-ink-soft">{n.adults}</td>
                    <td className="py-3 pr-4 text-ink-soft">{n.children}</td>
                    <td className="py-3 text-ink-soft">{n.tentativePeople}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {nightly.datesNotFixed > 0 || nightly.outsideWindow > 0 ? (
            <p className="mt-4 text-sm text-ink-soft">
              {nightly.datesNotFixed > 0 ? `${nightly.datesNotFixed} personne(s) intéressée(s) n'ont pas encore fixé leurs dates. ` : ""}
              {nightly.outsideWindow > 0 ? `${nightly.outsideWindow} personne(s) restent aussi des nuits hors de la période affichée.` : ""}
            </p>
          ) : null}
        </section>

        <section aria-labelledby="guests-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="guests-title" className="font-display text-2xl font-medium text-ink">
                Réponses des invités
              </h2>
              <p className="text-sm text-ink-soft" aria-live="polite">
                {filtered.length} réponse{filtered.length > 1 ? "s" : ""} affichée{filtered.length > 1 ? "s" : ""} sur {rows.length}
              </p>
            </div>
            {filtersActive ? (
              <Button variant="ghost" size="md" onClick={resetFilters}>
                Réinitialiser les filtres
              </Button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FieldShell id="f-search" label="Rechercher un nom">
              <input id="f-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, prénom ou e-mail" className={selectClass} />
            </FieldShell>
            <FieldShell id="f-attendance" label="Présence">
              <select id="f-attendance" value={attendance} onChange={(e) => setAttendance(e.target.value as Attendance | "all")} className={selectClass}>
                <option value="all">Toutes</option>
                <option value="yes">Présents</option>
                <option value="maybe">Indécis</option>
                <option value="no">Absents</option>
              </select>
            </FieldShell>
            <FieldShell id="f-lodging" label="Logement commun">
              <select id="f-lodging" value={lodging} onChange={(e) => setLodging(e.target.value as LodgingFilter)} className={selectClass}>
                <option value="all">Tous</option>
                <option value="interested">Intéressés</option>
                <option value="undecided">Ne sait pas encore</option>
                <option value="not_interested">Non intéressés</option>
              </select>
            </FieldShell>
            <FieldShell id="f-sort" label="Trier par">
              <select id="f-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectClass}>
                <option value="created">Date de réponse (récentes d&apos;abord)</option>
                <option value="name">Nom</option>
                <option value="arrival">Date d&apos;arrivée</option>
              </select>
            </FieldShell>
          </div>
          <details className="mt-4 rounded-2xl bg-blush/60 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-violet-deep">Filtrer par dates d&apos;arrivée et de départ</summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FieldShell id="f-arr-from" label="Arrivée à partir du">
                <input id="f-arr-from" type="date" value={arrivalFrom} onChange={(e) => setArrivalFrom(e.target.value)} className={selectClass} />
              </FieldShell>
              <FieldShell id="f-arr-to" label="Arrivée jusqu'au">
                <input id="f-arr-to" type="date" value={arrivalTo} onChange={(e) => setArrivalTo(e.target.value)} className={selectClass} />
              </FieldShell>
              <FieldShell id="f-dep-from" label="Départ à partir du">
                <input id="f-dep-from" type="date" value={departureFrom} onChange={(e) => setDepartureFrom(e.target.value)} className={selectClass} />
              </FieldShell>
              <FieldShell id="f-dep-to" label="Départ jusqu'au">
                <input id="f-dep-to" type="date" value={departureTo} onChange={(e) => setDepartureTo(e.target.value)} className={selectClass} />
              </FieldShell>
            </div>
          </details>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[60rem] text-left text-sm">
              <caption className="sr-only">Liste des réponses des invités</caption>
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-[0.12em] text-ink-soft">
                  {["Nom et prénom", "Présence", "Arrivée", "Départ", "Jours", "Nuits", "Logement commun", "Accompagnants", "Dîner", "Confirmé le", ""].map((h, i) => (
                    <th key={i} scope="col" className="whitespace-nowrap py-2 pr-4 font-medium">
                      {h || <span className="sr-only">Actions</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-line/60 align-middle hover:bg-blush/50">
                    <th scope="row" className="py-3 pr-4 font-medium text-ink">
                      {r.last_name.toUpperCase()} {r.first_name}
                    </th>
                    <td className="py-3 pr-4">
                      <AttendanceBadge status={r.attendance_status} />
                    </td>
                    <td className="whitespace-nowrap py-3 pr-4 text-ink-soft">{dateCell(r.arrival_date)}</td>
                    <td className="whitespace-nowrap py-3 pr-4 text-ink-soft">{dateCell(r.departure_date)}</td>
                    <td className="py-3 pr-4 text-ink-soft">{r.stay_days ?? "—"}</td>
                    <td className="py-3 pr-4 text-ink-soft">{r.stay_nights ?? "—"}</td>
                    <td className="py-3 pr-4 text-ink-soft">{r.accommodation_status ? ACCOMMODATION_SHORT[r.accommodation_status] : "—"}</td>
                    <td className="py-3 pr-4 text-ink-soft">
                      {r.accommodation_status === "interested" ? r.accompanying_adults - 1 + r.accompanying_children : "—"}
                    </td>
                    <td className="py-3 pr-4 text-ink-soft">{r.dinner_status ? DINNER_SHORT[r.dinner_status] : "—"}</td>
                    <td className="whitespace-nowrap py-3 pr-4 text-ink-soft">{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="py-3 text-right">
                      <Button variant="ghost" size="md" onClick={() => setSelectedId(r.id)}>
                        Détails<span className="sr-only"> de {r.first_name} {r.last_name}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-10 text-center text-ink-soft">
                      {rows.length === 0 ? "Aucune réponse pour le moment." : "Aucune réponse ne correspond à ces filtres."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <SettingsPanel initial={initialSettings} />
      </main>

      {selected ? (
        <DetailDrawer
          key={selected.id}
          row={selected}
          onClose={() => setSelectedId(null)}
          onUpdated={(row) => setRows((all) => all.map((r) => (r.id === row.id ? row : r)))}
          onDeleted={(id) => {
            setRows((all) => all.filter((r) => r.id !== id));
            setSelectedId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function DetailDrawer({
  row,
  onClose,
  onUpdated,
  onDeleted,
}: {
  row: RsvpRow;
  onClose: () => void;
  onUpdated: (row: RsvpRow) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const f = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])') ?? []).filter((el) => !el.hasAttribute("disabled"));
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const save = async (payload: Record<string, unknown>): Promise<SubmitOutcome> => {
    const res = await fetch(`/api/admin/rsvps/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = (await res.json().catch(() => ({}))) as { row?: RsvpRow; message?: string; fieldErrors?: Record<string, string> };
    if (!res.ok || !data.row) return { ok: false, message: data.message, fieldErrors: data.fieldErrors };
    onUpdated(data.row);
    setEditing(false);
    return { ok: true };
  };

  const remove = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rsvps/${row.id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted(row.id);
        return;
      }
      setError("La suppression a échoué.");
    } catch {
      setError("Connexion impossible.");
    } finally {
      setDeleting(false);
    }
  };

  const input = rowToInput(row);
  const details: Array<[string, string]> = [
    ["E-mail", row.email],
    ["WhatsApp", row.whatsapp ?? "—"],
    ["Voyage", row.attendance_status === "no" ? "—" : stayLabel(row.arrival_date, row.departure_date)],
    ["Logement commun", row.accommodation_status ? ACCOMMODATION_LABELS[row.accommodation_status] : "—"],
    ["Personnes à héberger", row.accommodation_status === "interested" ? partyLabel(row.accompanying_adults, row.accompanying_children, row.children_ages) : "—"],
    ["Remarques logement", row.accommodation_notes ?? "—"],
    ["Dîner", row.dinner_status ? DINNER_SHORT[row.dinner_status] : "—"],
    ["Précisions", row.comments ?? "—"],
    ["Consentement", new Date(row.privacy_consent_at).toLocaleString("fr-FR")],
    ["Réponse créée", new Date(row.created_at).toLocaleString("fr-FR")],
    ["Dernière modification", new Date(row.updated_at).toLocaleString("fr-FR")],
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-soft sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="drawer-title" className="font-display text-3xl font-medium text-ink">
              {row.first_name} {row.last_name}
            </h2>
            <div className="mt-2">
              <AttendanceBadge status={row.attendance_status} />
            </div>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} className="rounded-full border border-line px-4 py-2 text-sm font-medium text-violet-deep hover:bg-lavender">
            Fermer
          </button>
        </div>

        {editing ? (
          <div className="mt-8">
            <RsvpForm mode="admin" idPrefix="admin-edit" initialValues={inputToValues(input)} onSubmit={save} submitLabel="Enregistrer" onCancel={() => setEditing(false)} />
          </div>
        ) : (
          <>
            <dl className="mt-8 divide-y divide-line rounded-2xl border border-line">
              {details.map(([k, v]) => (
                <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
                  <dt className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">{k}</dt>
                  <dd className="break-words text-sm text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="primary" size="md" onClick={() => setEditing(true)}>
                Modifier
              </Button>
              {confirmDelete ? (
                <>
                  <Button size="md" onClick={remove} disabled={deleting} className="!bg-[#a6264f] hover:!bg-[#7d1d3d]">
                    {deleting ? "Suppression…" : "Confirmer la suppression"}
                  </Button>
                  <Button variant="ghost" size="md" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                    Annuler
                  </Button>
                </>
              ) : (
                <Button variant="secondary" size="md" onClick={() => setConfirmDelete(true)}>
                  Supprimer
                </Button>
              )}
            </div>
            {error ? (
              <p role="alert" className="mt-3 text-sm font-medium text-[#a6264f]">
                {error}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function SettingsPanel({ initial }: { initial: SiteSettings }) {
  const [s, setS] = useState<SiteSettings>(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setState("saving");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (res.ok) {
        setState("saved");
        return;
      }
      setMessage(data.message ?? "Enregistrement impossible.");
    } catch {
      setMessage("Connexion impossible.");
    }
    setState("error");
  };

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setS((v) => ({ ...v, [key]: value }));
    setState("idle");
  };

  return (
    <section aria-labelledby="settings-title" className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
      <h2 id="settings-title" className="font-display text-2xl font-medium text-ink">
        Informations du site
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Mettez à jour ici l&apos;état du logement et du dîner lorsque les réservations sont confirmées. Tant que rien n&apos;est confirmé, le site affiche « en cours d&apos;organisation » / « à confirmer ».
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="font-medium text-ink">Logement commun</h3>
          <FieldShell id="s-acc-status" label="Statut">
            <select id="s-acc-status" className={selectClass} value={s.accommodationStatus} onChange={(e) => set("accommodationStatus", e.target.value as SiteSettings["accommodationStatus"])}>
              {ACCOMMODATION_STATUS.map((v) => (
                <option key={v} value={v}>
                  {v === "in_progress" ? "En cours d'organisation" : "Hébergement confirmé"}
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell id="s-acc-name" label="Nom / adresse du logement confirmé" optional hint="Affiché uniquement si le statut est « confirmé ».">
            <input id="s-acc-name" className={selectClass} value={s.accommodationName} maxLength={200} onChange={(e) => set("accommodationName", e.target.value)} />
          </FieldShell>
          <FieldShell id="s-acc-details" label="Coût et conditions">
            <textarea id="s-acc-details" rows={3} className={selectClass} value={s.accommodationDetails} maxLength={1000} onChange={(e) => set("accommodationDetails", e.target.value)} />
          </FieldShell>
        </div>
        <div className="space-y-4">
          <h3 className="font-medium text-ink">Dîner de mariage</h3>
          <FieldShell id="s-dinner-status" label="Statut du restaurant">
            <select id="s-dinner-status" className={selectClass} value={s.dinnerStatus} onChange={(e) => set("dinnerStatus", e.target.value as SiteSettings["dinnerStatus"])}>
              {DINNER_VENUE_STATUS.map((v) => (
                <option key={v} value={v}>
                  {v === "to_confirm" ? "Réservation à confirmer" : "Réservation confirmée"}
                </option>
              ))}
            </select>
          </FieldShell>
          <FieldShell id="s-dinner-details" label="Modalités et participation financière">
            <textarea id="s-dinner-details" rows={5} className={selectClass} value={s.dinnerDetails} maxLength={1000} onChange={(e) => set("dinnerDetails", e.target.value)} />
          </FieldShell>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button size="md" onClick={save} disabled={state === "saving"}>
          {state === "saving" ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <p role="status" className="text-sm">
          {state === "saved" ? <span className="text-emerald-800">Enregistré. Le site se met à jour en moins d&apos;une minute.</span> : null}
          {state === "error" ? <span className="font-medium text-[#a6264f]">{message}</span> : null}
        </p>
      </div>
    </section>
  );
}
