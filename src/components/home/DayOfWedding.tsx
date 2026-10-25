import { ButtonLink } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { getPlacePhoto } from "@/content/photos";
import { SITE, VENUE } from "@/lib/site";

export function DayOfWedding() {
  const facade = getPlacePhoto("cityhall-facade");
  const outside = getPlacePhoto("cityhall-square");
  const inside = getPlacePhoto("cityhall-hall");

  return (
    <section id="jour-j" data-nav="jour-j" aria-labelledby="jour-j-titre" className="relative bg-white">
      <div className="relative isolate overflow-hidden bg-ink">
        <Photo photo={facade} sizes="100vw" className="absolute inset-0" imgClassName="scale-105" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/95 via-ink/55 to-ink/20" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-violet-deep/50 to-transparent" />

        <div className="relative mx-auto flex min-h-[34rem] max-w-6xl flex-col justify-end gap-10 px-5 pb-12 pt-32 md:px-8 lg:min-h-[40rem] lg:flex-row lg:items-end lg:justify-between lg:pb-16">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-rose">Le Jour J</p>
            <h2 id="jour-j-titre" className="mt-4 font-display text-5xl font-medium leading-[1] text-white sm:text-6xl lg:text-7xl">
              Rendez-vous <span className="italic text-rose">à Copenhague.</span>
            </h2>
            <p className="mt-6 font-display text-3xl text-white sm:text-4xl">{SITE.dateLong}</p>
            <address className="mt-4 not-italic leading-relaxed text-white/85">
              {VENUE.name}
              <br />
              {VENUE.street}, Copenhague
            </address>
            <ButtonLink href={VENUE.mapsUrl} target="_blank" rel="noopener noreferrer" variant="light" className="mt-7">
              Voir sur Google Maps
              <span className="sr-only"> (s&apos;ouvre dans un nouvel onglet)</span>
            </ButtonLink>
          </Reveal>

          <Reveal delay={0.15} className="w-full max-w-xs shrink-0 lg:mb-2">
            <div className="rounded-3xl border border-white/30 bg-white/15 p-6 text-white shadow-soft backdrop-blur-xl">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-rose">Cérémonie</p>
              <p className="mt-2 font-display text-6xl leading-none">13h00</p>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 px-5 py-16 md:px-8 lg:py-20">
        <Reveal>
          <Photo photo={outside} sizes="(min-width: 1024px) 420px, 45vw" className="aspect-[4/5] rounded-[1.75rem] shadow-card" />
        </Reveal>
        <Reveal delay={0.1} className="mt-8">
          <Photo photo={inside} sizes="(min-width: 1024px) 420px, 45vw" className="aspect-[4/5] rounded-[1.75rem] shadow-card" imgClassName="object-[30%_50%]" />
        </Reveal>
      </div>
    </section>
  );
}
