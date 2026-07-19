-- Termin bez klijenta ("prolaznik"): client_id postaje opcion.
-- Kartica u kalendaru tada prikazuje "Bez klijenta"; statistika broji
-- samo prave klijente (count(distinct client_id) ignoriše NULL).
alter table appointments alter column client_id drop not null;
