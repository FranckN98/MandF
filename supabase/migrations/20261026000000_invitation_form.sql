-- Formulaire simplifié : l'e-mail identifie désormais la réponse, le logement commun indique le nombre de personnes concernées.
-- Migration incrémentale : toutes les réponses existantes sont conservées (rien n'est supprimé ni réécrit, sauf le remplissage décrit ci-dessous).

-- Le numéro WhatsApp n'est plus demandé. Les numéros déjà enregistrés restent intacts (format et unicité inchangés).
alter table public.wedding_rsvps alter column whatsapp drop not null;

-- Nombre total de personnes ayant besoin du logement commun (répondant et accompagnants compris).
alter table public.wedding_rsvps
  add column accommodation_people smallint check (accommodation_people between 1 and 40);

-- Prénoms des accompagnants (facultatif).
alter table public.wedding_rsvps
  add column companion_names text check (companion_names is null or char_length(companion_names) <= 300);

-- Réponses existantes intéressées par le logement : adultes + enfants déjà déclarés.
update public.wedding_rsvps
set accommodation_people = accompanying_adults + accompanying_children
where accommodation_status = 'interested' and attendance_status <> 'no';

alter table public.wedding_rsvps
  add constraint accommodation_people_only_if_shared check (accommodation_people is null or accommodation_status = 'interested');

comment on column public.wedding_rsvps.accompanying_adults is 'Adultes au total, répondant compris (1 = vient seul).';
comment on column public.wedding_rsvps.accommodation_people is 'Personnes à loger (logement commun), répondant et accompagnants compris.';
