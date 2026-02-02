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

