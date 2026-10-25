"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { RECOMMENDED_STAY, TRAVEL_WINDOW, computeStay } from "@/lib/dates";
import {
  ACCOMMODATION_CHOICES,
  ACCOMMODATION_LABELS,
  ATTENDANCE,
  ATTENDANCE_LABELS,
  adminRsvpSchema,
  fieldErrors,
  participantCount,
  rsvpSchema,
  guestEditSchema,
} from "@/lib/rsvp-schema";
import { Checkbox, RadioCards, Stepper, TextField } from "./fields";
import { FIELD_LABELS, emptyValues, toPayload, type FormValues } from "./form-values";
import { TURNSTILE_SITE_KEY, TurnstileWidget } from "./TurnstileWidget";

export type SubmitOutcome = { ok: true } | { ok: false; message?: string; fieldErrors?: Record<string, string> };

export interface RsvpFormProps {
  /** create : invité (consentement + anti-robots) ; edit : invité via lien personnel ; admin : organisateur. */
  mode: "create" | "edit" | "admin";
  initialValues?: FormValues;
  onSubmit: (payload: Record<string, unknown>) => Promise<SubmitOutcome>;
  submitLabel?: string;
  onCancel?: () => void;
  idPrefix?: string;
}

const ATTENDANCE_OPTIONS = ATTENDANCE.map((value) => ({ value, label: ATTENDANCE_LABELS[value] }));
const ACCOMPANIED_OPTIONS = [
  { value: "no" as const, label: "Non, je viens seul(e)" },
  { value: "yes" as const, label: "Oui" },
];
const ACCOMMODATION_OPTIONS = ACCOMMODATION_CHOICES.map((value) => ({ value, label: ACCOMMODATION_LABELS[value] }));

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? "s" : ""}`;

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

export function RsvpForm({ mode, initialValues, onSubmit, submitLabel, onCancel, idPrefix = "rsvp" }: RsvpFormProps) {
  const schema = mode === "create" ? rsvpSchema : mode === "edit" ? guestEditSchema : adminRsvpSchema;
  const [values, setValues] = useState<FormValues>(initialValues ?? emptyValues());
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [honeypot, setHoneypot] = useState("");
  const startedAt = useRef(0);
  const summaryRef = useRef<HTMLDivElement>(null);
  const id = (key: string) => `${idPrefix}-${key}`;

  useEffect(() => {
    startedAt.current = performance.now();
  }, []);

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
  const withCompanions = coming && values.accompanied === "yes";
  const participants = participantCount(withCompanions ? values.extraAdults : 0, withCompanions ? values.children : 0);
  const shared = coming && values.accommodation === "interested";
  const housingPeople = values.housingPeople === "" ? participants : values.housingPeople;
  const stay = !values.datesUndecided && values.arrivalDate && values.departureDate ? computeStay(values.arrivalDate, values.departureDate) : null;
  const needsToken = mode === "create" && Boolean(TURNSTILE_SITE_KEY);

  // Indicateur de progression : uniquement les étapes réellement demandées pour cette réponse.
  const progressSteps = [
    Boolean(values.firstName.trim() && values.lastName.trim() && values.email && !clientErrors.firstName && !clientErrors.lastName && !clientErrors.email),
    values.attendance !== "",
    ...(coming
      ? [
          values.accompanied !== "" && !clientErrors.extraAdults,
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
  const sectionTitle = (title: string) => (
    <h3 className="mb-6 flex items-center gap-3 font-display text-2xl font-medium text-ink">
      <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-lavender font-sans text-sm font-semibold text-violet-deep">
        {++n}
      </span>
      {title}
    </h3>
  );

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Confirmation de présence" className="relative">
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

      <section className="space-y-6">
        {sectionTitle("Vos informations")}
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
            label="Nom"
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
          required={mode !== "admin"}
          aria-required={mode !== "admin"}
          placeholder="prenom@exemple.com"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          onBlur={() => touch("email")}
          error={errorFor("email")}
          hint="Pour recevoir votre confirmation et pouvoir la modifier."
          maxLength={254}
        />
      </section>

      <div className="mt-10 border-t border-line pt-8">
        {sectionTitle("Votre présence")}
        <RadioCards
          id={id("attendance")}
          legend="Serez-vous présent(e) à notre mariage le 30 novembre 2026 ?"
          required
          value={values.attendance}
          options={ATTENDANCE_OPTIONS}
          onChange={(v) => {
            set("attendance", v);
            touch("attendance");
          }}
          error={errorFor("attendance")}
        />
      </div>

      <AnimatePresence initial={false}>
        {coming ? (
          <Section key="accompagnants" n={++n} title="Accompagnants">
            <RadioCards
              id={id("accompanied")}
              legend="Viendrez-vous accompagné(e) ?"
              required
              value={values.accompanied}
              options={ACCOMPANIED_OPTIONS}
              onChange={(v) => {
                set("accompanied", v);
                touch("accompanied");
              }}
              error={errorFor("accompanied")}
            />
            <AnimatePresence initial={false}>
              {withCompanions ? (
                <motion.div key="party" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="space-y-6 rounded-3xl bg-blush/80 p-5 sm:p-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Stepper
                        id={id("extraAdults")}
                        label="Adultes supplémentaires"
                        hint="Sans vous compter."
                        value={values.extraAdults}
                        min={0}
                        max={19}
                        onChange={(x) => set("extraAdults", x)}
                        error={errorFor("extraAdults")}
                      />
                      <Stepper id={id("children")} label="Enfants" value={values.children} min={0} max={19} onChange={(x) => set("children", x)} error={errorFor("children")} />
                    </div>
                    <TextField
                      id={id("companionNames")}
                      label="Prénoms des accompagnants"
                      optional
                      placeholder="ex. : Paul, Léa"
                      value={values.companionNames}
                      onChange={(e) => set("companionNames", e.target.value)}
                      error={errorFor("companionNames")}
                      maxLength={300}
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <p aria-live="polite" className="rounded-2xl bg-lavender/60 px-4 py-3 text-sm text-ink">
              Total :{" "}
              <strong className="font-display text-2xl font-medium text-violet-deep">{plural(participants, "participant")}</strong>{" "}
              <span className="text-ink-soft">(vous compris)</span>
            </p>
          </Section>
        ) : null}

        {coming ? (
          <Section key="voyage" n={++n} title="Dates de voyage">
            <div className="grid gap-6 sm:grid-cols-2">
              <TextField
                id={id("arrivalDate")}
                label="Arrivée à Copenhague"
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
                label="Départ de Copenhague"
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

            <div aria-live="polite" className="rounded-2xl bg-lavender/60 px-4 py-3 text-sm text-ink">
              {stay ? (
                <>
                  Durée du séjour : <strong className="font-display text-2xl font-medium text-violet-deep">{plural(stay.nights, "nuit")}</strong>
                </>
              ) : (
                <span className="text-ink-soft">{values.datesUndecided ? "Dates non connues pour le moment." : "Le nombre de nuits se calcule dès que vous avez choisi vos deux dates."}</span>
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
                Je ne connais pas encore mes dates
              </Checkbox>
              <button type="button" onClick={useRecommendedDates} className="self-start text-sm font-medium text-violet-deep underline decoration-violet/40 underline-offset-4 hover:decoration-violet">
                Utiliser 29 nov. → 1er déc.
              </button>
            </div>
          </Section>
        ) : null}

        {coming ? (
          <Section key="logement" n={++n} title="Logement">
            <RadioCards
              id={id("accommodation")}
              legend="Souhaitez-vous bénéficier d'un logement commun avec les autres invités ?"
              required
              value={values.accommodation}
              options={ACCOMMODATION_OPTIONS}
              onChange={(v) => {
                set("accommodation", v);
                touch("accommodation");
              }}
              error={errorFor("accommodation")}
              hint="Cette réponse nous permettra d'évaluer les besoins en logement."
            />
            <AnimatePresence initial={false}>
              {shared ? (
                <motion.div key="housing" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="rounded-3xl bg-blush/80 p-5 sm:p-6">
                    <Stepper
                      id={id("accommodationPeople")}
                      label="Combien de personnes au total auront besoin du logement ?"
                      shortLabel="personnes à loger"
                      hint="Vous et vos éventuels accompagnants compris."
                      value={housingPeople}
                      min={1}
                      max={40}
                      onChange={(x) => set("housingPeople", x)}
                      error={errorFor("accommodationPeople")}
                    />
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </Section>
        ) : null}
      </AnimatePresence>

      {mode === "create" ? (
        <div className="mt-10 border-t border-line pt-8">
          <Checkbox id={id("consent")} checked={values.consent} onChange={(e) => set("consent", e.target.checked)} onBlur={() => touch("consent")} error={errorFor("consent")} aria-required>
            J&apos;accepte que mes informations soient utilisées uniquement pour l&apos;organisation du mariage.
          </Checkbox>
          <p className="mt-3 pl-8 text-sm text-ink-soft">
            <Link href="/confidentialite" target="_blank" className="font-medium text-violet-deep underline decoration-violet/40 underline-offset-4 hover:decoration-violet">
              Politique de confidentialité
            </Link>
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
            (submitLabel ?? "Envoyer ma confirmation")
          )}
        </Button>
      </div>
    </form>
  );
}
