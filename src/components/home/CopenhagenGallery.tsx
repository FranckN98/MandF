import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getPlacePhoto, type PlaceSlug } from "@/content/photos";
import { Gallery, type GalleryItem } from "./Gallery";

const TILES: Array<{ slug: PlaceSlug; tile: string; focus?: string }> = [
  { slug: "cityhall-facade", tile: "col-span-2 row-span-2" },
  { slug: "cityhall-hall", tile: "col-span-2" },
  { slug: "tivoli-entrance", tile: "row-span-2", focus: "50% 40%" },
  { slug: "nyhavn-night", tile: "" },
  { slug: "centre-stroget", tile: "row-span-2", focus: "42% 50%" },
  { slug: "tivoli-swans", tile: "col-span-2" },
  { slug: "nyhavn-day", tile: "" },
  { slug: "winter-christiansborg", tile: "", focus: "50% 40%" },
  { slug: "cityhall-detail", tile: "col-span-2" },
  { slug: "tivoli-market", tile: "col-span-2 row-span-2" },
  { slug: "centre-angleterre", tile: "", focus: "40% 50%" },
  { slug: "cityhall-night", tile: "" },
  { slug: "tivoli-carousel", tile: "" },
];

export function CopenhagenGallery() {
  const items: GalleryItem[] = TILES.map((t) => ({ photo: getPlacePhoto(t.slug), tile: t.tile, focus: t.focus }));

  return (
    <section id="decouvrir" data-nav="programme" aria-labelledby="decouvrir-titre" className="relative bg-white pb-24 lg:pb-32">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <SectionHeading
          id="decouvrir-titre"
          eyebrow="Galerie"
          title={
            <>
              Découvrir <span className="italic text-violet">Copenhague</span>
            </>
          }
          intro="Quelques lieux de Copenhague, tels qu'ils sont vraiment."
        />
        <div className="mt-14">
          <Gallery items={items} />
        </div>
        <p className="mt-6 text-center text-sm text-ink-soft">
          Photographies issues de Wikimedia Commons, utilisées avec le nom de leurs auteurs et leurs licences —{" "}
          <Link href="/credits" className="font-medium text-violet-deep underline underline-offset-4">
            voir les crédits
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
