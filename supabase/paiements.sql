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
