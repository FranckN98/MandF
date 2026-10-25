import { PageShell } from "@/components/layout/PageShell";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <PageShell title="Page introuvable" narrow>
      <p className="leading-relaxed text-ink-soft">Cette page n&apos;existe pas ou a été déplacée.</p>
      <div className="mt-8">
        <ButtonLink href="/" variant="primary">
          Retour au site
        </ButtonLink>
      </div>
    </PageShell>
  );
}
