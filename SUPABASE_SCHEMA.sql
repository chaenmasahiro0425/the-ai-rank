-- THE AI RANK — Supabase schema for signups
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run

-- 1. Table ---------------------------------------------------------------
create table if not exists public.signups (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null,
  email        text not null,
  company      text,
  rank         smallint,
  client_at    timestamptz,
  url          text,
  referrer     text,
  user_agent   text,
  ip           text
);

-- 2. Helpful indexes -----------------------------------------------------
create index if not exists signups_created_at_idx on public.signups (created_at desc);
create index if not exists signups_email_idx      on public.signups (lower(email));
create index if not exists signups_rank_idx       on public.signups (rank);

-- 3. Row Level Security --------------------------------------------------
-- We access the table ONLY from the server using the service role key,
-- which bypasses RLS. For any client-side read access, you'd add explicit
-- policies. For now we enable RLS and add no policies — safest default.
alter table public.signups enable row level security;

-- 4. (Optional) quick sanity view ---------------------------------------
create or replace view public.signups_recent as
  select id, created_at, name, email, company, rank
  from public.signups
  order by created_at desc
  limit 100;

-- Done. Verify:
--   select count(*) from public.signups;
