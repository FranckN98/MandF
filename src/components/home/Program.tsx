import { HorizontalTimeline, type TimelineStep } from "@/components/ui/HorizontalTimeline";
import { Photo } from "@/components/ui/Photo";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getPlacePhoto } from "@/content/photos";
import { DINNER_VENUE } from "@/lib/site";

const linkClass = "font-medium text-violet-deep underline decoration-violet/40 underline-offset-4 hover:decoration-violet";

export function Program() {
  const steps: TimelineStep[] = [
    {
      id: "arrivee",
      marker: "12h40",
      railLabel: "Arrivée",
      title: "Arrivée des invités",
      text: "À la mairie de Copenhague.",
      photos: [{ photo: getPlacePhoto("cityhall-facade"), caption: "Copenhagen City Hall" }],
    },
    {
      id: "ceremonie",
      marker: "13h00",
      markerEnd: "13h30",
      railLabel: "Cérémonie",
      title: "Cérémonie civile",
      text: "Notre mariage civil à la mairie.",
      photos: [{ photo: getPlacePhoto("cityhall-hall"), caption: "Le grand hall de la mairie" }],
    },
    {
      id: "photos",
      marker: "13h30",
      markerEnd: "14h15",
      railLabel: "Félicitations & photos",
      title: "Félicitations & photos",
      text: "Un moment pour se retrouver et immortaliser la journée.",
      photos: [{ photo: getPlacePhoto("cityhall-square"), caption: "La mairie et ses alentours" }],
    },
    {
      id: "decouverte",
      marker: "14h15",
      markerEnd: "16h30",
      railLabel: "Découverte",
      title: "Découverte de Copenhague",
      text: "Promenade dans le centre-ville et ambiance de Noël.",
      photos: [{ photo: getPlacePhoto("tivoli-entrance"), caption: "Tivoli Gardens à Noël" }],
    },
    {
      id: "diner",
      marker: "17h00",
      railLabel: "Retrouvailles",
      title: "Retrouvailles au restaurant",
      text: `${DINNER_VENUE.name}, ${DINNER_VENUE.street}, Copenhague.`,
      extra: (
        <div className="space-y-4 text-sm">
          <p>
            <a className={linkClass} href={DINNER_VENUE.mapsUrl} target="_blank" rel="noopener noreferrer">
              Voir sur Google Maps<span className="sr-only"> (nouvel onglet)</span>
            </a>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["donna-salle", "donna-plats"] as const).map((slug) => (
              <Photo key={slug} photo={getPlacePhoto(slug)} sizes="(min-width: 1024px) 220px, 40vw" className="aspect-[3/2] rounded-2xl" />
            ))}
          </div>
        </div>
      ),
      photos: [
        { photo: getPlacePhoto("donna-patio"), caption: "Restaurant Donna" },
        { photo: getPlacePhoto("donna-table") },
      ],
    },
  ];

  return (
    <section id="programme" data-nav="programme" aria-labelledby="programme-titre" className="relative bg-gradient-to-b from-white via-blush to-white py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-0 md:px-8">
        <div className="px-5 md:px-0">
          <SectionHeading
            id="programme-titre"
            eyebrow="Programme"
            title={
              <>
                Le programme <span className="italic text-violet">du 30 novembre</span>
              </>
            }
          />
        </div>
        <div className="mt-14 lg:mt-20">
          <HorizontalTimeline steps={steps} label="Programme du 30 novembre 2026" variant="program" />
        </div>
      </div>
    </section>
  );
}
