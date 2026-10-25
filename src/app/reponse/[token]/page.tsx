import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { ButtonLink } from "@/components/ui/Button";
import { RsvpEdit } from "@/components/rsvp/RsvpEdit";
import { inputToValues } from "@/components/rsvp/form-values";
import { rowToInput } from "@/lib/rsvp-schema";
import { findRsvpByToken } from "@/lib/rsvp-service";
import { isServiceConfigured } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Modifier ma réponse — Marleine & Franck",
  robots: { index: false, follow: false },
  // Le jeton figure dans l'URL : on empêche qu'elle ne soit transmise comme "referrer".
  referrer: "no-referrer",
};

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <PageShell title={title} narrow>
      <div className="rounded-3xl bg-white p-7 leading-relaxed text-ink-soft shadow-card">{children}</div>
      <div className="mt-8">
        <ButtonLink href="/#confirmation" variant="primary">
          Répondre à nouveau
        </ButtonLink>
      </div>
    </PageShell>
  );
}

export default async function EditResponsePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!isServiceConfigured()) {
    return <Notice title="Service indisponible">La modification des réponses n&apos;est pas encore activée sur ce site.</Notice>;
  }

  let found: Awaited<ReturnType<typeof findRsvpByToken>>;
  try {
    found = await findRsvpByToken(token);
  } catch {
    return <Notice title="Une erreur est survenue">Nous n&apos;avons pas pu charger votre réponse. Merci de réessayer dans un instant.</Notice>;
  }

  if (!found) {
    return (
      <Notice title="Ce lien n'est plus valide">
        Le lien est incomplet, a été modifié ou la réponse a été supprimée. Si vous l&apos;avez perdu, répondez à nouveau avec la même adresse e-mail : nous vous le renverrons par e-mail.
      </Notice>
    );
  }

  return (
    <PageShell eyebrow="Votre réponse" title="Modifier ma réponse" narrow>
      <div className="rounded-[2rem] border border-white bg-white/90 p-6 shadow-soft sm:p-10">
        <RsvpEdit token={token} initialValues={inputToValues(rowToInput(found.row))} />
      </div>
    </PageShell>
  );
}
