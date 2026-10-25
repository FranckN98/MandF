import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { isAuthConfigured } from "@/lib/supabase/server";
import { LoginForm } from "../LoginForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administration — Marleine & Franck", robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <PageShell eyebrow="Espace organisateurs" title="Connexion" narrow>
      {isAuthConfigured() ? (
        <div className="rounded-3xl bg-white p-7 shadow-card sm:p-9">
          <LoginForm />
          <p className="mt-6 text-xs leading-relaxed text-ink-soft">Accès réservé aux organisateurs. Les comptes sont créés dans Supabase Authentication.</p>
        </div>
      ) : (
        <p className="rounded-3xl bg-white p-7 leading-relaxed text-ink-soft shadow-card">
          Supabase n&apos;est pas encore configuré (variables <code>NEXT_PUBLIC_SUPABASE_URL</code> et <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>).
        </p>
      )}
    </PageShell>
  );
}
