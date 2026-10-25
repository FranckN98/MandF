import type { PhotoData } from "@/content/photos";
import { ButtonLink } from "@/components/ui/Button";
import { SITE, VENUE } from "@/lib/site";
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
          <p className="animate-hero-in text-xs font-medium uppercase tracking-[0.3em] text-violet-deep">Vous êtes invité(e)</p>
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

          <div style={enter(0.24)} className="mx-auto mt-7 max-w-xl animate-hero-in space-y-4 text-base leading-relaxed text-ink-soft sm:text-lg lg:mx-0">
            <p>Il y a des histoires qui commencent par une rencontre et qui, au fil des années, deviennent une vie à deux, puis une famille.</p>
            <p>Après tant de moments partagés et de belles étapes franchies, nous nous apprêtons à écrire une nouvelle page de notre histoire.</p>
            <p>
              Le 30 novembre 2026, nous célébrerons notre mariage civil à Copenhague et serions heureux de vous compter parmi nous pour partager ce moment.
            </p>
          </div>

          <div style={enter(0.32)} className="mt-8 animate-hero-in border-y border-violet/20 py-5 text-ink lg:inline-block lg:pr-12">
            <p className="font-display text-3xl font-medium sm:text-4xl">
              <time dateTime="2026-11-30T13:00">{SITE.dateLabel} · 13h00</time>
            </p>
            <p className="mt-1.5 text-sm font-medium uppercase tracking-[0.2em] text-violet-deep">
              {VENUE.name} · Danemark
            </p>
          </div>

          <div style={enter(0.4)} className="mt-9 flex animate-hero-in flex-col items-stretch sm:flex-row sm:justify-center lg:justify-start">
            <ButtonLink href="#confirmation" variant="primary">
              Je confirme ma présence
            </ButtonLink>
          </div>
        </div>

        <div style={enter(0.2)} className="relative animate-hero-in">
          <CircleGallery photos={heroPhotos} />
          <div
            aria-hidden
            className="absolute left-[1%] top-[6%] flex h-20 w-20 flex-col items-center justify-center rounded-full border border-violet/25 bg-white/90 text-center shadow-soft backdrop-blur sm:h-24 sm:w-24"
          >
            <span className="font-display text-3xl leading-none text-violet-deep">30</span>
            <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-ink-soft">nov. 2026</span>
          </div>
        </div>
      </div>
    </section>
  );
}
