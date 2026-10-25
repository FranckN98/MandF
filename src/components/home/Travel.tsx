import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RECOMMENDED_STAY } from "@/lib/dates";

// Google Flights comprend cette requête en langage naturel : les dates recommandées sont préremplies, l'origine reste au choix du voyageur.
const FLIGHTS_URL = `https://www.google.com/travel/flights?q=${encodeURIComponent(
  `Flights to CPH on ${RECOMMENDED_STAY.arrival} through ${RECOMMENDED_STAY.departure}`,
)}`;
const AIRPORT_TO_CITY_HALL_URL =
  "https://www.google.com/maps/dir/?api=1&origin=Copenhagen+Airport+CPH&destination=Copenhagen+City+Hall+R%C3%A5dhuspladsen+1&travelmode=transit";
const AIRPORT_URL = "https://www.cph.dk/en";
const JOURNEY_PLANNER_URL = "https://www.rejseplanen.dk/";

const linkClass = "font-medium text-violet-deep underline decoration-violet/40 underline-offset-4 hover:decoration-violet";

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className={linkClass} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (nouvel onglet)</span>
    </a>
  );
}

export function Travel() {
  return (
    <section id="voyage" data-nav="voyage" aria-labelledby="voyage-titre" className="relative bg-blush py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionHeading
          id="voyage-titre"
          eyebrow="Voyage"
          title={
            <>
              Organiser <span className="italic text-violet">votre voyage</span>
            </>
          }
          intro="Quelques repères pratiques pour rejoindre Copenhague. Les dates exactes de voyage restent libres : chaque invité les indique lors de sa confirmation."
        />

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-12">
          <Reveal className="sm:col-span-1 lg:col-span-4">
            <div className="h-full rounded-[2rem] bg-white p-8 shadow-card">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-violet-deep">Aéroport d&apos;arrivée</p>
              <p className="mt-4 font-display text-5xl leading-none text-ink">CPH</p>
              <p className="mt-3 text-ink-soft">Copenhagen Airport (Kastrup)</p>
              <p className="mt-5 text-sm">
                <ExternalLink href={AIRPORT_URL}>Site de l&apos;aéroport</ExternalLink>
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="sm:col-span-1 lg:col-span-4">
            <div className="h-full rounded-[2rem] bg-white p-8 shadow-card">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-violet-deep">Période recommandée</p>
              <p className="mt-4 font-display text-3xl leading-tight text-ink sm:text-4xl">
                29 novembre <span className="text-violet">→</span> 1er décembre 2026
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Une suggestion pour profiter de Copenhague autour de la cérémonie du 30 novembre. Vos dates restent libres.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.16} className="sm:col-span-2 lg:col-span-4">
            <div className="flex h-full flex-col rounded-[2rem] bg-gradient-to-br from-rose/70 to-lavender p-8 shadow-card">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-violet-deep">Vols</p>
              <p className="mt-4 text-[0.95rem] leading-relaxed text-ink">
                De nombreuses compagnies desservent Copenhague. Selon votre ville de départ, une correspondance peut être nécessaire : comparez les itinéraires.
              </p>
              <div className="mt-auto pt-6">
                <ButtonLink href={FLIGHTS_URL} target="_blank" rel="noopener noreferrer" variant="primary">
                  Rechercher un vol<span className="sr-only"> (nouvel onglet)</span>
                </ButtonLink>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1} className="sm:col-span-2 lg:col-span-12">
            <div className="rounded-[2rem] border border-line bg-white p-8 shadow-card sm:p-10">
              <h3 className="font-display text-3xl font-medium text-ink sm:text-4xl">De l&apos;aéroport au centre-ville</h3>
              <div className="mt-7 grid gap-8 md:grid-cols-3">
                <div>
                  <h4 className="font-medium text-ink">Train</h4>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
                    Des trains relient directement l&apos;aéroport à la gare centrale (København H). De là, l&apos;hôtel de ville se trouve à quelques minutes à pied.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-ink">Métro et transports en commun</h4>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
                    Le métro (ligne M2) dessert l&apos;aéroport et le centre. Billets et horaires à vérifier sur{" "}
                    <ExternalLink href={JOURNEY_PLANNER_URL}>Rejseplanen</ExternalLink> ou dans l&apos;application de billetterie locale.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-ink">Taxi</h4>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
                    Possible depuis la sortie de l&apos;aéroport. Durée et tarif varient selon la circulation et l&apos;heure : aucun prix n&apos;est garanti ici.
                  </p>
                </div>
              </div>
              <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-ink-soft">
                  Formalités d&apos;entrée : selon votre nationalité, un visa peut être nécessaire. Renseignez-vous suffisamment tôt auprès des autorités compétentes.
                </p>
                <ButtonLink href={AIRPORT_TO_CITY_HALL_URL} target="_blank" rel="noopener noreferrer" variant="secondary" size="md" className="shrink-0">
                  Itinéraire aéroport → mairie<span className="sr-only"> (nouvel onglet)</span>
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-ink-soft">
          Les informations ci-dessus sont indicatives : ni les vols, ni les horaires, ni les prix ne sont garantis. Précisez vos dates de voyage dans le formulaire de confirmation.
        </p>
      </div>
    </section>
  );
}
