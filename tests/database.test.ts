import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Rejoue la migration Supabase sur un vrai moteur PostgreSQL (WASM) avec des rôles et un auth.jwt() équivalents à Supabase.
const migration = fs.readFileSync(path.resolve(__dirname, "../supabase/migrations/20260101000000_wedding_rsvps.sql"), "utf8");

let db: PGlite;

const ADMIN = "admin@example.com";
const asRole = async (role: "anon" | "authenticated" | "service_role" | "postgres", email?: string) => {
  await db.exec("reset role");
  await db.query(`select set_config('request.jwt.claims', $1, false)`, [email ? JSON.stringify({ email }) : ""]);
  if (role !== "postgres") await db.exec(`set role ${role}`);
};

const valid = (over: Record<string, unknown> = {}) => ({
  first_name: "Marie",
  last_name: "Dupont",
  email: "marie@example.com",
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
  await db.exec(migration);
  await db.exec(`insert into public.admin_users (email) values ('${ADMIN}')`);
});

afterAll(async () => {
  await db.close();
});

describe("schéma wedding_rsvps", () => {
  it("calcule jours et nuits côté base (29/11 -> 01/12 = 3 jours / 2 nuits)", async () => {
    await asRole("postgres");
    const { rows } = await insert(valid());
    expect(rows[0]).toMatchObject({ stay_days: 3, stay_nights: 2, edit_token_version: 1 });
    expect(rows[0].id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("empêche un doublon d'e-mail (même avec une casse différente)", async () => {
    await asRole("postgres");
    await expect(insert(valid())).rejects.toMatchObject({ code: "23505" });
    await expect(insert(valid({ email: "MARIE@example.com" }))).rejects.toThrow(/check/i);
  });

  it("refuse un départ avant l'arrivée et des dates incomplètes", async () => {
    await asRole("postgres");
    await expect(insert(valid({ email: "b@example.com", arrival_date: "2026-12-01", departure_date: "2026-11-29" }))).rejects.toThrow(/stay_dates_ordered/);
    await expect(insert(valid({ email: "c@example.com", departure_date: null }))).rejects.toThrow(/stay_dates_both_or_none/);
  });

  it("refuse des données de voyage pour une réponse « Non »", async () => {
    await asRole("postgres");
    await expect(insert(valid({ email: "d@example.com", attendance_status: "no" }))).rejects.toThrow(/absent_has_no_trip/);
    const ok = await insert({
      first_name: "A", last_name: "B", email: "e@example.com", attendance_status: "no", privacy_consent_at: "2026-10-25T10:00:00Z",
    });
    expect(ok.rows[0]).toMatchObject({ stay_days: null, stay_nights: null });
  });

  it("garde le booléen « logement commun » cohérent avec le statut", async () => {
    await asRole("postgres");
    await expect(insert(valid({ email: "f@example.com", accommodation_status: "own" }))).rejects.toThrow(/shared_flag_matches/);
  });

  it("refuse les énumérations et bornes invalides", async () => {
    await asRole("postgres");
    await expect(insert(valid({ email: "g@example.com", attendance_status: "peut-etre" }))).rejects.toThrow();
    await expect(insert(valid({ email: "h@example.com", accompanying_adults: 0 }))).rejects.toThrow();
  });

  it("met à jour updated_at et recalcule les colonnes générées", async () => {
    await asRole("postgres");
    const before = (await db.query<{ updated_at: string }>(`select updated_at from public.wedding_rsvps where email='marie@example.com'`)).rows[0];
    await new Promise((r) => setTimeout(r, 20));
    const { rows } = await db.query<{ stay_days: number; stay_nights: number; updated_at: string }>(
      `update public.wedding_rsvps set departure_date='2026-12-02' where email='marie@example.com' returning stay_days, stay_nights, updated_at`,
    );
    expect(rows[0]).toMatchObject({ stay_days: 4, stay_nights: 3 });
    expect(new Date(rows[0].updated_at).getTime()).toBeGreaterThan(new Date(before.updated_at).getTime());
  });
});

describe("Row Level Security", () => {
  it("la clé publique (anon) ne peut ni lire ni écrire", async () => {
    await asRole("anon");
    await expect(db.query("select * from public.wedding_rsvps")).rejects.toThrow(/permission denied/);
    await expect(insert(valid({ email: "x@example.com" }))).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from public.rate_limits")).rejects.toThrow(/permission denied/);
    await expect(db.query("select public.check_rate_limit('k', 1, 60)")).rejects.toThrow(/permission denied/);
    await expect(db.query("select * from public.admin_users")).rejects.toThrow(/permission denied/);
  });

  it("un utilisateur connecté qui n'est pas administrateur ne voit aucune réponse et ne peut rien modifier", async () => {
    await asRole("authenticated", "intrus@example.com");
    expect((await db.query("select * from public.wedding_rsvps")).rows).toHaveLength(0);
    await expect(insert(valid({ email: "y@example.com" }))).rejects.toThrow(/row-level security/);
    expect((await db.query("update public.wedding_rsvps set comments='piraté' returning id")).rows).toHaveLength(0);
    expect((await db.query("delete from public.wedding_rsvps returning id")).rows).toHaveLength(0);
    expect((await db.query("select public.is_admin() as ok")).rows[0]).toEqual({ ok: false });
  });

  it("un administrateur lit, modifie et supprime", async () => {
    await asRole("authenticated", ADMIN);
    expect((await db.query("select public.is_admin() as ok")).rows[0]).toEqual({ ok: true });
    const list = await db.query("select email from public.wedding_rsvps order by email");
    expect(list.rows.length).toBeGreaterThanOrEqual(2);
    const upd = await db.query(`update public.wedding_rsvps set comments='ok' where email='marie@example.com' returning comments`);
    expect(upd.rows[0]).toEqual({ comments: "ok" });
    const del = await db.query(`delete from public.wedding_rsvps where email='e@example.com' returning id`);
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
