"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import type { RecapLine } from "@/lib/recap";

export function RecapList({ lines }: { lines: RecapLine[] }) {
  return (
    <dl className="divide-y divide-line rounded-3xl border border-line bg-white text-left">
      {lines.map((l) => (
        <div key={l.label} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[11rem_1fr] sm:gap-4">
          <dt className="text-xs font-medium uppercase tracking-[0.16em] text-ink-soft sm:pt-0.5">{l.label}</dt>
          <dd className="break-words text-[0.95rem] text-ink">{l.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <input readOnly value={url} aria-label="Votre lien personnel de modification" onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2 text-xs text-ink" />
      <Button
        size="md"
        variant="secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Lien copié" : "Copier le lien"}
      </Button>
    </div>
  );
}

export type SubmissionResult =
  | { status: "created" | "updated"; firstName: string; email: string; attendance: string; recap: RecapLine[]; emailSent: boolean; editUrl?: string }
  | { status: "exists"; firstName: string; email: string; emailSent: boolean };

export function ThankYou({ result, headingRef }: { result: SubmissionResult; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  if (result.status === "exists") {
    return (
      <div className="text-center">
        <h3 ref={headingRef} tabIndex={-1} className="font-display text-4xl font-medium text-ink focus:outline-none">
          Vous avez déjà répondu
        </h3>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-soft">
          Une réponse existe déjà pour l&apos;adresse <strong className="font-medium text-ink">{result.email}</strong>.{" "}
          {result.emailSent
            ? "Nous venons de vous envoyer un e-mail contenant votre lien personnel pour la consulter ou la modifier."
            : "Nous n'avons pas pu vous envoyer le lien de modification par e-mail : merci de nous contacter directement."}
        </p>
        <p className="mt-3 text-sm text-ink-soft">Pensez à vérifier vos courriers indésirables.</p>
      </div>
    );
  }

  const absent = result.attendance === "no";
  const updated = result.status === "updated";
  return (
    <div>
      <div className="text-center">
        <span aria-hidden className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lavender text-violet-deep">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h3 ref={headingRef} tabIndex={-1} className="mt-5 font-display text-4xl font-medium text-ink focus:outline-none sm:text-5xl">
          {updated ? "Réponse mise à jour" : absent ? "Merci de nous avoir prévenus" : "Merci"}, {result.firstName}
          {updated || absent ? "" : " !"}
        </h3>
        <p className="mx-auto mt-4 max-w-lg leading-relaxed text-ink-soft">
          {absent
            ? "Votre réponse est enregistrée. Vous nous manquerez, et nous penserons à vous le 30 novembre."
            : "Votre réponse est bien enregistrée. Voici ce que nous avons reçu :"}
        </p>
      </div>

      <div className="mt-8">
        <RecapList lines={result.recap} />
      </div>

      <div className="mt-8 rounded-3xl bg-blush p-5 text-sm leading-relaxed text-ink-soft" role="status">
        {result.emailSent ? (
          <p>
            Un e-mail de confirmation vient d&apos;être envoyé à <strong className="font-medium text-ink">{result.email}</strong>. Il contient votre lien personnel pour modifier
            votre réponse à tout moment.
          </p>
        ) : (
          <>
            <p>
              <strong className="font-medium text-ink">L&apos;e-mail de confirmation n&apos;a pas pu être envoyé.</strong> Votre réponse est bien enregistrée.
              {result.editUrl ? " Conservez ce lien personnel : il est le seul moyen de la modifier ultérieurement." : ""}
            </p>
            {result.editUrl ? <CopyLink url={result.editUrl} /> : null}
          </>
        )}
      </div>

      {result.editUrl ? (
        <div className="mt-6 text-center">
          <ButtonLink href={result.editUrl} variant="secondary" size="md">
            Modifier ma réponse
          </ButtonLink>
        </div>
      ) : null}
      <p className="mt-6 text-center text-sm text-ink-soft">
        Vos données servent uniquement à organiser le mariage.{" "}
        <Link href="/confidentialite" className="font-medium text-violet-deep underline underline-offset-4">
          Politique de confidentialité
        </Link>
      </p>
    </div>
  );
}
