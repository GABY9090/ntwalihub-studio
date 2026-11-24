-- ÉTAPE 4 : COMPTES (2 vidéos offertes, nom d'affichage, suppression de compte)
-- À coller dans Supabase > SQL Editor, puis "Run" (une seule fois).

-- 1) 2 crédits offerts à l'inscription (au lieu de 3)
alter table public.profiles alter column credits set default 2;
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, credits) values (new.id, 2);
  insert into public.transactions (user_id, amount, reason) values (new.id, 2, 'bienvenue');
  return new;
end; $$;

-- 2) Nom d'affichage modifiable dans "Mon compte"
alter table public.profiles add column if not exists display_name text;

-- 3) Si un client supprime son compte, on garde la trace comptable de ses paiements
--    (obligation légale) mais sans lien avec le compte supprimé.
alter table public.payments alter column user_id drop not null;
alter table public.payments drop constraint if exists payments_user_id_fkey;
alter table public.payments add constraint payments_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;
