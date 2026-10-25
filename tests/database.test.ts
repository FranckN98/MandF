import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { inputToRow, rsvpSchema } from "@/lib/rsvp-schema";

// Rejoue les migrations Supabase sur un vrai moteur PostgreSQL (WASM) avec des rôles et un auth.jwt() équivalents à Supabase.
const migrationsDir = path.resolve(__dirname, "../supabase/migrations");
const [initialMigration, ...laterMigrations] = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => fs.readFileSync(path.join(migrationsDir, f), "utf8"));

let db: PGlite;

const ADMIN = "admin@example.com";
const MAIN = "+4511111111";
const asRole = async (role: "anon" | "authenticated" | "service_role" | "postgres", email?: string) => {
  await db.exec("reset role");
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [email ? JSON.stringify({ email }) : ""]);
  if (role !== "postgres") await db.exec(`set role ${role}`);
};

const valid = (over: Record<string, unknown> = {}) => ({
  first_name: "Marie",
  last_name: "Dupont",
  whatsapp: MAIN,
  attendance_status: "yes",
  arrival_date: "2026-11-29",
  departure_date: "2026-12-01",
  travel_dates_confirmed: true,
  accommodation_status: "interested",
  interested_in_shared_accommodation: true,
  accompanying_adults: 2,
  accompanying_children: 1,
  dinner_status: "yes",
  privacy_consent_at: "2026-10-25T10:00:00Z",
  ...over,
});

