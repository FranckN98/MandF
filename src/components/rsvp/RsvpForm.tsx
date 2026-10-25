"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { RECOMMENDED_STAY, TRAVEL_WINDOW, computeStay } from "@/lib/dates";
import { RSVP_PREFILL_EVENT, type RsvpPrefill } from "@/lib/rsvp-bus";
import {
  ACCOMMODATION,
  ACCOMMODATION_LABELS,
  ATTENDANCE,
  ATTENDANCE_LABELS,
  DINNER,
  DINNER_LABELS,
  adminRsvpSchema,
  fieldErrors,
  rsvpSchema,
} from "@/lib/rsvp-schema";
import { Checkbox, RadioCards, Stepper, TextAreaField, TextField } from "./fields";
import { FIELD_LABELS, emptyValues, toPayload, type FormValues } from "./form-values";
import { TURNSTILE_SITE_KEY, TurnstileWidget } from "./TurnstileWidget";

export type SubmitOutcome = { ok: true } | { ok: false; message?: string; fieldErrors?: Record<string, string> };

export interface RsvpFormProps {
  /** create : invité (consentement + anti-robots) ; edit : invité via lien personnel ; admin : organisateur. */
  mode: "create" | "edit" | "admin";
  initialValues?: FormValues;
  onSubmit: (payload: Record<string, unknown>) => Promise<SubmitOutcome>;
  submitLabel?: string;
  /** Texte d'information sur le dîner (modifiable depuis l'administration). */
  dinnerNote?: string;
  /** Désactive l'édition de l'e-mail (il identifie la réponse). */
  emailReadOnly?: boolean;
  onCancel?: () => void;
  idPrefix?: string;
}

const ATTENDANCE_OPTIONS = ATTENDANCE.map((value) => ({ value, label: ATTENDANCE_LABELS[value] }));
const ACCOMMODATION_OPTIONS = ACCOMMODATION.map((value) => ({ value, label: ACCOMMODATION_LABELS[value] }));
const DINNER_OPTIONS = DINNER.map((value) => ({ value, label: DINNER_LABELS[value] }));

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className="border-t border-line pb-2 pt-8">
        <h3 className="mb-6 flex items-center gap-3 font-display text-2xl font-medium text-ink">
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-lavender font-sans text-sm font-semibold text-violet-deep">
            {n}
          </span>
          {title}
        </h3>
        <div className="space-y-6 px-1 pb-2">{children}</div>
      </div>
    </motion.section>
  );
}

