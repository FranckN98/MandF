import { HorizontalTimeline, type TimelineStep } from "@/components/ui/HorizontalTimeline";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getPlacePhoto } from "@/content/photos";
import type { SiteSettings } from "@/lib/settings-schema";
import { DINNER_VENUE } from "@/lib/site";

const ROUTE_TO_DINNER =
  "https://www.google.com/maps/dir/?api=1&origin=Copenhagen+City+Hall&destination=Restaurant+Donna+Vester+Voldgade+25+Copenhagen&travelmode=walking";

const linkClass = "font-medium text-violet-deep underline decoration-violet/40 underline-offset-4 hover:decoration-violet";

export function Program({ settings }: { settings: SiteSettings }) {
  const dinnerConfirmed = settings.dinnerStatus === "confirmed";

  const steps: TimelineStep[] = [
    {
      id: "arrivee",
      marker: "12h40",
      railLabel: "Arrivée des invités",
      title: "Arrivée des invités",
      text: "Rendez-vous à Copenhagen City Hall. Les proches se retrouvent avant le début de la cérémonie.",
      photos: [{ photo: getPlacePhoto("cityhall-facade"), caption: "Copenhagen City Hall" }],
    },
    {
      id: "ceremonie",
      marker: "13h00",
      markerEnd: "13h30",
      railLabel: "Mariage civil",
      title: "Mariage civil",
      text: "Cérémonie civile à la mairie de Copenhague.",
      photos: [{ photo: getPlacePhoto("cityhall-hall"), caption: "Le grand hall de la mairie" }],
    },
    {
      id: "photos",
      marker: "13h30",
      markerEnd: "14h15",
      railLabel: "Félicitations & photos",
      title: "Félicitations & photos",
      text: "Un moment pour se retrouver, échanger et réaliser les photographies de groupe.",
      photos: [{ photo: getPlacePhoto("cityhall-square"), caption: "La mairie et ses alentours" }],
    },
    {
      id: "decouverte",
      marker: "14h15",
      markerEnd: "16h30",
      railLabel: "Découverte de Copenhague",
      title: "Découverte de Copenhague",
      text: "Promenade dans le centre-ville, photographies et découverte de l'ambiance de Noël.",
      extra: (
        <p className="rounded-2xl bg-blush p-4 text-sm leading-relaxed text-ink-soft">
          <strong className="font-medium text-ink">Suggestion de visite :</strong> Tivoli Gardens et les décorations de Noël de la ville. Il s&apos;agit d&apos;une
          possibilité, et non d&apos;une prestation incluse. L&apos;entrée à Tivoli est payante si une visite à l&apos;intérieur du parc est organisée.
        </p>
      ),
      photos: [{ photo: getPlacePhoto("tivoli-entrance"), caption: "Tivoli Gardens à Noël" }],
    },
    {
      id: "diner",
      marker: "17h00",
      markerPrefix: "À partir de",
      railLabel: "Dîner de mariage",
      title: "Dîner de mariage",
      text: "Dîner prévu avec nos proches dans un cadre convivial.",
      extra: (
        <div className="space-y-3 text-sm leading-relaxed text-ink-soft">
          <address className="not-italic">
            <span className="font-medium text-ink">{DINNER_VENUE.name}</span>
            <br />
            {DINNER_VENUE.street}
            <br />
            {DINNER_VENUE.city}
          </address>
          <p className="inline-flex items-center gap-2 rounded-full bg-lavender px-3 py-1 text-xs font-medium text-violet-deep">
            <span aria-hidden className={`h-2 w-2 rounded-full ${dinnerConfirmed ? "bg-emerald-500" : "bg-rose-deep"}`} />
            {dinnerConfirmed ? "Réservation confirmée" : "Réservation et modalités à confirmer"}
          </p>
          <p>
            {dinnerConfirmed
              ? settings.dinnerDetails
              : "La réservation et les modalités définitives du restaurant restent à confirmer."}
          </p>
          <p className="flex flex-wrap gap-x-5 gap-y-1">
            <a className={linkClass} href={ROUTE_TO_DINNER} target="_blank" rel="noopener noreferrer">
              Itinéraire depuis la mairie<span className="sr-only"> (nouvel onglet)</span>
            </a>
            <a className={linkClass} href={DINNER_VENUE.officialUrl} target="_blank" rel="noopener noreferrer">
              Site du restaurant<span className="sr-only"> (nouvel onglet)</span>
            </a>
          </p>
        </div>
      ),
      photos: [{ placeholder: { label: "Restaurant Donna", hint: "Photographie à venir" } }],
    },
  ];

  return (
    <section id="programme" data-nav="programme" aria-labelledby="programme-titre" className="relative bg-gradient-to-b from-white via-blush to-white py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-0 md:px-8">
        <div className="px-5 md:px-0">
          <SectionHeading
            id="programme-titre"
            eyebrow="Programme de la journée"
            title={
              <>
                Le programme <span className="italic text-violet">du 30 novembre</span>
              </>
            }
            intro="Suivez la journée étape par étape, de l'arrivée à la mairie jusqu'au dîner."
          />
        </div>
        <div className="mt-14 lg:mt-20">
          <HorizontalTimeline steps={steps} label="Programme du 30 novembre 2026" variant="program" />
        </div>
      </div>
    </section>
  );
}