async function insert(row: Record<string, unknown>) {
  const keys = Object.keys(row);
  return db.query<Record<string, unknown>>(
    `insert into public.wedding_rsvps (${keys.join(",")}) values (${keys.map((_, i) => `$${i + 1}`).join(",")}) returning *`,
    keys.map((k) => row[k]),
  );
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on function auth.jwt() to anon, authenticated, service_role;
  `);
  await db.exec(initialMigration);
  // Réponses enregistrées avec l'ancien formulaire, avant la migration du nouveau formulaire.
  await db.exec(`
    insert into public.wedding_rsvps (first_name,last_name,whatsapp,attendance_status,arrival_date,departure_date,travel_dates_confirmed,accommodation_status,interested_in_shared_accommodation,accompanying_adults,accompanying_children,children_ages,accommodation_notes,dinner_status,comments,privacy_consent_at)
    values ('Ancien','Interesse','+4599999991','yes','2026-11-29','2026-12-01',true,'interested',true,2,1,'5 ans','RDC','yes','Hate !','2026-10-01T10:00:00Z'),
           ('Ancien','Individuel','+4599999992','maybe',null,null,false,'individual',false,1,0,null,null,'tbd',null,'2026-10-01T10:00:00Z'),
           ('Ancien','Absent','+4599999993','no',null,null,false,null,false,1,0,null,null,null,null,'2026-10-01T10:00:00Z');
  `);
  for (const migration of laterMigrations) await db.exec(migration);
  await db.exec(`insert into public.admin_users (email) values ('${ADMIN}')`);
});

afterAll(async () => {
  await db.close();
});

describe("schema wedding_rsvps", () => {
  it("conserve les réponses existantes après la migration du nouveau formulaire", async () => {
    await asRole("postgres");
    const { rows } = await db.query<Record<string, unknown>>("select * from public.wedding_rsvps where first_name = 'Ancien' order by last_name");
    expect(rows).toHaveLength(3);
    const interested = rows.find((r) => r.last_name === "Interesse");
    expect(interested).toMatchObject({
      whatsapp: "+4599999991", accompanying_adults: 2, accompanying_children: 1, children_ages: "5 ans", accommodation_notes: "RDC", dinner_status: "yes", comments: "Hate !",
      accommodation_people: 3, companion_names: null, stay_nights: 2,
    });
    // Seules les réponses intéressées par le logement reçoivent un nombre de personnes à loger.
    expect(rows.filter((r) => r.accommodation_people !== null)).toHaveLength(1);
  });

  it("n'exige plus de numéro WhatsApp et garde l'e-mail unique pour les nouvelles réponses", async () => {
    await asRole("postgres");
    const a = await insert(valid({ whatsapp: null, email: "nouveau@example.com", accompanying_adults: 3, accompanying_children: 1, accommodation_people: 2, companion_names: "Paul, Léa, Sam" }));
    expect(a.rows[0]).toMatchObject({ whatsapp: null, accommodation_people: 2, companion_names: "Paul, Léa, Sam" });
    await insert(valid({ whatsapp: null, email: "nouveau2@example.com" }));
    await expect(insert(valid({ whatsapp: null, email: "nouveau@example.com" }))).rejects.toMatchObject({ code: "23505" });
  });

  it("le nombre de personnes à loger n'existe que pour le logement commun et reste borné", async () => {
    await asRole("postgres");
    await expect(insert(valid({ whatsapp: null, email: "x1@example.com", accommodation_status: "own", interested_in_shared_accommodation: false, accommodation_people: 2 }))).rejects.toThrow(/accommodation_people_only_if_shared/);
    await expect(insert(valid({ whatsapp: null, email: "x2@example.com", accommodation_people: 0 }))).rejects.toThrow(/check/i);
    await expect(insert(valid({ whatsapp: null, email: "x3@example.com", accommodation_people: 41 }))).rejects.toThrow(/check/i);
  });

  it("calcule jours et nuits côté base (29/11 -> 01/12 = 3 jours / 2 nuits)", async () => {
    await asRole("postgres");
    const { rows } = await insert(valid());
    expect(rows[0]).toMatchObject({ stay_days: 3, stay_nights: 2, edit_token_version: 1, email: null });
    expect(rows[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("empêche un doublon de numéro WhatsApp", async () => {
    await asRole("postgres");
    await expect(insert(valid())).rejects.toMatchObject({ code: "23505" });
  });

  it("n'accepte que des numéros au format international normalisé", async () => {
    await asRole("postgres");
    for (const bad of ["0612345678", "+33 6 12 34 56 78", "+0123456", "+12345", "abc"]) {
      await expect(insert(valid({ whatsapp: bad }))).rejects.toThrow(/whatsapp_check|check constraint/i);
    }
    await expect(insert(valid({ whatsapp: "+4511111112" }))).resolves.toBeTruthy();
  });

  it("l'e-mail est facultatif, normalisé en minuscules et unique s'il est renseigné", async () => {
    await asRole("postgres");
    await insert(valid({ whatsapp: "+4522222221", email: "a@example.com" }));
    await insert(valid({ whatsapp: "+4522222222" }));
    await insert(valid({ whatsapp: "+4522222223" })); // plusieurs réponses sans e-mail : autorisé
    await expect(insert(valid({ whatsapp: "+4522222224", email: "a@example.com" }))).rejects.toMatchObject({ code: "23505" });
    await expect(insert(valid({ whatsapp: "+4522222225", email: "A@Example.com" }))).rejects.toThrow(/check/i);
  });

  it("refuse un départ avant l'arrivée et des dates incomplètes", async () => {
    await asRole("postgres");
    await expect(insert(valid({ whatsapp: "+4533333331", arrival_date: "2026-12-01", departure_date: "2026-11-29" }))).rejects.toThrow(/stay_dates_ordered/);
    await expect(insert(valid({ whatsapp: "+4533333332", departure_date: null }))).rejects.toThrow(/stay_dates_both_or_none/);
  });

  it("refuse des données de voyage pour une réponse « Non »", async () => {
    await asRole("postgres");
    await expect(insert(valid({ whatsapp: "+4533333333", attendance_status: "no" }))).rejects.toThrow(/absent_has_no_trip/);
    const ok = await insert({
      first_name: "A", last_name: "B", whatsapp: "+4533333334", attendance_status: "no", privacy_consent_at: "2026-10-25T10:00:00Z",
    });
    expect(ok.rows[0]).toMatchObject({ stay_days: null, stay_nights: null });
  });

  it("garde le booléen « logement commun » cohérent avec le statut", async () => {
    await asRole("postgres");
    await expect(insert(valid({ whatsapp: "+4533333335", accommodation_status: "own" }))).rejects.toThrow(/shared_flag_matches/);
  });

  it("refuse les énumérations et bornes invalides", async () => {
    await asRole("postgres");
    await expect(insert(valid({ whatsapp: "+4533333336", attendance_status: "peut-etre" }))).rejects.toThrow();
    await expect(insert(valid({ whatsapp: "+4533333337", accompanying_adults: 0 }))).rejects.toThrow();
  });

  it("met à jour updated_at et recalcule les colonnes générées", async () => {
    await asRole("postgres");
    const before = (await db.query<{ updated_at: string }>(`select updated_at from public.wedding_rsvps where whatsapp='${MAIN}'`)).rows[0];
    await new Promise((r) => setTimeout(r, 20));
    const { rows } = await db.query<{ stay_days: number; stay_nights: number; updated_at: string }>(
      `update public.wedding_rsvps set departure_date='2026-12-02' where whatsapp='${MAIN}' returning stay_days, stay_nights, updated_at`,
    );
    expect(rows[0]).toMatchObject({ stay_days: 4, stay_nights: 3 });
    expect(new Date(rows[0].updated_at).getTime()).toBeGreaterThan(new Date(before.updated_at).getTime());
  });
});

describe("formulaire -> base de données", () => {
  const form = {
    firstName: "Nadia",
    lastName: "Ngami",
    email: "Nadia@Example.com",
    attendance: "yes",
    accompanied: true,
    extraAdults: 2,
    children: 1,
    companionNames: "Paul, Léa, Sam",
    arrivalDate: "2026-11-29",
    departureDate: "2026-12-01",
    accommodation: "interested",
    accommodationPeople: 3,
    consent: true,
  };

  it("enregistre une réponse complète : participants, nuits et logement cohérents", async () => {
    await asRole("postgres");
    const { rows } = await insert({ ...inputToRow(rsvpSchema.parse(form)), privacy_consent_at: "2026-10-26T10:00:00Z" });
    expect(rows[0]).toMatchObject({
      email: "nadia@example.com", whatsapp: null, accompanying_adults: 3, accompanying_children: 1, companion_names: "Paul, Léa, Sam",
      stay_nights: 2, stay_days: 3, accommodation_status: "interested", interested_in_shared_accommodation: true, accommodation_people: 3,
    });
    // Participants = adultes (répondant compris) + enfants : 4, le répondant n'est compté qu'une fois.
    expect(Number(rows[0].accompanying_adults) + Number(rows[0].accompanying_children)).toBe(4);
  });

  it("enregistre une réponse « Non » et une réponse sans logement ni accompagnant", async () => {
    await asRole("postgres");
    const no = await insert({ ...inputToRow(rsvpSchema.parse({ ...form, email: "non@example.com", attendance: "no" })), privacy_consent_at: "2026-10-26T10:00:00Z" });
    expect(no.rows[0]).toMatchObject({ attendance_status: "no", accompanying_adults: 1, accompanying_children: 0, accommodation_status: null, accommodation_people: null, stay_nights: null });
    const alone = await insert({
      ...inputToRow(rsvpSchema.parse({ ...form, email: "seul@example.com", accompanied: false, accommodation: "own", datesUndecided: true, arrivalDate: null, departureDate: null })),
      privacy_consent_at: "2026-10-26T10:00:00Z",
    });
    expect(alone.rows[0]).toMatchObject({ accompanying_adults: 1, accompanying_children: 0, accommodation_people: null, travel_dates_confirmed: false, stay_nights: null });
  });

  it("une ancienne réponse (avec dîner et remarques) se modifie avec le nouveau formulaire sans perdre ses anciennes données", async () => {
    await asRole("postgres");
    const changed = inputToRow(rsvpSchema.parse({ ...form, email: "ancien@example.com", accompanied: false, accommodation: "own" }));
    const { rows } = await db.query<Record<string, unknown>>(
      `update public.wedding_rsvps set first_name=$1, last_name=$2, email=$3, attendance_status=$4, arrival_date=$5, departure_date=$6, travel_dates_confirmed=$7,
         accommodation_status=$8, interested_in_shared_accommodation=$9, accompanying_adults=$10, accompanying_children=$11, companion_names=$12, accommodation_people=$13
       where whatsapp='+4599999991' returning *`,
      [changed.first_name, changed.last_name, changed.email, changed.attendance_status, changed.arrival_date, changed.departure_date, changed.travel_dates_confirmed,
        changed.accommodation_status, changed.interested_in_shared_accommodation, changed.accompanying_adults, changed.accompanying_children, changed.companion_names, changed.accommodation_people],
    );
    expect(rows[0]).toMatchObject({ email: "ancien@example.com", accommodation_status: "own", accommodation_people: null, dinner_status: "yes", comments: "Hate !", accommodation_notes: "RDC", whatsapp: "+4599999991" });
  });

  it("passer une ancienne réponse à « Non » vide aussi le dîner pour respecter la contrainte", async () => {
    await asRole("postgres");
    const changed = inputToRow(rsvpSchema.parse({ ...form, email: "ancien2@example.com", attendance: "no" }));
    expect(changed).toHaveProperty("dinner_status", null);
    const { rows } = await db.query<Record<string, unknown>>(
      `update public.wedding_rsvps set attendance_status=$1, arrival_date=null, departure_date=null, travel_dates_confirmed=false, accommodation_status=null,
         interested_in_shared_accommodation=false, accompanying_adults=1, accompanying_children=0, accommodation_people=null, dinner_status=$2
       where whatsapp='+4599999992' returning attendance_status, dinner_status`,
      [changed.attendance_status, changed.dinner_status],
    );
    expect(rows[0]).toEqual({ attendance_status: "no", dinner_status: null });
  });
});

describe("Row Level Security", () => {
  it("la clé publique (anon) ne peut ni lire ni écrire", async () => {
    await asRole("anon");
    await expect(db.query("select * from public.wedding_rsvps")).rejects.toThrow(/permission denied/);
    await expect(insert(valid({ whatsapp: "+4544444441" }))).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from public.rate_limits")).rejects.toThrow(/permission denied/);
    await expect(db.query("select public.check_rate_limit('k', 1, 60)")).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from public.admin_users")).rejects.toThrow(/permission denied/);
  });

  it("un utilisateur connecté qui n'est pas administrateur ne voit aucune réponse et ne peut rien modifier", async () => {
    await asRole("authenticated", "intrus@example.com");
    expect((await db.query("select * from public.wedding_rsvps")).rows).toHaveLength(0);
    await expect(insert(valid({ whatsapp: "+4544444442" }))).rejects.toThrow(/row-level security/);
    expect((await db.query("update public.wedding_rsvps set comments='piraté' returning id")).rows).toHaveLength(0);
    expect((await db.query("delete from public.wedding_rsvps returning id")).rows).toHaveLength(0);
    expect((await db.query("select public.is_admin() as ok")).rows[0]).toEqual({ ok: false });
  });

  it("un administrateur lit, modifie et supprime", async () => {
    await asRole("authenticated", ADMIN);
    expect((await db.query("select public.is_admin() as ok")).rows[0]).toEqual({ ok: true });
    const list = await db.query("select whatsapp from public.wedding_rsvps order by whatsapp");
    expect(list.rows.length).toBeGreaterThanOrEqual(2);
    const upd = await db.query(`update public.wedding_rsvps set comments='ok' where whatsapp='${MAIN}' returning comments`);
    expect(upd.rows[0]).toEqual({ comments: "ok" });
    const del = await db.query(`delete from public.wedding_rsvps where whatsapp='+4533333334' returning id`);
    expect(del.rows).toHaveLength(1);
  });

  it("l'administration compare l'e-mail du jeton sans tenir compte de la casse", async () => {
    await asRole("authenticated", "Admin@Example.com");
    expect((await db.query("select public.is_admin() as ok")).rows[0]).toEqual({ ok: true });
  });

  it("le rôle service (API serveur) accède aux données", async () => {
    await asRole("service_role");
    expect((await db.query<{ n: number }>("select count(*)::int as n from public.wedding_rsvps")).rows[0].n).toBeGreaterThanOrEqual(1);
    await asRole("postgres");
  });
});

describe("limitation de débit", () => {
  it("autorise jusqu'à la limite puis bloque, par clé", async () => {
    await asRole("service_role");
    const call = async (key: string) => (await db.query<{ ok: boolean }>("select public.check_rate_limit($1, 3, 3600) as ok", [key])).rows[0].ok;
    expect([await call("ip:a"), await call("ip:a"), await call("ip:a"), await call("ip:a")]).toEqual([true, true, true, false]);
    expect(await call("ip:b")).toBe(true);
    await asRole("postgres");
  });
});

describe("site_settings", () => {
  it("n'est modifiable que par un administrateur", async () => {
    await asRole("authenticated", "intrus@example.com");
    await expect(db.query(`insert into public.site_settings (key, value) values ('content', '{}')`)).rejects.toThrow(/row-level security/);
    await asRole("authenticated", ADMIN);
    await db.query(`insert into public.site_settings (key, value) values ('content', '{"dinnerStatus":"confirmed"}')`);
    await asRole("anon");
    await expect(db.query("select * from public.site_settings")).rejects.toThrow(/permission denied/);
    await asRole("postgres");
  });
});
