"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { contactWhatsappUrl } from "@/lib/contact";

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

export function ContactWhatsapp({ className = "" }: { className?: string }) {
  const url = contactWhatsappUrl("Bonjour, j'ai une question sur le mariage de Marleine & Franck.");
  if (!url) return null;
  return (
    <a className={`font-medium text-violet-deep underline decoration-violet/40 underline-offset-4 hover:decoration-violet ${className}`} href={url} target="_blank" rel="noopener noreferrer">
      Nous écrire sur WhatsApp<span className="sr-only"> (nouvel onglet)</span>
    </a>
  );
}

export type SubmissionResult =
  | { status: "created" | "updated"; emailSent?: boolean; editUrl?: string }
  | { status: "exists"; emailSent?: boolean };

export function ThankYou({ result, headingRef }: { result: SubmissionResult; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  if (result.status === "exists") {
    return (
      <div className="text-center">
        <h3 ref={headingRef} tabIndex={-1} className="font-display text-4xl font-medium text-ink focus:outline-none">
          Cette adresse a déjà répondu
        </h3>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-soft">
          {result.emailSent
            ? "Nous venons de vous envoyer par e-mail votre lien personnel pour modifier votre réponse."
            : "Une réponse existe déjà pour cette adresse. Utilisez votre lien personnel pour la modifier, ou contactez-nous."}
        </p>
        <p className="mt-4 text-sm">
          <ContactWhatsapp />
        </p>
      </div>
    );
  }

  const updated = result.status === "updated";
  return (
    <div className="text-center">
      <span aria-hidden className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lavender text-violet-deep">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
      <h3 ref={headingRef} tabIndex={-1} className="mt-5 font-display text-4xl font-medium text-ink focus:outline-none sm:text-5xl">
        {updated ? "Merci, votre réponse a bien été mise à jour." : "Merci, votre réponse a bien été enregistrée."}
      </h3>
      {result.emailSent ? <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-soft">Un e-mail de confirmation vient de vous être envoyé.</p> : null}

      {result.editUrl ? (
        <div className="mt-8 rounded-3xl bg-blush p-5 text-left text-sm leading-relaxed text-ink-soft" role="status">
          <p>
            <strong className="font-medium text-ink">Pour modifier votre réponse plus tard,</strong> gardez ce lien personnel.
          </p>
          <CopyLink url={result.editUrl} />
          <div className="mt-3">
            <ButtonLink href={result.editUrl} variant="secondary" size="md">
              Modifier ma réponse
            </ButtonLink>
          </div>
        </div>
      ) : null}

      <p className="mt-6 text-sm text-ink-soft">
        <Link href="/confidentialite" className="font-medium text-violet-deep underline underline-offset-4">
          Politique de confidentialité
        </Link>
      </p>
    </div>
  );
}
