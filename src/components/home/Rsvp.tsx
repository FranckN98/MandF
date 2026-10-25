import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { SiteSettings } from "@/lib/settings-schema";
import { isServiceConfigured } from "@/lib/supabase/service";
import { RsvpExperience } from "@/components/rsvp/RsvpExperience";

export function Rsvp({ settings }: { settings: SiteSettings }) {
  return (
    <section id="confirmation" data-nav="confirmation" aria-labelledby="confirmation-titre" className="relative bg-gradient-to-b from-blush via-lavender/60 to-blush py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-5 md:px-8">
        <SectionHeading
          id="confirmation-titre"
          eyebrow="Confirmation de présence"
          title={
            <>
              Serez-vous <span className="italic text-violet">des nôtres ?</span>
            </>
          }
          intro="Quelques questions simples pour organiser au mieux la journée, le voyage et le logement. Vous pourrez modifier votre réponse à tout moment grâce à un lien personnel envoyé par e-mail."
        />
        <Reveal delay={0.1} className="mt-12">
          <div className="rounded-[2rem] border border-white bg-white/90 p-6 shadow-soft backdrop-blur sm:p-10">
            <RsvpExperience dinnerNote={settings.dinnerDetails} configured={isServiceConfigured()} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
