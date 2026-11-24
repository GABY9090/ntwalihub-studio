-- ÉTAPE 3 : PROJETS (séries) ET VIDÉOS LONGUES
-- À coller dans Supabase > SQL Editor, puis "Run" (une seule fois).

-- Un projet = une "conversation" : il contient les parties 1, 2, 3...
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  final_status text not null default 'none' check (final_status in ('none','merging','ready','failed')),
  final_url text,                 -- le fichier complet assemblé
  final_clip_count integer,       -- nombre de clips dans ce fichier
  merge_request_id text,
  created_at timestamptz not null default now()
);
create index if not exists projects_user_idx on public.projects(user_id, created_at desc);

-- Une partie = une demande du client dans le projet (ex : "partie 2 : ils arrivent au marché")
create table if not exists public.parts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  part_number integer not null,
  prompt text not null,
  requested_clips integer not null check (requested_clips between 1 and 24), -- 1 clip = 5 s
  status text not null default 'running' check (status in ('running','done','no_credits','failed')),
  created_at timestamptz not null default now(),
  unique (project_id, part_number)
);

-- Les clips de 5 s sont des lignes de la table videos
alter table public.videos add column if not exists project_id uuid references public.projects(id) on delete cascade;
alter table public.videos add column if not exists part_id uuid references public.parts(id) on delete cascade;
alter table public.videos add column if not exists part_clip integer;  -- 1, 2, 3... dans la partie
alter table public.videos add column if not exists seq integer;        -- ordre dans tout le projet
alter table public.videos add column if not exists model text;
-- Empêche de lancer deux fois le même clip
create unique index if not exists videos_part_clip_uniq on public.videos(part_id, part_clip);

alter table public.projects enable row level security;
alter table public.parts enable row level security;
drop policy if exists "voir ses projets" on public.projects;
create policy "voir ses projets" on public.projects for select using (auth.uid() = user_id);
drop policy if exists "voir ses parties" on public.parts;
create policy "voir ses parties" on public.parts for select using (auth.uid() = user_id);

-- Range les anciennes vidéos réussies dans un projet chacune
do $$
declare v record; p uuid; pt uuid;
begin
  for v in select * from public.videos where project_id is null and status = 'ready' order by created_at loop
    insert into public.projects (user_id, title, created_at)
    values (v.user_id, left(v.prompt, 60), v.created_at) returning id into p;
    insert into public.parts (project_id, user_id, part_number, prompt, requested_clips, status, created_at)
    values (p, v.user_id, 1, v.prompt, 1, 'done', v.created_at) returning id into pt;
    update public.videos set project_id = p, part_id = pt, part_clip = 1, seq = 1 where id = v.id;
  end loop;
end $$;
alter table public.parts add column if not exists merge_status text not null default 'none'
  check (merge_status in ('none','merging','ready','failed'));
alter table public.parts add column if not exists merged_url text;
alter table public.parts add column if not exists merge_request_id text;
alter table public.parts add column if not exists merged_clip_count integer;
