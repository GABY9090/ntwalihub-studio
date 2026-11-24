-- À coller dans Supabase > SQL Editor, puis "Run".

-- 1) Profils : un par utilisateur, avec son solde de crédits
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 3 check (credits >= 0),  -- 3 crédits offerts
  created_at timestamptz not null default now()
);

-- 2) Historique des crédits (achats, dépenses, remboursements)
create table if not exists public.transactions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,          -- positif = ajout, négatif = dépense
  reason text not null,             -- 'bienvenue', 'video', 'remboursement', 'achat'
  reference text,                   -- id vidéo ou id paiement
  created_at timestamptz not null default now()
);

-- 3) Vidéos
create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  status text not null default 'pending' check (status in ('pending','ready','failed')),
  fal_request_id text,
  video_url text,
  credits_spent integer not null,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists videos_user_idx on public.videos(user_id, created_at desc);

-- Sécurité : chaque utilisateur ne voit que ses propres données
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.videos enable row level security;

drop policy if exists "voir son profil" on public.profiles;
create policy "voir son profil" on public.profiles for select using (auth.uid() = id);
drop policy if exists "voir ses transactions" on public.transactions;
create policy "voir ses transactions" on public.transactions for select using (auth.uid() = user_id);
drop policy if exists "voir ses videos" on public.videos;
create policy "voir ses videos" on public.videos for select using (auth.uid() = user_id);
-- Aucune policy d'écriture : seul le serveur (clé service_role) modifie les données.

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  insert into public.transactions (user_id, amount, reason) values (new.id, 3, 'bienvenue');
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Dépense atomique : retire les crédits seulement si le solde suffit
create or replace function public.spend_credits(p_user uuid, p_amount int, p_reference text)
returns boolean language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  update public.profiles set credits = credits - p_amount
   where id = p_user and credits >= p_amount;
  ok := found;
  if ok then
    insert into public.transactions (user_id, amount, reason, reference)
    values (p_user, -p_amount, 'video', p_reference);
  end if;
  return ok;
end; $$;

-- Ajout de crédits (remboursement ou achat)
create or replace function public.add_credits(p_user uuid, p_amount int, p_reason text, p_reference text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set credits = credits + p_amount where id = p_user;
  insert into public.transactions (user_id, amount, reason, reference)
  values (p_user, p_amount, p_reason, p_reference);
end; $$;

-- Ces fonctions ne doivent être appelées que par le serveur
revoke execute on function public.spend_credits(uuid, int, text) from public, anon, authenticated;
revoke execute on function public.add_credits(uuid, int, text, text) from public, anon, authenticated;

-- Stockage des vidéos (bucket public en lecture : les liens sont longs et difficiles à deviner)
insert into storage.buckets (id, name, public) values ('videos', 'videos', true)
on conflict (id) do nothing;
-- ÉTAPE 2 : PAIEMENTS
-- À coller dans Supabase > SQL Editor, puis "Run" (une seule fois).

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('stripe','flutterwave')),
  pack_id text not null,
  credits integer not null check (credits > 0),
  amount integer not null,          -- centimes d'euro (Stripe) ou francs rwandais (Flutterwave)
  currency text not null,           -- 'eur' ou 'RWF'
  status text not null default 'pending' check (status in ('pending','paid','failed')),
  provider_ref text,                -- id de session Stripe ou id de transaction Flutterwave
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists payments_user_idx on public.payments(user_id, created_at desc);

alter table public.payments enable row level security;
drop policy if exists "voir ses paiements" on public.payments;
create policy "voir ses paiements" on public.payments for select using (auth.uid() = user_id);

-- Valide un paiement et ajoute les crédits. Ne fait rien si déjà payé
-- (un paiement ne peut jamais donner des crédits deux fois).
create or replace function public.credit_payment(p_payment uuid, p_provider_ref text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_credits int;
begin
  update public.payments
     set status = 'paid', paid_at = now(), provider_ref = p_provider_ref
   where id = p_payment and status = 'pending'
  returning user_id, credits into v_user, v_credits;
  if not found then return false; end if;

  update public.profiles set credits = credits + v_credits where id = v_user;
  insert into public.transactions (user_id, amount, reason, reference)
  values (v_user, v_credits, 'achat', p_payment::text);
  return true;
end; $$;

revoke execute on function public.credit_payment(uuid, text) from public, anon, authenticated;
