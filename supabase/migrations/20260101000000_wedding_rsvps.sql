-- Marleine & Franck — schéma des confirmations de présence (RSVP)
-- À exécuter une seule fois dans Supabase > SQL Editor (ou via `supabase db push`).
--
-- Principes de sécurité :
--   * RLS activé partout, AUCUNE politique pour le rôle `anon` : la clé publique ne peut rien lire ni écrire.
--   * Les invités n'écrivent jamais directement : l'API Next.js (clé service_role, côté serveur uniquement) valide puis enregistre.
--   * Les organisateurs (table admin_users) lisent / modifient / suppriment via leur session Supabase Auth + politiques RLS.

-- ---------------------------------------------------------------------------
-- Types énumérés
-- ---------------------------------------------------------------------------
create type public.attendance_status as enum ('yes', 'no', 'maybe');
create type public.accommodation_status as enum ('interested', 'own', 'individual', 'undecided');
create type public.dinner_status as enum ('yes', 'no', 'tbd');

-- ---------------------------------------------------------------------------
-- Table principale
-- ---------------------------------------------------------------------------
create table public.wedding_rsvps (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(btrim(first_name)) between 1 and 80),
  last_name text not null check (char_length(btrim(last_name)) between 1 and 80),
  -- Le numéro WhatsApp identifie la réponse (format international normalisé : + et 7 à 15 chiffres).
  whatsapp text not null check (whatsapp ~ '^\+[1-9][0-9]{6,14}$'),
  -- E-mail facultatif (non demandé aux invités ; utilisable par les organisateurs).
  email text check (
    email is null or (email = lower(btrim(email)) and char_length(email) between 3 and 254 and position('@' in email) > 1)
  ),
  attendance_status public.attendance_status not null,
  arrival_date date,
  departure_date date,
  -- Calculés par PostgreSQL : impossibles à falsifier depuis le navigateur.
  stay_days integer generated always as (
    case when arrival_date is not null and departure_date is not null then departure_date - arrival_date + 1 end
  ) stored,
  stay_nights integer generated always as (
    case when arrival_date is not null and departure_date is not null then departure_date - arrival_date end
  ) stored,
  travel_dates_confirmed boolean not null default false,
  accommodation_status public.accommodation_status,
  interested_in_shared_accommodation boolean not null default false,
  accompanying_adults smallint not null default 1 check (accompanying_adults between 1 and 20),
  accompanying_children smallint not null default 0 check (accompanying_children between 0 and 20),
  children_ages text check (children_ages is null or char_length(children_ages) <= 200),
  accommodation_notes text check (accommodation_notes is null or char_length(accommodation_notes) <= 1000),
  dinner_status public.dinner_status,
  comments text check (comments is null or char_length(comments) <= 2000),
  privacy_consent_at timestamptz not null,
  -- Permet d'invalider d'un coup tous les anciens liens de modification d'une réponse.
  edit_token_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint stay_dates_both_or_none check ((arrival_date is null) = (departure_date is null)),
  constraint stay_dates_ordered check (arrival_date is null or departure_date >= arrival_date),
  constraint shared_flag_matches check (
    interested_in_shared_accommodation = coalesce(accommodation_status = 'interested', false)
  ),
  constraint absent_has_no_trip check (
    attendance_status <> 'no'
    or (arrival_date is null and accommodation_status is null and interested_in_shared_accommodation = false and dinner_status is null)
  )
);

comment on table public.wedding_rsvps is 'Réponses des invités au mariage civil du 30/11/2026 (données personnelles).';

-- Une seule réponse par numéro WhatsApp (stocké normalisé, imposé par le CHECK ci-dessus).
create unique index wedding_rsvps_whatsapp_unique on public.wedding_rsvps (whatsapp);
create unique index wedding_rsvps_email_unique on public.wedding_rsvps (email) where email is not null;
create index wedding_rsvps_attendance_idx on public.wedding_rsvps (attendance_status);
create index wedding_rsvps_created_idx on public.wedding_rsvps (created_at desc);

create function public.touch_updated_at() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger wedding_rsvps_touch_updated_at
before update on public.wedding_rsvps
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Organisateurs
-- ---------------------------------------------------------------------------
create table public.admin_users (
  email text primary key check (email = lower(btrim(email))),
  created_at timestamptz not null default now()
);

comment on table public.admin_users is 'E-mails des comptes Supabase Auth autorisés à administrer le site.';

create function public.is_admin() returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------------------
-- Limitation de débit (compteurs par fenêtre fixe, clés anonymisées côté serveur)
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

create function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamptz;
  v_hits integer;
begin
  v_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, v_start, 1)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning r.hits into v_hits;

  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_limit;
end;
$$;

-- ---------------------------------------------------------------------------
-- Contenus modifiables par les organisateurs (statut du logement, du dîner…)
-- ---------------------------------------------------------------------------
create table public.site_settings (
  key text primary key check (key ~ '^[a-z_]{1,40}$'),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger site_settings_touch_updated_at
before update on public.site_settings
for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.wedding_rsvps enable row level security;
alter table public.admin_users enable row level security;
alter table public.rate_limits enable row level security;
alter table public.site_settings enable row level security;

-- Aucune politique pour `anon` => aucun accès avec la clé publique.
create policy "admins select rsvps" on public.wedding_rsvps for select to authenticated using (public.is_admin());
create policy "admins insert rsvps" on public.wedding_rsvps for insert to authenticated with check (public.is_admin());
create policy "admins update rsvps" on public.wedding_rsvps for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete rsvps" on public.wedding_rsvps for delete to authenticated using (public.is_admin());

create policy "admins read own row" on public.admin_users
  for select to authenticated using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "admins select settings" on public.site_settings for select to authenticated using (public.is_admin());
create policy "admins insert settings" on public.site_settings for insert to authenticated with check (public.is_admin());
create policy "admins update settings" on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- rate_limits : RLS actif sans aucune politique => inaccessible hors service_role.

-- ---------------------------------------------------------------------------
-- Privilèges
-- ---------------------------------------------------------------------------
revoke all on public.wedding_rsvps from anon, authenticated;
revoke all on public.admin_users from anon, authenticated;
revoke all on public.rate_limits from anon, authenticated;
revoke all on public.site_settings from anon, authenticated;

grant select, insert, update, delete on public.wedding_rsvps to authenticated;
grant select on public.admin_users to authenticated;
grant select, insert, update on public.site_settings to authenticated;

grant all on public.wedding_rsvps, public.admin_users, public.rate_limits, public.site_settings to service_role;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------------------
-- Après avoir créé votre compte dans Supabase > Authentication > Users, autorisez-le :
--   insert into public.admin_users (email) values ('votre-adresse@exemple.tld');
-- ---------------------------------------------------------------------------
