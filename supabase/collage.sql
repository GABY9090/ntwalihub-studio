-- ÉTAPE 3b : COLLAGE AUTOMATIQUE DES CLIPS D'UNE PARTIE
-- À coller dans Supabase > SQL Editor, puis "Run" (une seule fois, après series.sql).
alter table public.parts add column if not exists merge_status text not null default 'none'
  check (merge_status in ('none','merging','ready','failed'));
alter table public.parts add column if not exists merged_url text;
alter table public.parts add column if not exists merge_request_id text;
alter table public.parts add column if not exists merged_clip_count integer;
