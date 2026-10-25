import Link from "next/link";
import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto max-w-6xl px-5 py-16 text-center md:px-8">
        <p className="font-display text-4xl italic text-rose sm:text-5xl">
          Marleine <span className="not-italic text-white">&amp;</span> Franck
        </p>
        <p className="mt-3 font-display text-2xl text-white/90">{SITE.tagline}</p>
        <p className="mt-6 text-xs font-medium uppercase tracking-[0.28em] text-white/70">Copenhague · 30 novembre 2026</p>
        <nav aria-label="Informations légales" className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-white/80">
          <Link href="/confidentialite" className="underline-offset-4 hover:text-white hover:underline">
            Politique de confidentialité
          </Link>
          <Link href="/credits" className="underline-offset-4 hover:text-white hover:underline">
            Crédits photographiques
          </Link>
          <a href="#top" className="underline-offset-4 hover:text-white hover:underline">
            Retour en haut
          </a>
        </nav>
      </div>
    </footer>
  );
}
