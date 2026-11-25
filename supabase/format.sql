-- ÉTAPE 6 : FORMAT DES VIDÉOS (vertical 9:16, horizontal 16:9, carré 1:1)
-- À coller dans Supabase > SQL Editor, puis "Run" (une seule fois).
alter table public.projects add column if not exists aspect_ratio text not null default '16:9'
  check (aspect_ratio in ('9:16', '16:9', '1:1'));
