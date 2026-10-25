import { HorizontalTimeline, type TimelineStep } from "@/components/ui/HorizontalTimeline";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getPlacePhoto } from "@/content/photos";
import type { CouplePhotos } from "@/lib/couple-photos";

export function Story({ couple }: { couple: CouplePhotos }) {
  const familyPhotos = [couple["story-2025"], couple["story-2025-b"]]
    .filter((photo): photo is NonNullable<typeof photo> => Boolean(photo))
    .map((photo) => ({ photo }));

  const steps: TimelineStep[] = [
    {
      id: "2018",
      marker: "2018",
      title: "Là où tout a commencé",
      text: "C'est sur les bancs de l'université, à Bingen am Rhein, que nos chemins se sont croisés en 2018. Une rencontre qui, au fil du temps, est devenue une belle histoire.",
      photos: [{ photo: couple["story-2018"], placeholder: { label: "2018", hint: "Photo de nos débuts à venir" } }],
    },
    {
      id: "2024",
      marker: "2024",
      title: "Fiançailles & mariage traditionnel",
      text: "En 2024, notre histoire a franchi une nouvelle étape avec nos fiançailles, suivies de notre mariage traditionnel au Cameroun, entourés de nos familles et de nos proches.",
      photos: [
        { photo: couple["story-2024-a"], caption: "Fiançailles", placeholder: { label: "Fiançailles", hint: "Photo à venir" } },
        { photo: couple["story-2024-b"], caption: "Mariage traditionnel · Cameroun", placeholder: { label: "Mariage traditionnel", hint: "Photo à venir" } },
      ],
    },
    {
      id: "2025",
      marker: "2025",
      title: "Notre famille s'agrandit",
      text: "En 2025, l'arrivée de notre petite fille a donné une nouvelle dimension à notre histoire et à notre vie de famille.",
      photos: familyPhotos.length > 0 ? familyPhotos : [{ placeholder: { label: "2025", hint: "Photo de famille à venir" } }],
    },
    {
      id: "2026",
      marker: "2026",
      title: "Notre histoire continue",
      text: "Le 30 novembre 2026, nous franchirons une nouvelle étape avec notre mariage civil à Copenhague. Une nouvelle page de cette même histoire que nous écrivons ensemble depuis 2018.",
      photos: couple["hero-2"]
        ? [{ photo: couple["hero-2"], caption: "Marleine & Franck" }, { photo: getPlacePhoto("cityhall-night"), caption: "Copenhagen City Hall" }]
        : [{ photo: getPlacePhoto("cityhall-night"), caption: "Copenhagen City Hall" }],
    },
  ];

  return (
    <section id="histoire" data-nav="histoire" aria-labelledby="histoire-titre" className="relative bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-0 md:px-8">
        <div className="px-5 md:px-0">
          <SectionHeading
            id="histoire-titre"
            eyebrow="Notre histoire"
            title={
              <>
                Une seule histoire. <span className="italic text-violet">Plusieurs belles étapes.</span>
              </>
            }
          />
        </div>
        <div className="mt-14 lg:mt-20">
          <HorizontalTimeline steps={steps} label="Notre histoire, de 2018 à 2026" variant="story" />
        </div>
      </div>
    </section>
  );
}
