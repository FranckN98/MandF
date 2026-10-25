import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { getAllPlaceCredits } from "@/content/photos";

export const metadata: Metadata = { title: "Crédits photographiques — Marleine & Franck" };

export default function CreditsPage() {
  const credits = getAllPlaceCredits();
  return (
    <PageShell eyebrow="Photographies" title="Crédits photographiques">
      <p className="text-lg leading-relaxed text-ink-soft">
        Les photographies des lieux (hôtel de ville, Tivoli Gardens, centre historique, Nyhavn, hôtel) sont de véritables photographies, publiées sous licence libre sur Wikimedia Commons. Elles ont été redimensionnées et
        converties au format WebP ; leur contenu n&apos;a pas été modifié. Merci à leurs auteurs. Les photographies du restaurant Donna restent la propriété du restaurant et de leurs auteurs.
      </p>

      <ul className="mt-10 divide-y divide-line rounded-3xl border border-line bg-white">
        {credits.map(({ slug, caption, credit }) => (
          <li key={slug} className="grid gap-1 px-5 py-4 sm:grid-cols-[1fr_auto] sm:gap-6">
            <div>
              <p className="font-medium text-ink">{caption}</p>
              <p className="mt-0.5 text-sm text-ink-soft">
                Photo : {credit.author}
              </p>
            </div>
            <p className="text-sm sm:text-right">
              <a className="font-medium text-violet-deep underline underline-offset-4" href={credit.licenseUrl || credit.sourceUrl} target="_blank" rel="noopener noreferrer">
                {credit.license}
              </a>
              <span className="mx-2 text-ink-soft">·</span>
              <a className="text-ink-soft underline underline-offset-4" href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">
                Source
              </a>
            </p>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-sm leading-relaxed text-ink-soft">
        Les photographies de Marleine &amp; Franck et de leur famille sont la propriété de leurs auteurs et ne peuvent être réutilisées sans autorisation.
      </p>
    </PageShell>
  );
}
