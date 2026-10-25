import { CopenhagenGallery } from "@/components/home/CopenhagenGallery";
import { DayOfWedding } from "@/components/home/DayOfWedding";
import { Hero } from "@/components/home/Hero";
import { Lodging } from "@/components/home/Lodging";
import { Program } from "@/components/home/Program";
import { Rsvp } from "@/components/home/Rsvp";
import { Story } from "@/components/home/Story";
import { Travel } from "@/components/home/Travel";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { COUPLE_SLOTS, getCouplePhotos } from "@/lib/couple-photos";
import { getSiteSettings } from "@/lib/site-settings";

// Page statique régénérée toutes les minutes : les statuts modifiés depuis /admin apparaissent rapidement.
export const revalidate = 60;

export default async function HomePage() {
  const settings = await getSiteSettings();
  const couple = getCouplePhotos();
  const heroPhotos = COUPLE_SLOTS.filter((s) => s.startsWith("hero-"))
    .map((s) => couple[s])
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <>
      <Navbar />
      <main id="contenu">
        <Hero heroPhotos={heroPhotos} />
        <Story couple={couple} />
        <DayOfWedding />
        <Program settings={settings} />
        <CopenhagenGallery />
        <Lodging settings={settings} />
        <Travel />
        <Rsvp settings={settings} />
      </main>
      <Footer />
    </>
  );
}
