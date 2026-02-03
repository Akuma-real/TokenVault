-- TokenVault (minimal)
-- Safe to run multiple times (uses IF NOT EXISTS where possible).
-- NOTE: run this in Supabase SQL editor.

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
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index if not exists share_tokens_account_id_idx on public.share_tokens(account_id);
create index if not exists share_tokens_expires_at_idx on public.share_tokens(expires_at);

-- Atomic consume for one-time share token. Returns 1 row on success, 0 rows when expired/consumed/invalid.
create or replace function public.consume_share_token(p_token text)
returns table(account_id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_token text;
begin
  if p_token is null or length(trim(p_token)) = 0 then
    return;
  end if;

  v_token := trim(p_token);
  v_hash := encode(digest(convert_to(v_token, 'utf8'), 'sha256'), 'hex');

  return query
    update public.share_tokens
    set consumed_at = now()
    where token_hash = v_hash
      and consumed_at is null
      and expires_at > now()
    returning public.share_tokens.account_id;
end;
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
