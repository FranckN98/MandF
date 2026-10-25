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
      title: "Notre rencontre",
      text: "C'est en 2018 que notre histoire a commencé. Une rencontre qui a marqué le début de notre chemin ensemble.",
      photos: [{ photo: couple["story-2018"], placeholder: { label: "2018", hint: "Photo de nos débuts à venir" } }],
    },
    {
      id: "2024",
      marker: "2024",
      title: "Nos fiançailles et notre mariage traditionnel",
      text: "En 2024, nous avons franchi une étape importante avec nos fiançailles et la célébration de notre mariage traditionnel au pays, entourés de nos familles.",
      photos: [
        { photo: couple["story-2024-a"], caption: "Fiançailles", placeholder: { label: "Fiançailles", hint: "Photo à venir" } },
        { photo: couple["story-2024-b"], caption: "Mariage traditionnel · Cameroun", placeholder: { label: "Mariage traditionnel", hint: "Photo à venir" } },
      ],
    },
    {
      id: "2025",
      marker: "2025",
      title: "Notre famille s'agrandit",
      text: "En 2025, notre petite fille est venue agrandir notre famille et apporter un nouveau chapitre à notre histoire.",
      photos: familyPhotos.length > 0 ? familyPhotos : [{ placeholder: { label: "2025", hint: "Photo de famille à venir" } }],
    },
    {
      id: "2026",
      marker: "2026",
      title: "Notre mariage civil",
      text: "Le 30 novembre 2026, nous poursuivons notre histoire en officialisant notre union civile à Copenhague.",
      photos: [{ photo: getPlacePhoto("cityhall-night"), caption: "Copenhagen City Hall" }],
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
