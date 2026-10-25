import Link from "next/link";
import type { ReactNode } from "react";

/** Gabarit sobre pour les pages secondaires (confidentialité, crédits, modification de réponse). */
export function PageShell({ title, eyebrow, children, narrow = false }: { title: string; eyebrow?: string; children: ReactNode; narrow?: boolean }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-blush via-white to-blush">
      <header className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5 md:px-8">
        <Link href="/" className="font-display text-2xl italic text-violet-deep" aria-label="Marleine & Franck — retour au site">
          M<span className="not-italic">&amp;</span>F
        </Link>
        <Link href="/" className="text-sm font-medium text-violet-deep underline underline-offset-4">
          Retour au site
        </Link>
      </header>
      <main id="contenu" className={`mx-auto px-5 pb-24 pt-10 md:px-8 ${narrow ? "max-w-2xl" : "max-w-3xl"}`}>
        {eyebrow ? <p className="text-xs font-medium uppercase tracking-[0.28em] text-violet-deep">{eyebrow}</p> : null}
        <h1 className="mt-3 font-display text-4xl font-medium leading-tight text-ink sm:text-5xl">{title}</h1>
        <div className="mt-10">{children}</div>
      </main>
    </div>
  );
}
