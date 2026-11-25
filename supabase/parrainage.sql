-- ÉTAPE 5 : PARRAINAGE
-- À coller dans Supabase > SQL Editor, puis "Run" (une seule fois, après comptes.sql).
-- Règle : quand un ami invité fait son PREMIER achat, l'ami ET le parrain reçoivent chacun 1 crédit.
-- (Pour changer le bonus, modifie la valeur "v_bonus" plus bas puis relance ce fichier.)

alter table public.profiles add column if not exists referral_code text unique;
alter table public.profiles add column if not exists referred_by uuid references auth.users(id) on delete set null;
alter table public.profiles add column if not exists referral_rewarded boolean not null default false;

-- Code court et lisible (sans 0/O/1/I pour éviter les confusions)
create or replace function public.new_referral_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end; $$;

-- Donne un code aux comptes existants
update public.profiles set referral_code = public.new_referral_code() where referral_code is null;

-- Nouvel inscrit : 2 crédits offerts + son code + qui l'a invité (code transmis à l'inscription)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_code text := upper(trim(coalesce(new.raw_user_meta_data->>'ref', '')));
  v_ref uuid;
begin
  if v_code <> '' then
    select id into v_ref from public.profiles where referral_code = v_code;
  end if;
  insert into public.profiles (id, credits, referral_code, referred_by)
  values (new.id, 2, public.new_referral_code(), v_ref);
  insert into public.transactions (user_id, amount, reason) values (new.id, 2, 'bienvenue');
  return new;
end; $$;

-- Paiement validé : ajoute les crédits, puis le bonus de parrainage au premier achat
create or replace function public.credit_payment(p_payment uuid, p_provider_ref text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_user uuid; v_credits int; v_ref uuid; v_bonus int := 1;
begin
  update public.payments
     set status = 'paid', paid_at = now(), provider_ref = p_provider_ref
   where id = p_payment and status = 'pending'
  returning user_id, credits into v_user, v_credits;
  if not found then return false; end if;

  update public.profiles set credits = credits + v_credits where id = v_user;
  insert into public.transactions (user_id, amount, reason, reference)
  values (v_user, v_credits, 'achat', p_payment::text);

  -- Bonus parrainage (une seule fois par filleul)
  update public.profiles set referral_rewarded = true
   where id = v_user and referred_by is not null and referral_rewarded = false
  returning referred_by into v_ref;
  if v_ref is not null then
    update public.profiles set credits = credits + v_bonus where id in (v_user, v_ref);
    insert into public.transactions (user_id, amount, reason, reference) values
      (v_user, v_bonus, 'parrainage', p_payment::text),
      (v_ref,  v_bonus, 'parrainage', v_user::text);
  end if;
  return true;
end; $$;

revoke execute on function public.credit_payment(uuid, text) from public, anon, authenticated;