export function RsvpForm({ mode, initialValues, onSubmit, submitLabel, dinnerNote, emailReadOnly, onCancel, idPrefix = "rsvp" }: RsvpFormProps) {
  const schema = mode === "create" ? rsvpSchema : adminRsvpSchema;
  const [values, setValues] = useState<FormValues>(initialValues ?? emptyValues());
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [honeypot, setHoneypot] = useState("");
  const [prefillNote, setPrefillNote] = useState<string | null>(null);
  const startedAt = useRef(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const id = (key: string) => `${idPrefix}-${key}`;

  useEffect(() => {
    startedAt.current = performance.now();
  }, []);

  // Présélection demandée depuis la section Logement (« Je suis intéressé(e) »).
  useEffect(() => {
    if (mode !== "create") return;
    const onPrefill = (e: Event) => {
      const p = (e as CustomEvent<RsvpPrefill>).detail;
      setValues((v) => ({
        ...v,
        attendance: v.attendance === "" ? (p.attendance ?? v.attendance) : v.attendance,
        accommodation: p.accommodation ?? v.accommodation,
      }));
      setPrefillNote(
        "Nous avons présélectionné « Oui, je serai présent(e) » et « Oui, je suis intéressé(e) » par le logement commun. Modifiez vos réponses si besoin.",
      );
      window.setTimeout(() => document.getElementById(`${idPrefix}-firstName`)?.focus({ preventScroll: true }), 700);
    };
    window.addEventListener(RSVP_PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(RSVP_PREFILL_EVENT, onPrefill);
  }, [mode, idPrefix]);

  const parsed = useMemo(() => schema.safeParse(toPayload(values)), [schema, values]);
  const clientErrors = useMemo(() => (parsed.success ? {} : fieldErrors(parsed.error.issues)), [parsed]);

  const set = useCallback(<K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setServerErrors((e) => {
      if (!(key in e)) return e;
      const { [key as string]: _removed, ...rest } = e;
      void _removed;
      return rest;
    });
  }, []);

  const touch = (key: string) => setTouched((t) => (t.has(key) ? t : new Set(t).add(key)));
  const errorFor = (key: string): string | undefined => serverErrors[key] ?? ((attempted || touched.has(key)) && clientErrors[key] ? clientErrors[key] : undefined);

  const coming = values.attendance === "yes" || values.attendance === "maybe";
  const shared = coming && values.accommodation === "interested";
  const stay = !values.datesUndecided && values.arrivalDate && values.departureDate ? computeStay(values.arrivalDate, values.departureDate) : null;
  const needsToken = mode === "create" && Boolean(TURNSTILE_SITE_KEY);

  // Indicateur de progression : uniquement les étapes réellement demandées pour cette réponse.
  const progressSteps = [
    Boolean(values.firstName.trim() && values.lastName.trim() && !clientErrors.firstName && !clientErrors.lastName && !clientErrors.email && values.email),
    values.attendance !== "",
    ...(coming
      ? [
          values.datesUndecided || Boolean(values.arrivalDate && values.departureDate && !clientErrors.arrivalDate && !clientErrors.departureDate),
          values.accommodation !== "",
        ]
      : []),
    ...(mode === "create" ? [values.consent] : []),
  ];
  const progress = Math.round((progressSteps.filter(Boolean).length / progressSteps.length) * 100);

  const visibleErrors = Object.keys({ ...serverErrors, ...(attempted ? clientErrors : {}) }).filter((k) => errorFor(k));

  const focusField = (key: string) => {
    const el = document.getElementById(id(key));
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    el?.focus({ preventScroll: true });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAttempted(true);
    setFormError(null);
    if (!parsed.success) {
      window.setTimeout(() => summaryRef.current?.focus(), 50);
      return;
    }
    if (needsToken && !token) {
      setFormError("Veuillez terminer la vérification anti-robot avant d'envoyer votre réponse.");
      window.setTimeout(() => summaryRef.current?.focus(), 50);
      return;
    }
    setSubmitting(true);
    let outcome: SubmitOutcome;
    try {
      outcome = await onSubmit({
        ...toPayload(values),
        website: honeypot,
        elapsedMs: Math.round(performance.now() - startedAt.current),
        turnstileToken: token,
      });
    } catch {
      outcome = { ok: false, message: "Connexion impossible. Vérifiez votre réseau puis réessayez." };
    }
    setSubmitting(false);
    if (!outcome.ok) {
      setServerErrors(outcome.fieldErrors ?? {});
      setFormError(outcome.message ?? (outcome.fieldErrors ? null : "Une erreur est survenue. Merci de réessayer."));
      setResetKey((k) => k + 1);
      window.setTimeout(() => summaryRef.current?.focus(), 50);
    }
  };

  const useRecommendedDates = () => {
    setValues((v) => ({ ...v, datesUndecided: false, arrivalDate: RECOMMENDED_STAY.arrival, departureDate: RECOMMENDED_STAY.departure }));
  };

  let n = 0;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate aria-label="Confirmation de présence" className="relative">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.2em] text-ink-soft">
          <span>Progression</span>
          <span className="tabular-nums" aria-live="polite">
            {progress}&nbsp;%
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Progression du formulaire"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-1.5 overflow-hidden rounded-full bg-lavender"
        >
          <motion.div className="h-full rounded-full bg-gradient-to-r from-rose-deep to-violet" initial={false} animate={{ width: `${progress}%` }} transition={{ type: "spring", stiffness: 100, damping: 20 }} />
        </div>
      </div>

      {prefillNote ? (
        <p role="status" className="mb-6 rounded-2xl bg-lavender px-4 py-3 text-sm leading-relaxed text-violet-deep">
          {prefillNote}
        </p>
      ) : null}

      <div ref={summaryRef} tabIndex={-1} role="alert" aria-live="assertive" className="focus:outline-none">
        {(attempted && visibleErrors.length > 0) || formError ? (
          <div className="mb-8 rounded-2xl border border-[#a6264f]/40 bg-[#fff0f4] p-5 text-sm text-[#7d1d3d]">
            <p className="font-semibold">{formError ?? "Quelques informations restent à corriger :"}</p>
            {visibleErrors.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {visibleErrors.map((k) => (
                  <li key={k}>
                    <a
                      href={`#${id(k)}`}
                      className="underline underline-offset-2"
                      onClick={(ev) => {
                        ev.preventDefault();
                        focusField(k);
                      }}
                    >
                      {FIELD_LABELS[k] ?? k}
                    </a>{" "}
                    : {errorFor(k)}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* A. Informations personnelles */}
      <section className="space-y-6">
        <h3 className="mb-6 flex items-center gap-3 font-display text-2xl font-medium text-ink">
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-lavender font-sans text-sm font-semibold text-violet-deep">
            {++n}
          </span>
          Vos informations
        </h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            id={id("firstName")}
            label="Prénom"
            autoComplete="given-name"
            required
            aria-required
            value={values.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            onBlur={() => touch("firstName")}
            error={errorFor("firstName")}
            maxLength={80}
          />
          <TextField
            id={id("lastName")}
            label="Nom de famille"
            autoComplete="family-name"
            required
            aria-required
            value={values.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            onBlur={() => touch("lastName")}
            error={errorFor("lastName")}
            maxLength={80}
          />
        </div>
        <TextField
          id={id("email")}
          label="Adresse e-mail"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          aria-required
          readOnly={emailReadOnly}
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          onBlur={() => touch("email")}
          error={errorFor("email")}
          hint={
            emailReadOnly
              ? "L'adresse e-mail identifie votre réponse : elle ne peut pas être modifiée ici."
              : "Pour vous envoyer une confirmation et vous permettre de modifier votre réponse."
          }
          maxLength={254}
        />
        <TextField
          id={id("whatsapp")}
          label="Numéro WhatsApp"
          optional
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+45 12 34 56 78"
          value={values.whatsapp}
          onChange={(e) => set("whatsapp", e.target.value)}
          onBlur={() => touch("whatsapp")}
          error={errorFor("whatsapp")}
          hint="Utile pour coordonner le voyage et le logement."
          maxLength={30}
        />
      </section>

      {/* B. Présence */}
      <div className="mt-10 border-t border-line pt-8">
        <h3 className="mb-6 flex items-center gap-3 font-display text-2xl font-medium text-ink">
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-lavender font-sans text-sm font-semibold text-violet-deep">
            {++n}
          </span>
          Votre présence
        </h3>
        <RadioCards
          id={id("attendance")}
          legend="Serez-vous présent(e) à notre mariage civil le 30 novembre 2026 ?"
          required
          value={values.attendance}
          options={ATTENDANCE_OPTIONS}
          onChange={(v) => {
            set("attendance", v);
            touch("attendance");
          }}
          error={errorFor("attendance")}
        />
        <AnimatePresence initial={false}>
          {values.attendance === "no" ? (
            <motion.p
              key="no-note"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-5 overflow-hidden rounded-2xl bg-blush px-4 py-3 text-sm leading-relaxed text-ink-soft"
            >
              Merci de nous le faire savoir : vous nous manquerez. Il n&apos;y a rien d&apos;autre à renseigner, si ce n&apos;est, si vous le souhaitez, un petit mot ci-dessous.
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {coming ? (
          <Section key="voyage" n={++n} title="Votre voyage">
            <div className="grid gap-6 sm:grid-cols-2">
              <TextField
                id={id("arrivalDate")}
                label="Date d'arrivée à Copenhague"
                type="date"
                min={TRAVEL_WINDOW.min}
                max={TRAVEL_WINDOW.max}
                disabled={values.datesUndecided}
                value={values.arrivalDate}
                onChange={(e) => set("arrivalDate", e.target.value)}
                onBlur={() => touch("arrivalDate")}
                error={errorFor("arrivalDate")}
              />
              <TextField
                id={id("departureDate")}
                label="Date de départ de Copenhague"
                type="date"
                min={values.arrivalDate || TRAVEL_WINDOW.min}
                max={TRAVEL_WINDOW.max}
                disabled={values.datesUndecided}
                value={values.departureDate}
                onChange={(e) => set("departureDate", e.target.value)}
                onBlur={() => touch("departureDate")}
                error={errorFor("departureDate")}
              />
            </div>

            <div aria-live="polite" className="rounded-2xl bg-lavender/60 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink-soft">Durée du séjour</p>
              {stay ? (
                <p className="mt-1 font-display text-3xl text-violet-deep">
                  <strong className="font-medium">
                    {stay.days} jour{stay.days > 1 ? "s" : ""} calendaire{stay.days > 1 ? "s" : ""}
                  </strong>{" "}
                  <span className="text-ink-soft">/</span>{" "}
                  <strong className="font-medium">
                    {stay.nights} nuit{stay.nights > 1 ? "s" : ""}
                  </strong>
                </p>
              ) : (
                <p className="mt-1 text-sm text-ink-soft">
                  {values.datesUndecided ? "Dates non encore fixées." : "Calculée automatiquement dès que vous aurez choisi vos deux dates."}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Checkbox
                id={id("datesUndecided")}
                checked={values.datesUndecided}
                onChange={(e) => {
                  setValues((v) => ({ ...v, datesUndecided: e.target.checked, arrivalDate: e.target.checked ? "" : v.arrivalDate, departureDate: e.target.checked ? "" : v.departureDate }));
                }}
              >
                Mes dates ne sont pas encore fixées
              </Checkbox>
              <button type="button" onClick={useRecommendedDates} className="self-start text-sm font-medium text-violet-deep underline decoration-violet/40 underline-offset-4 hover:decoration-violet">
                Utiliser les dates recommandées (29 nov. → 1er déc.)
              </button>
            </div>
          </Section>
        ) : null}

        {coming ? (
          <Section key="logement" n={++n} title="Votre logement">
            <RadioCards
              id={id("accommodation")}
              legend="Êtes-vous intéressé(e) par un logement commun organisé pour les invités ?"
              required
              value={values.accommodation}
              options={ACCOMMODATION_OPTIONS}
              onChange={(v) => {
                set("accommodation", v);
                touch("accommodation");
              }}
              error={errorFor("accommodation")}
              hint="Cette réponse permet uniquement d'évaluer les besoins. Elle ne constitue pas une réservation de logement."
            />
            <AnimatePresence initial={false}>
              {shared ? (
                <motion.div
                  key="party"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-6 rounded-3xl bg-blush/80 p-5 sm:p-6">
                    <p className="text-base font-medium text-ink">Combien de personnes souhaitez-vous héberger avec vous ?</p>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Stepper
                        id={id("adults")}
                        label="Adultes"
                        hint="En vous comptant."
                        value={values.adults}
                        min={1}
                        max={20}
                        onChange={(x) => set("adults", x)}
                        error={errorFor("adults")}
                      />
                      <Stepper id={id("children")} label="Enfants" value={values.children} min={0} max={20} onChange={(x) => set("children", x)} error={errorFor("children")} />
                    </div>
                    {values.children > 0 ? (
                      <TextField
                        id={id("childrenAges")}
                        label="Âge des enfants"
                        optional
                        placeholder="ex. : 3 ans, 8 ans"
                        value={values.childrenAges}
                        onChange={(e) => set("childrenAges", e.target.value)}
                        error={errorFor("childrenAges")}
                        maxLength={200}
                      />
                    ) : null}
                    <TextAreaField
                      id={id("accommodationNotes")}
                      label="Remarques particulières concernant votre logement"
                      optional
                      value={values.accommodationNotes}
                      onChange={(e) => set("accommodationNotes", e.target.value)}
                      error={errorFor("accommodationNotes")}
                      maxLength={1000}
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </Section>
        ) : null}

        {coming ? (
          <Section key="diner" n={++n} title="Le dîner">
            <RadioCards
              id={id("dinner")}
              legend="Souhaitez-vous également participer au dîner prévu à partir de 17h ?"
              value={values.dinner}
              options={DINNER_OPTIONS}
              onChange={(v) => set("dinner", v)}
              error={errorFor("dinner")}
              hint={dinnerNote ?? "Les modalités définitives et l'éventuelle participation financière seront communiquées après confirmation du restaurant."}
            />
          </Section>
        ) : null}
      </AnimatePresence>

      {/* F. Commentaires */}
      <div className="mt-10 border-t border-line pt-8">
        <h3 className="mb-6 flex items-center gap-3 font-display text-2xl font-medium text-ink">
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-lavender font-sans text-sm font-semibold text-violet-deep">
            {++n}
          </span>
          Un mot pour nous
        </h3>
        <TextAreaField
          id={id("comments")}
          label="Avez-vous une précision à nous communiquer ?"
          optional
          value={values.comments}
          onChange={(e) => set("comments", e.target.value)}
          error={errorFor("comments")}
          maxLength={2000}
        />
      </div>

      {/* G. Consentement (création uniquement : déjà donné lors d'une modification) */}
      {mode === "create" ? (
        <div className="mt-10 border-t border-line pt-8">
          <Checkbox
            id={id("consent")}
            checked={values.consent}
            onChange={(e) => set("consent", e.target.checked)}
            onBlur={() => touch("consent")}
            error={errorFor("consent")}
            aria-required
          >
            J&apos;accepte que mes informations soient utilisées uniquement pour l&apos;organisation du mariage et la coordination du voyage et du logement.
          </Checkbox>
          <p className="mt-3 pl-8 text-sm text-ink-soft">
            <Link href="/confidentialite" target="_blank" className="font-medium text-violet-deep underline decoration-violet/40 underline-offset-4 hover:decoration-violet">
              Lire la politique de confidentialité
            </Link>
            . Aucune inscription à une newsletter ni communication commerciale.
          </p>
        </div>
      ) : null}

      {/* Piège à robots : champ invisible pour les humains */}
      <div aria-hidden className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
        <label>
          Ne pas remplir ce champ
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
        </label>
      </div>

      {needsToken ? (
        <div className="mt-8">
          <TurnstileWidget onToken={setToken} resetKey={resetKey} />
        </div>
      ) : null}

      <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Annuler
          </Button>
        ) : null}
        <Button type="submit" variant="primary" disabled={submitting} className="sm:min-w-[16rem]">
          {submitting ? (
            <>
              <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Envoi en cours…
            </>
          ) : (
            (submitLabel ?? "Confirmer ma réponse")
          )}
        </Button>
      </div>
    </form>
  );
}
