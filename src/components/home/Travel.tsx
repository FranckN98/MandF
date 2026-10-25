import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RECOMMENDED_STAY } from "@/lib/dates";

// Google Flights comprend cette requête en langage naturel : les dates de la cérémonie sont préremplies, l'origine reste au choix du voyageur.
const FLIGHTS_URL = `https://www.google.com/travel/flights?q=${encodeURIComponent(
  `Flights to CPH on ${RECOMMENDED_STAY.arrival} through ${RECOMMENDED_STAY.departure}`,
)}`;
const AIRPORT_TO_CITY_HALL_URL =
  "https://www.google.com/maps/dir/?api=1&origin=Copenhagen+Airport+CPH&destination=Copenhagen+City+Hall+R%C3%A5dhuspladsen+1&travelmode=transit";

export function Travel() {
  return (
    <section id="voyage" data-nav="voyage" aria-labelledby="voyage-titre" className="relative bg-blush py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionHeading
          id="voyage-titre"
          eyebrow="Voyage"
          title={
            <>
              Venir <span className="italic text-violet">à Copenhague</span>
            </>
          }
        />

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          <Reveal>
            <div className="h-full rounded-[2rem] bg-white p-8 shadow-card">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-violet-deep">Aéroport</p>
              <p className="mt-4 font-display text-5xl leading-none text-ink">CPH</p>
              <p className="mt-3 text-ink-soft">Copenhagen Airport (Kastrup)</p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="flex h-full flex-col rounded-[2rem] bg-white p-8 shadow-card">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-violet-deep">De l&apos;aéroport à la mairie</p>
              <p className="mt-4 leading-relaxed text-ink-soft">Train ou métro (ligne M2) jusqu&apos;au centre-ville.</p>
              <div className="mt-auto pt-6">
                <ButtonLink href={AIRPORT_TO_CITY_HALL_URL} target="_blank" rel="noopener noreferrer" variant="secondary" size="md">
                  Voir l&apos;itinéraire<span className="sr-only"> (nouvel onglet)</span>
                </ButtonLink>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.16}>
            <div className="flex h-full flex-col rounded-[2rem] bg-gradient-to-br from-rose/70 to-lavender p-8 shadow-card">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-violet-deep">Vols</p>
              <p className="mt-4 leading-relaxed text-ink">Comparez les vols vers Copenhague autour du 30 novembre.</p>
              <div className="mt-auto pt-6">
                <ButtonLink href={FLIGHTS_URL} target="_blank" rel="noopener noreferrer" variant="primary" size="md">
                  Rechercher un vol<span className="sr-only"> (nouvel onglet)</span>
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
