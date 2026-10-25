import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { WEDDING_DATE, addDays, formatDateFr } from "@/lib/dates";
import { retentionDays } from "@/lib/site";

export const metadata: Metadata = { title: "Politique de confidentialité — Marleine & Franck" };

const h2 = "mt-10 font-display text-2xl font-medium text-ink";
const p = "mt-3 leading-relaxed text-ink-soft";

export default function PrivacyPage() {
  const days = retentionDays();
  const deadline = formatDateFr(addDays(WEDDING_DATE, days));

  return (
    <PageShell eyebrow="Vos données" title="Politique de confidentialité">
      <p className="text-lg leading-relaxed text-ink-soft">
        Ce site sert uniquement à organiser le mariage civil de Marleine &amp; Franck. Voici, simplement, ce que nous faisons de vos informations.
      </p>

      <h2 className={h2}>Quelles données sont collectées ?</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed text-ink-soft">
        <li>Prénom, nom et adresse e-mail.</li>
        <li>Votre réponse sur votre présence et, si vous venez : le nombre d&apos;accompagnants (adultes et enfants), leurs prénoms (facultatif), vos dates d&apos;arrivée et de départ.</li>
        <li>Votre besoin de logement commun et le nombre de personnes à loger.</li>
        <li>La date et l&apos;heure de votre consentement, de la création et de la dernière modification de votre réponse.</li>
      </ul>
      <p className={p}>
        Nous ne demandons aucune donnée sensible. Votre adresse IP n&apos;est jamais enregistrée en clair : elle est uniquement transformée en empreinte non réversible pour limiter les envois abusifs.
        Le site n&apos;utilise ni cookie publicitaire ni outil de suivi.
      </p>

      <h2 className={h2}>Pourquoi ces données sont-elles utilisées ?</h2>
      <p className={p}>
        Uniquement pour l&apos;organisation du mariage : connaître les personnes présentes, évaluer les besoins de logement, coordonner le voyage, vous envoyer votre confirmation par e-mail et vous permettre de modifier votre réponse.
        Vous n&apos;êtes inscrit(e) à aucune newsletter et vous ne recevrez aucune communication commerciale.
      </p>

      <h2 className={h2}>Qui peut y accéder ?</h2>
      <p className={p}>
        Les mariés et les organisateurs désignés, via un espace protégé par authentification. Vos données ne sont ni vendues ni partagées à des fins commerciales. Pour faire fonctionner le site, nous
        faisons appel à des prestataires techniques qui les traitent pour notre compte : Supabase (base de données), Vercel (hébergement), Resend (envoi des e-mails), et, lorsqu&apos;elle est activée, Cloudflare Turnstile (vérification anti-robots).
      </p>

      <h2 className={h2}>Comment corriger ou supprimer mes données ?</h2>
      <p className={p}>
        À tout moment, depuis le lien personnel affiché après votre réponse et envoyé par e-mail : vous pouvez modifier votre réponse ou la supprimer définitivement (suppression immédiate de vos informations). Si vous avez perdu ce lien,
        répondez à nouveau avec la même adresse e-mail : il vous sera renvoyé par e-mail. Vous pouvez aussi demander aux mariés de corriger ou d&apos;effacer vos données. Vous disposez des
        droits d&apos;accès, de rectification, d&apos;effacement et d&apos;opposition, et vous pouvez saisir l&apos;autorité de protection des données de votre pays.
      </p>

      <h2 className={h2}>Combien de temps sont-elles conservées ?</h2>
      <p className={p}>
        Les réponses sont conservées pendant {days} jours après le mariage, soit jusqu&apos;au {deadline}. Elles sont ensuite supprimées automatiquement. Vous pouvez demander une suppression plus
        tôt à tout moment.
      </p>
    </PageShell>
  );
}
