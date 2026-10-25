# Marleine & Franck — Notre histoire continue

Site de mariage (mariage civil, **30 novembre 2026, Copenhagen City Hall, 13h00**) : histoire interactive, programme de la journée, galerie, logement, voyage, **confirmation de présence reliée à une vraie base de données**, tableau de bord organisateurs. **Les invités s'identifient par leur adresse e-mail** (confirmation et lien de modification envoyés par e-mail si Resend est configuré).

**Stack** : Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion · Supabase (PostgreSQL + Auth) · Resend (e-mails aux invités et aux organisateurs, facultatif) · Vercel.

---

## 1. Démarrage local

```bash
npm install
cp .env.example .env.local     # puis renseigner les valeurs (voir §2)
npm run dev                    # http://localhost:3000
```

Sans variables Supabase, le site s'affiche normalement mais le formulaire **refuse d'enregistrer** (message explicite, aucune fausse confirmation).

Autres commandes : `npm test` · `npm run typecheck` · `npm run lint` · `npm run build` · `npm run photos` · `npm run photos:fetch` · `npm run verify:setup`.

---

## 2. Configuration (une seule fois)

### a) Supabase (base de données + authentification)

1. Créez un projet sur [supabase.com](https://supabase.com) (région Europe conseillée).
2. **SQL Editor** → exécutez dans l'ordre [`supabase/migrations/20260101000000_wedding_rsvps.sql`](supabase/migrations/20260101000000_wedding_rsvps.sql) puis [`supabase/migrations/20261026000000_invitation_form.sql`](supabase/migrations/20261026000000_invitation_form.sql). La première crée la table `wedding_rsvps` (types `date`, `integer`, `boolean`, énumérations ; durée du séjour calculée par PostgreSQL), les tables `admin_users`, `site_settings`, `rate_limits`, et **active le Row Level Security** : la clé publique ne peut ni lire ni écrire. La seconde adapte la base au formulaire simplifié (WhatsApp facultatif, nombre de personnes à loger, prénoms des accompagnants) **sans supprimer aucune réponse existante** : si la base contient déjà des réponses, exécutez seulement la seconde.
3. **Authentication → Providers → Email** : laissez la confirmation d'e-mail activée. **Authentication → Sign In / Providers → désactivez « Allow new users to sign up »** (seuls vos comptes doivent exister).
4. **Authentication → Users → Add user** : créez un compte par organisateur (e-mail + mot de passe, « Auto Confirm User » coché). Activez si possible l'authentification à deux facteurs.
5. Autorisez ces comptes comme administrateurs (SQL Editor) :
   ```sql
   insert into public.admin_users (email) values ('organisateur1@exemple.tld'), ('organisateur2@exemple.tld');
   ```
6. **Project Settings → API** : copiez l'URL, la clé `anon` et la clé `service_role` dans `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). **La clé `service_role` reste côté serveur** : ne la préfixez jamais par `NEXT_PUBLIC_`.

### b) Secrets applicatifs

- `RSVP_TOKEN_SECRET` : chaîne aléatoire d'au moins 32 caractères (`openssl rand -base64 48`). Elle signe les liens personnels de modification. La changer invalide tous les liens existants.
- `RATE_LIMIT_SALT` : autre chaîne aléatoire (anonymise les IP dans la limitation de débit).
- `CRON_SECRET` : chaîne aléatoire ; Vercel l'envoie à la tâche de purge quotidienne.

### c) Contact WhatsApp et notifications (facultatif)

- `NEXT_PUBLIC_CONTACT_WHATSAPP` : votre numéro au format international (`+4512345678`). Il affiche un bouton « Nous écrire sur WhatsApp » sous le formulaire et sur l'écran de remerciement. Sans lui, le bouton est simplement masqué.
- **E-mails** (Resend, facultatif) : créez un compte [resend.com](https://resend.com), vérifiez votre domaine, puis renseignez `RESEND_API_KEY` et `EMAIL_FROM`. Chaque invité reçoit alors une confirmation avec son lien de modification, et ce lien lui est renvoyé s'il répond à nouveau avec la même adresse. `ADMIN_NOTIFICATION_EMAIL` (une ou plusieurs adresses séparées par des virgules, **à renseigner par vous** : aucune adresse n'est inventée) prévient les organisateurs à chaque réponse. Sans Resend, les réponses sont quand même enregistrées et visibles dans `/admin` ; le lien personnel reste affiché à l'écran après l'envoi.

### d) Anti-robots (Cloudflare Turnstile, gratuit, recommandé)

Créez un widget sur [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile, puis renseignez `NEXT_PUBLIC_TURNSTILE_SITE_KEY` et `TURNSTILE_SECRET_KEY`. Sans cela, le formulaire reste protégé par un champ piège, un délai minimal de remplissage, la validation serveur et une limitation de débit en base.

### e) Vérifier la configuration

```bash
node --env-file=.env.local scripts/verify-setup.mjs
```

Contrôle les variables, la présence des tables, et que la clé publique **ne peut ni lire ni écrire** les réponses.

---

## 3. Déploiement sur Vercel

1. Poussez le dépôt sur GitHub, puis **Add New → Project** sur [vercel.com](https://vercel.com) et importez-le (framework détecté : Next.js).
2. **Settings → Environment Variables** : reportez toutes les variables de `.env.example` (`NEXT_PUBLIC_SITE_URL` = l'URL finale en `https://`, sans slash final).
3. Déployez. [`vercel.json`](vercel.json) programme `/api/cron/purge` chaque jour : après `DATA_RETENTION_DAYS` jours suivant le 30/11/2026 (90 par défaut), toutes les réponses sont supprimées automatiquement.
4. Domaine personnalisé : **Settings → Domains**, puis mettez à jour `NEXT_PUBLIC_SITE_URL` et l'URL de site dans Supabase (**Authentication → URL Configuration**).
5. Après le déploiement : ouvrez `/admin`, connectez-vous, faites une réponse de test depuis le site et supprimez-la.

---

## 4. Gérer le site au quotidien

| Besoin | Où |
| --- | --- |
| Voir les réponses, participants, besoins de logement par nuit, exporter en CSV Excel | `/admin` |
| Modifier / supprimer une réponse | `/admin` → *Détails* |
| Retrouver un invité | `/admin` : recherche par nom ou e-mail |
| Redonner son lien de modification à un invité qui l'a perdu | `/admin` → *Détails* → *Lien personnel de modification* : générer, copier, ou envoyer par e-mail |
| Textes, programme, hôtels | [`src/components/home`](src/components/home), [`src/content/hotels.ts`](src/content/hotels.ts) |

**Confirmation** : à la fin du formulaire, l'invité voit « Merci, votre réponse a bien été enregistrée. » et un **lien personnel** (copier). Ce lien est aussi envoyé par e-mail si Resend est configuré et mémorisé dans le navigateur (un bandeau « Vous avez déjà répondu depuis cet appareil » apparaît au retour). Il est signé et non devinable : quiconque le possède peut modifier ou supprimer la réponse.

**Doublons** : une adresse e-mail = une réponse (contrainte unique en base). Si quelqu'un ressoumet le formulaire avec la même adresse, aucun doublon n'est créé et **aucun lien n'est affiché à l'écran** : il est envoyé uniquement à cette adresse (si Resend est configuré), sinon les mariés peuvent le régénérer depuis `/admin`.

**Anciennes réponses** : celles enregistrées avec le numéro WhatsApp restent intactes (WhatsApp, dînér, commentaires, remarques visibles dans le détail et l'export CSV). Leurs liens de modification restent valides.

---

## 5. Photographies

### Photos de Marleine & Franck

Emplacements : `hero-1` … `hero-6` (médaillon de la page d'accueil), `story-2018`, `story-2024-a` (fiançailles), `story-2024-b` (mariage traditionnel), `story-2025`, `story-2025-b` (famille / Elikia).

1. Déposez vos originaux (JPG/PNG) dans `public/images/couple/originals/`, nommés d'après l'emplacement (`story-2025.jpg`…).
2. Réglez au besoin le texte alternatif et le **point de cadrage** (pour garder les visages dans le cadre) dans [`public/images/couple/settings.json`](public/images/couple/settings.json) : `"focus": "50% 25%"` = point d'intérêt horizontal/vertical.
3. `npm run photos` génère les variantes WebP (480 / 960 / 1600 px) et le manifeste ; chaque URL porte un paramètre `?v=<empreinte>` pour que le navigateur affiche immédiatement une photo remplacée. Les photos sont uniquement redimensionnées, jamais retouchées. Un emplacement sans photo affiche un cadre élégant « Photographie à venir ».

> Attribution actuelle (à vérifier/échanger selon vos souvenirs) : `story-2018` = photo en télécabine, `story-2024-a` = photo devant l'arbre en cœur, `story-2024-b` = mariage traditionnel.

### Photos des lieux (Wikimedia Commons)

15 véritables photographies (hôtel de ville, Tivoli à Noël, centre historique, Nyhavn, vue d'hiver, CABINN City) sous licence libre (CC BY, CC BY-SA, CC0), stockées localement dans `public/images/places` en WebP. Auteurs, licences et liens sources : page `/credits` (générée depuis `src/content/photos.generated.json`). Pour changer une photo : modifiez [`scripts/photos.config.mjs`](scripts/photos.config.mjs) puis `npm run photos:fetch`. Les photos fournies (restaurant Donna) sont dans `scripts/local-photos` et déclarées dans `LOCAL_PHOTOS` du même fichier.

**Photos manquantes (aucune image libre de droits n'existe)** : restaurant Donna, MEININGER Hotel Copenhagen, Wakeup Copenhagen Bernstorffsgade. Le site affiche des cadres « Photographie à venir ». Pour les remplacer, obtenez l'accord du restaurant/de l'hôtel (ou utilisez vos propres photos de repérage), ajoutez le fichier dans `scripts/photos.config.mjs` (restaurant) ou `src/content/hotels.ts` (`photo`).

---

## 6. Sécurité — ce qui est en place

- **RLS partout**, aucune politique pour `anon` ; écriture des invités via l'API serveur (clé `service_role` jamais exposée au navigateur, module `server-only`).
- **Validation côté serveur** (Zod, mêmes règles que le navigateur) ; durée du séjour **calculée par PostgreSQL** (colonnes générées) ; contraintes SQL (dates cohérentes, énumérations, bornes, e-mail normalisé et unique).
- **Liens de modification** signés (HMAC-SHA256), non devinables, révocables (`edit_token_version`) ; page en `no-referrer`.
- **Admin** : session Supabase Auth vérifiée à chaque appel + présence dans `admin_users` (fonction SQL `is_admin()`), et mêmes règles appliquées par RLS ; `proxy.ts` protège `/admin` et `/api/admin`.
- Limitation de débit en base (IP et numéros hachés), champ piège, Turnstile (optionnel), notifications HTML échappées, export CSV protégé contre l'injection de formules, en-têtes de sécurité et CSP en production.
- Le site est en `noindex` (pas d'indexation par les moteurs de recherche).

## 7. Tests

`npm test` exécute 88 tests : calculs de dates, schéma de validation (e-mail, accompagnants sans double comptage, nuits, logement), liens signés, statistiques et besoins par nuit, export CSV, **migrations SQL rejouées sur PostgreSQL (PGlite)**, dont la conservation des réponses existantes, avec rôles `anon` / `authenticated` / `service_role` (contraintes, unicité de l'e-mail, RLS, limitation de débit) et routes API (honeypot, délai, validation, doublons sans fuite de lien, erreurs génériques) avec base et e-mails simulés.

Les tests ne remplacent pas un essai réel : après configuration de Supabase, faites un parcours complet (réponse, lien personnel, modification, suppression, `/admin`, export CSV).
