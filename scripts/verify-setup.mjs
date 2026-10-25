// Vérifie la configuration avant la mise en ligne : variables, base de données, protections RLS.
// Usage : node --env-file=.env.local scripts/verify-setup.mjs
/* eslint-disable @typescript-eslint/no-unused-expressions -- script CLI : ternaires utilisés comme instructions */
import { createClient } from "@supabase/supabase-js";

const env = process.env;
let failures = 0;
const ok = (msg) => console.log(`  ok   ${msg}`);
const warn = (msg) => console.log(`  warn ${msg}`);
const fail = (msg) => {
  failures++;
  console.log(`  FAIL ${msg}`);
};

console.log("Variables d'environnement");
for (const k of ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "RSVP_TOKEN_SECRET"]) {
  env[k] ? ok(k) : fail(`${k} manquante`);
}
if (env.RSVP_TOKEN_SECRET && env.RSVP_TOKEN_SECRET.length < 32) fail("RSVP_TOKEN_SECRET doit faire au moins 32 caractères");
if (env.NEXT_PUBLIC_SITE_URL && !/^https:\/\//.test(env.NEXT_PUBLIC_SITE_URL)) warn("NEXT_PUBLIC_SITE_URL n'est pas en https (normal en local, pas en production)");
env.RESEND_API_KEY && env.EMAIL_FROM
  ? ok("E-mails aux invités (Resend)")
  : warn("e-mails désactivés (facultatif : RESEND_API_KEY, EMAIL_FROM) ; le lien personnel de modification reste affiché à l'écran après l'envoi du formulaire");
env.ADMIN_NOTIFICATION_EMAIL ? ok("ADMIN_NOTIFICATION_EMAIL") : warn("ADMIN_NOTIFICATION_EMAIL absent : les organisateurs ne sont pas prévenus à chaque réponse");
env.NEXT_PUBLIC_CONTACT_WHATSAPP
  ? /^\+[1-9]\d{6,14}$/.test(env.NEXT_PUBLIC_CONTACT_WHATSAPP.replace(/[\s().-]/g, ""))
    ? ok("NEXT_PUBLIC_CONTACT_WHATSAPP")
    : fail("NEXT_PUBLIC_CONTACT_WHATSAPP doit être au format international (+4512345678)")
  : warn("NEXT_PUBLIC_CONTACT_WHATSAPP absent : le bouton « Nous écrire sur WhatsApp » n'est pas affiché");
env.TURNSTILE_SECRET_KEY && env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? ok("Cloudflare Turnstile") : warn("Turnstile non configuré : seuls le champ piège et la limitation de débit protègent le formulaire");
env.CRON_SECRET ? ok("CRON_SECRET") : warn("CRON_SECRET manquant : la purge automatique est désactivée");
if (Object.keys(env).some((k) => /^NEXT_PUBLIC_.*(SERVICE|SECRET)/i.test(k))) fail("Une variable NEXT_PUBLIC_ contient SERVICE/SECRET : elle serait exposée au navigateur");

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log("\nImpossible de tester la base sans les variables Supabase.");
  process.exit(1);
}

const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, opts);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);

console.log("\nBase de données");
for (const table of ["wedding_rsvps", "admin_users", "site_settings", "rate_limits"]) {
  const { error } = await service.from(table).select("*", { count: "exact", head: true });
  error ? fail(`table ${table} inaccessible (migration exécutée ?) : ${error.message}`) : ok(`table ${table}`);
}
const formColumns = await service.from("wedding_rsvps").select("accommodation_people,companion_names", { head: true, count: "exact" });
formColumns.error ? fail(`migration 20261026000000_invitation_form.sql non exécutée : ${formColumns.error.message}`) : ok("colonnes du formulaire simplifié");
const rl = await service.rpc("check_rate_limit", { p_key: "verify-setup", p_limit: 1000, p_window_seconds: 60 });
rl.error ? fail(`fonction check_rate_limit : ${rl.error.message}`) : ok("fonction check_rate_limit");
const { count: admins } = await service.from("admin_users").select("*", { count: "exact", head: true });
admins ? ok(`${admins} administrateur(s) autorisé(s)`) : warn("admin_users est vide : personne ne pourra ouvrir /admin");

console.log("\nSécurité (clé publique anon)");
const read = await anon.from("wedding_rsvps").select("id").limit(1);
!read.error && (read.data?.length ?? 0) === 0 && read.status === 200
  ? warn("lecture anon renvoie 0 ligne sans erreur (acceptable si RLS actif, mais vérifiez qu'aucune ligne n'est exposée)")
  : read.error
    ? ok("lecture anon refusée")
    : fail("la clé publique peut LIRE des réponses : vérifiez le RLS !");
const write = await anon.from("wedding_rsvps").insert({ first_name: "x", last_name: "x", whatsapp: "+10000000000", attendance_status: "no", privacy_consent_at: new Date().toISOString() });
write.error ? ok("écriture anon refusée") : fail("la clé publique peut ÉCRIRE : vérifiez le RLS !");
if (!write.error) await service.from("wedding_rsvps").delete().eq("whatsapp", "+10000000000");
const rpc = await anon.rpc("check_rate_limit", { p_key: "x", p_limit: 1, p_window_seconds: 60 });
rpc.error ? ok("check_rate_limit non appelable avec la clé publique") : fail("check_rate_limit est appelable avec la clé publique");

console.log(failures ? `\n${failures} problème(s) à corriger.` : "\nConfiguration valide.");
process.exit(failures ? 1 : 0);
