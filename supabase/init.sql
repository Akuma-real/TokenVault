-- TokenVault (minimal)
-- Safe to run multiple times (idempotent & non-destructive).
-- NOTE: run this in Supabase SQL editor or via `psql -f`.

begin;

create extension if not exists pgcrypto;

create or replace function public.tokenvault_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  issuer text,
  encrypted_secret text not null,
  digits int not null default 6,
  period int not null default 30,
  algorithm text not null default 'SHA1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'accounts_set_updated_at'
  ) then
    create trigger accounts_set_updated_at
    before update on public.accounts
    for each row
    execute function public.tokenvault_set_updated_at();
  end if;
end;
$$;

-- API keys (store only hash, never store plaintext)
create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

-- One-time share tokens (store only hash, never store plaintext)
create table if not exists public.share_tokens (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  token_hash text not null unique,
  payload_ciphertext text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  consumed_by_ip text,
  consumed_user_agent text
);

-- Backward-compatible upgrades (in case the table existed before new columns were added).
alter table if exists public.share_tokens
  add column if not exists payload_ciphertext text not null default '';

alter table if exists public.share_tokens
  add column if not exists consumed_by_ip text;

alter table if exists public.share_tokens
  add column if not exists consumed_user_agent text;

create index if not exists share_tokens_account_id_idx on public.share_tokens(account_id);
create index if not exists share_tokens_expires_at_idx on public.share_tokens(expires_at);

-- Atomic consume for one-time share token. Returns 1 row on success, 0 rows when expired/consumed/invalid.
-- Drop legacy signature (create or replace will not remove it).
drop function if exists public.consume_share_token(text);

create or replace function public.consume_share_token(
  p_token_hash text,
  p_ip text default null,
  p_user_agent text default null
)
returns table(account_id uuid, payload_ciphertext text, expires_at timestamptz, consumed_at timestamptz)
language sql
security definer
set search_path = public
as $$
  update public.share_tokens st
  set
    consumed_at = now(),
    consumed_by_ip = coalesce(p_ip, st.consumed_by_ip),
    consumed_user_agent = coalesce(p_user_agent, st.consumed_user_agent)
  where st.token_hash = p_token_hash
    and st.consumed_at is null
    and st.expires_at > now()
  returning st.account_id, st.payload_ciphertext, st.expires_at, st.consumed_at;
$$;

-- Preview (non-consuming) lookup with DB-based validity check (no client-side clocks).
create or replace function public.peek_share_token(p_token_hash text)
returns table(account_id uuid, expires_at timestamptz, consumed_at timestamptz, is_valid boolean)
language sql
security definer
set search_path = public
as $$
  select
    st.account_id,
    st.expires_at,
    st.consumed_at,
    (st.consumed_at is null and st.expires_at > now()) as is_valid
  from public.share_tokens st
  where st.token_hash = p_token_hash;
$$;

commit;
