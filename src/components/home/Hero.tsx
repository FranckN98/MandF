import type { PhotoData } from "@/content/photos";
import { ButtonLink } from "@/components/ui/Button";
import { SITE } from "@/lib/site";
import { CircleGallery } from "./CircleGallery";

// Entrée en CSS pur (et non en JS) : le titre reste lisible immédiatement, ce qui protège le LCP.
const enter = (delay: number) => ({ animationDelay: `${delay}s` });

export function Hero({ heroPhotos }: { heroPhotos: PhotoData[] }) {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative isolate overflow-hidden pb-20 pt-28 sm:pt-32 lg:pb-28 lg:pt-36">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 top-10 h-[28rem] w-[28rem] animate-drift rounded-full bg-rose/55 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-[30rem] w-[30rem] animate-drift rounded-full bg-lavender blur-3xl [animation-delay:-8s]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-white" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 md:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div className="text-center lg:text-left">
          <p className="animate-hero-in text-xs font-medium uppercase tracking-[0.3em] text-violet-deep">Mariage civil · Copenhague</p>
          <h1
            id="hero-title"
            style={enter(0.08)}
            className="mt-6 animate-hero-in font-display text-[3.6rem] font-medium leading-[0.95] text-ink sm:text-7xl lg:text-[5.6rem]"
          >
            Marleine <span className="font-normal italic text-violet">&amp;</span> Franck
          </h1>
          <p style={enter(0.16)} className="mt-4 animate-hero-in font-display text-3xl italic text-violet-deep sm:text-4xl">
            {SITE.tagline}
          </p>
          <p style={enter(0.24)} className="mx-auto mt-7 max-w-xl animate-hero-in text-base leading-relaxed text-ink-soft sm:text-lg lg:mx-0">
            « Depuis notre rencontre en 2018, notre histoire a traversé plusieurs belles étapes. Après nos fiançailles et notre mariage traditionnel en 2024, puis
            l&apos;arrivée de notre petite fille en 2025, nous franchissons une nouvelle étape : notre mariage civil à Copenhague. »
          </p>
          <p
            style={enter(0.32)}
            className="mt-7 inline-flex animate-hero-in flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-medium uppercase tracking-[0.2em] text-ink"
          >
            <span aria-hidden className="hidden h-px w-8 bg-violet sm:block" />
            <time dateTime="2026-11-30">{SITE.dateLabel}</time>
            <span aria-hidden className="text-violet">
              ·
            </span>
            <span>{SITE.place}</span>
          </p>
          <div style={enter(0.4)} className="mt-9 flex animate-hero-in flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <ButtonLink href="#histoire" variant="primary">
              Découvrir notre histoire
            </ButtonLink>
            <ButtonLink href="#confirmation" variant="secondary">
              Confirmer ma présence
            </ButtonLink>
          </div>
        </div>

        <div style={enter(0.2)} className="animate-hero-in">
          <CircleGallery photos={heroPhotos} />
        </div>
      </div>
    </section>
  );
}
