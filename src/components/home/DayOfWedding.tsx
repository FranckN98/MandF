import { ButtonLink } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { Reveal } from "@/components/ui/Reveal";
import { getPlacePhoto } from "@/content/photos";
import { VENUE } from "@/lib/site";

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

        <div className="relative mx-auto flex min-h-[38rem] max-w-6xl flex-col justify-end gap-10 px-5 pb-12 pt-32 md:px-8 lg:min-h-[44rem] lg:flex-row lg:items-end lg:justify-between lg:pb-16">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-rose">Le Jour J</p>
            <h2 id="jour-j-titre" className="mt-4 font-display text-5xl font-medium leading-[1] text-white sm:text-6xl lg:text-7xl">
              Rendez-vous <span className="italic text-rose">à Copenhague.</span>
            </h2>
            <p className="mt-6 text-lg text-white/90">Lundi 30 novembre 2026</p>
            <p className="font-display text-3xl text-white sm:text-4xl">13h00 — Mariage civil</p>
            <address className="mt-5 not-italic leading-relaxed text-white/85">
              {VENUE.name}
              <br />
              {VENUE.street}
              <br />
              {VENUE.city}
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
              <p className="mt-3 text-sm leading-relaxed text-white/90">
                {VENUE.name}
                <br />
                {VENUE.street}, Copenhague
              </p>
            </div>
          </Reveal>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:px-8 lg:grid-cols-12 lg:gap-14 lg:py-28">
        <Reveal className="grid grid-cols-2 gap-4 lg:col-span-7">
          <figure>
            <Photo photo={outside} sizes="(min-width: 1024px) 330px, 45vw" className="aspect-[3/4] rounded-[1.75rem] shadow-card" />
            <figcaption className="mt-3 text-sm text-ink-soft">Extérieur — la mairie et Rådhuspladsen</figcaption>
          </figure>
          <figure className="mt-10">
            <Photo photo={inside} sizes="(min-width: 1024px) 330px, 45vw" className="aspect-[3/4] rounded-[1.75rem] shadow-card" imgClassName="object-[30%_50%]" />
            <figcaption className="mt-3 text-sm text-ink-soft">Intérieur — le grand hall (Rådhushallen)</figcaption>
          </figure>
        </Reveal>

        <Reveal delay={0.1} className="self-center lg:col-span-5">
          <h3 className="font-display text-3xl font-medium text-ink sm:text-4xl">Pour bien vivre la cérémonie</h3>
          <dl className="mt-7 space-y-6">
            <div className="flex gap-4">
              <dt className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-lavender font-display text-xl text-violet-deep" aria-hidden>
                30′
              </dt>
              <dd>
                <span className="block font-medium text-ink">Durée à prévoir</span>
                <span className="text-ink-soft">Environ 30 minutes.</span>
              </dd>
            </div>
            <div className="flex gap-4">
              <dt className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose/60 font-display text-xl text-violet-deep" aria-hidden>
                15′
              </dt>
              <dd>
                <span className="block font-medium text-ink">Arrivée conseillée</span>
                <span className="text-ink-soft">Nous vous conseillons d&apos;arriver 15 à 20 minutes avant l&apos;heure de la cérémonie, soit vers 12h40.</span>
              </dd>
            </div>
          </dl>
          <p className="mt-8 rounded-2xl bg-blush p-5 text-sm leading-relaxed text-ink-soft">
            Les photographies présentent le véritable hôtel de ville de Copenhague ; l&apos;intérieur montré est son grand hall d&apos;accueil.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
