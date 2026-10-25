import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { getAdminSession } from "@/lib/admin-auth";
import { RSVP_COLUMNS } from "@/lib/rsvp-service";
import type { RsvpRow } from "@/lib/rsvp-schema";
import { mergeSettings } from "@/lib/settings-schema";
import { isAuthConfigured } from "@/lib/supabase/server";
import { SignOutButton } from "./LoginForm";
import { AdminDashboard } from "./AdminDashboard";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tableau de bord — Marleine & Franck", robots: { index: false, follow: false } };

export default async function AdminPage() {
  if (!isAuthConfigured()) redirect("/admin/login");

  const admin = await getAdminSession();
  if (!admin) {
    // Soit non connecté (le proxy redirige déjà), soit connecté mais absent de admin_users.
    return (
      <PageShell eyebrow="Espace organisateurs" title="Accès non autorisé" narrow>
        <p className="leading-relaxed text-ink-soft">
          Ce compte n&apos;est pas autorisé à administrer le site. Ajoutez son adresse e-mail à la table <code>admin_users</code> (voir le README), ou connectez-vous avec un autre compte.
        </p>
        <SignOutButton className="mt-6" />
      </PageShell>
    );
  }

  const [rsvps, settings] = await Promise.all([
    admin.client.from("wedding_rsvps").select(RSVP_COLUMNS).order("created_at", { ascending: false }),
    admin.client.from("site_settings").select("value").eq("key", "content").maybeSingle(),
  ]);

  if (rsvps.error) {
    return (
      <PageShell eyebrow="Espace organisateurs" title="Données indisponibles" narrow>
        <p className="leading-relaxed text-ink-soft">
          Impossible de lire les réponses : vérifiez que la migration SQL a bien été exécutée dans Supabase.
        </p>
        <SignOutButton className="mt-6" />
      </PageShell>
    );
  }

  return (
    <AdminDashboard
      adminEmail={admin.email}
      initialRows={(rsvps.data ?? []) as unknown as RsvpRow[]}
      initialSettings={mergeSettings(settings.data?.value)}
    />
  );
}
