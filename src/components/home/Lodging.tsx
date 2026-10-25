import { HOTELS } from "@/content/hotels";
import { getPlacePhoto } from "@/content/photos";
import { ButtonLink } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const linkClass = "font-medium text-violet-deep underline decoration-violet/40 underline-offset-4 hover:decoration-violet";

export function Lodging() {
  return (
    <section id="logement" data-nav="logement" aria-labelledby="logement-titre" className="relative bg-gradient-to-b from-white to-blush py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionHeading
          id="logement-titre"
          eyebrow="Logement"
          title={
            <>
              Votre séjour <span className="italic text-violet">à Copenhague</span>
            </>
          }
        />

        <Reveal className="mx-auto mt-8 max-w-2xl space-y-4 text-center text-base leading-relaxed text-ink-soft sm:text-lg">
          <p>Nous envisageons d&apos;organiser un logement commun pour les proches qui souhaitent séjourner ensemble à Copenhague.</p>
          <p>Afin d&apos;évaluer les besoins, merci de nous indiquer votre préférence lors de votre confirmation de présence.</p>
          <div className="pt-4">
            <ButtonLink href="#confirmation" variant="primary">
              Indiquer mon besoin de logement
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="mt-16">
          <h3 className="text-center text-xs font-medium uppercase tracking-[0.26em] text-violet-deep">Quelques hôtels</h3>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOTELS.map((hotel) => (
              <li key={hotel.id} className="overflow-hidden rounded-3xl bg-white shadow-card">
                <div className="aspect-[4/3]">
                  {hotel.photo ? (
                    <Photo photo={getPlacePhoto(hotel.photo)} sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw" className="h-full w-full" />
                  ) : (
                    <PhotoPlaceholder monogram={hotel.name.split(" ")[0]} hint="Photo à venir" />
                  )}
                </div>
                <div className="p-5">
                  <h4 className="font-display text-xl font-medium leading-tight text-ink">{hotel.name}</h4>
                  <p className="mt-1 text-sm text-ink-soft">{hotel.address}</p>
                  <p className="mt-3 text-sm">
                    <a className={linkClass} href={hotel.officialUrl} target="_blank" rel="noopener noreferrer">
                      Site officiel<span className="sr-only"> de {hotel.name} (nouvel onglet)</span>
                    </a>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
