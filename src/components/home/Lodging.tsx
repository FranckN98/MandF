import { HOTELS, HOTELS_NEAR_CITY_HALL_URL, routeToCityHall } from "@/content/hotels";
import { getPlacePhoto } from "@/content/photos";
import { ButtonLink } from "@/components/ui/Button";
import { Photo } from "@/components/ui/Photo";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { SiteSettings } from "@/lib/settings-schema";
import { LodgingInterestButton } from "./LodgingInterestButton";

const linkClass = "font-medium text-violet-deep underline decoration-violet/40 underline-offset-4 hover:decoration-violet";

export function Lodging({ settings }: { settings: SiteSettings }) {
  const confirmed = settings.accommodationStatus === "confirmed";

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
          intro="« Pour faciliter le séjour de nos proches, nous étudions la possibilité d'organiser un logement commun à Copenhague. » Nous voulons savoir combien de personnes seraient intéressées par cette solution."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-12 lg:gap-8">
          <Reveal className="lg:col-span-5">
            <article className="relative flex h-full flex-col overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-deep to-violet p-8 text-white shadow-soft sm:p-10">
              <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-rose/25 blur-2xl" />
              <p className="relative text-xs font-medium uppercase tracking-[0.26em] text-rose">Option A</p>
              <h3 className="relative mt-3 font-display text-4xl font-medium leading-tight">Logement commun</h3>
              <p className="relative mt-4 leading-relaxed text-white/90">
                Nous étudions la possibilité de réserver un logement partagé pour les personnes qui le souhaitent.
              </p>

              <ul className="relative mt-7 space-y-4 text-[0.95rem] leading-relaxed">
                <li className="flex gap-3">
                  <Dot />
                  <span>
                    {confirmed ? (
                      <>
                        <strong className="font-semibold">Hébergement confirmé</strong>
                        {settings.accommodationName ? ` : ${settings.accommodationName}` : ""}
                      </>
                    ) : (
                      "Hébergement en cours d'organisation."
                    )}
                  </span>
                </li>
                <li className="flex gap-3">
                  <Dot />
                  <span>Dates envisagées : du 29 novembre au 1er décembre 2026.</span>
                </li>
                <li className="flex gap-3">
                  <Dot />
                  <span>{settings.accommodationDetails}</span>
                </li>
                <li className="flex gap-3">
                  <Dot />
                  <span>Possibilité de signaler son intérêt dans le formulaire de confirmation.</span>
                </li>
              </ul>

              <p className="relative mt-6 rounded-2xl bg-white/12 p-4 text-sm leading-relaxed text-white/90">
                Signaler votre intérêt permet uniquement d&apos;évaluer les besoins : ce n&apos;est pas une réservation.
              </p>
              <div className="relative mt-auto pt-8">
                <div className="[&_button]:bg-white [&_button]:text-violet-deep [&_button:hover]:bg-blush">
                  <LodgingInterestButton />
                </div>
              </div>
            </article>
          </Reveal>

          <Reveal delay={0.1} className="lg:col-span-7">
            <article className="h-full rounded-[2rem] border border-line bg-white p-6 shadow-card sm:p-10">
              <p className="text-xs font-medium uppercase tracking-[0.26em] text-violet-deep">Option B</p>
              <h3 className="mt-3 font-display text-4xl font-medium leading-tight text-ink">Réserver individuellement</h3>
              <p className="mt-4 leading-relaxed text-ink-soft">
                Vous pouvez aussi réserver votre propre hôtel ou appartement. Voici quelques hôtels situés près du centre de Copenhague. Les tarifs et les disponibilités sont à
                consulter directement auprès de chaque établissement.
              </p>

              <ul className="mt-7 space-y-5">
                {HOTELS.map((hotel) => (
                  <li key={hotel.id} className="grid gap-4 rounded-3xl bg-blush/70 p-3 sm:grid-cols-[11rem_1fr] sm:gap-5">
                    <div className="aspect-[4/3] overflow-hidden rounded-2xl sm:aspect-auto sm:min-h-[8.5rem]">
                      {hotel.photo ? (
                        <Photo photo={getPlacePhoto(hotel.photo)} sizes="(min-width: 640px) 176px, 90vw" className="h-full w-full" />
                      ) : (
                        <PhotoPlaceholder monogram={hotel.name.split(" ")[0]} hint="Photo à venir" className="rounded-2xl" />
                      )}
                    </div>
                    <div className="py-1 pr-2">
                      <h4 className="font-display text-2xl font-medium leading-tight text-ink">{hotel.name}</h4>
                      <p className="mt-1 text-sm text-ink">{hotel.address}</p>
                      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{hotel.note}</p>
                      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                        <a className={linkClass} href={hotel.officialUrl} target="_blank" rel="noopener noreferrer">
                          Site officiel<span className="sr-only"> de {hotel.name} (nouvel onglet)</span>
                        </a>
                        <a className={linkClass} href={routeToCityHall(hotel)} target="_blank" rel="noopener noreferrer">
                          Itinéraire vers la mairie<span className="sr-only"> depuis {hotel.name} (nouvel onglet)</span>
                        </a>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-soft">Ces établissements sont donnés à titre d&apos;exemple : aucun n&apos;est réservé pour le mariage.</p>
                <ButtonLink href={HOTELS_NEAR_CITY_HALL_URL} target="_blank" rel="noopener noreferrer" variant="secondary" size="md">
                  Hôtels près de la mairie<span className="sr-only"> (nouvel onglet)</span>
                </ButtonLink>
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Dot() {
  return <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose" />;
}
