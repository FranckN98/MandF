import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { RSVP_COLUMNS } from "@/lib/rsvp-service";
import type { RsvpRow } from "@/lib/rsvp-schema";
import { getServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { AdminDashboard } from "./AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tableau de bord — Marleine & Franck", robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!isServiceConfigured()) {
    return (
      <PageShell eyebrow="Espace organisateurs" title="Accès non autorisé" narrow>
        <p className="leading-relaxed text-ink-soft">
          Supabase n&apos;est pas encore configuré. Ajoutez les variables serveur nécessaires dans Vercel.
        </p>
      </PageShell>
    );
  }

  const rsvps = await getServiceClient().from("wedding_rsvps").select(RSVP_COLUMNS).order("created_at", { ascending: false });

  if (rsvps.error) {
    return (
      <PageShell eyebrow="Espace organisateurs" title="Données indisponibles" narrow>
        <p className="leading-relaxed text-ink-soft">
          Impossible de lire les réponses : vérifiez que la migration SQL a bien été exécutée dans Supabase.
        </p>
      </PageShell>
    );
  }

  return <AdminDashboard adminEmail="Accès direct" initialRows={(rsvps.data ?? []) as unknown as RsvpRow[]} />;
}
