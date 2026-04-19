-- THE AI RANK — Supabase schema (canonical, idempotent)
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- This consolidates all migrations under supabase/migrations/ and is safe to re-run.

-- ========================================================================
-- 1. signups — 診断登録データ
-- ========================================================================
create table if not exists public.signups (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null,
  email        text not null,
  company      text not null,
  rank         smallint,
  client_at    timestamptz,
  url          text,
  referrer     text,
  user_agent   text,
  ip           text
);

-- Idempotent upgrade: older deployments had company nullable; bring them in sync.
-- Skip the migration if legacy rows still have null company (prevents accidental
-- failures — run a manual cleanup first if this hits).
do $$
begin
  if exists (select 1 from public.signups where company is null) then
    raise notice 'signups.company has NULLs — backfill before enforcing NOT NULL';
  else
    begin
      alter table public.signups alter column company set not null;
    exception when others then null;
    end;
  end if;
end $$;

create index if not exists signups_created_at_idx on public.signups (created_at desc);
create index if not exists signups_email_idx      on public.signups (lower(email));
create index if not exists signups_rank_idx       on public.signups (rank);

-- RLS: server-side only (service_role bypasses RLS; no public policies)
alter table public.signups enable row level security;

create or replace view public.signups_recent as
  select id, created_at, name, email, company, rank
  from public.signups
  order by created_at desc
  limit 100;

-- ========================================================================
-- 2. enterprise_inquiries — 法人お問い合わせ
-- ========================================================================
-- NOTE: This block is written so both fresh installs AND existing deployments
-- created from the old initial migration converge to the same final schema.
-- The `create table if not exists` defines the full shape for new projects;
-- the `alter table ... add column if not exists` statements below ensure
-- older tables also get the columns added by later migrations.
create table if not exists public.enterprise_inquiries (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),

  -- Who
  company            text not null,
  contact_name       text not null,
  email              text not null,
  job_title          text,

  -- What (structured select values)
  employee_count     text,
  budget_range       text,
  timeline           text,
  interests          text[] default '{}'::text[],
  consultation_pref  text,

  -- Free text
  message            text,

  -- Context
  client_at          timestamptz,
  url                text,
  referrer           text,
  user_agent         text,
  ip                 text
);

-- Idempotent upgrade path for projects created from earlier migrations
alter table public.enterprise_inquiries
  add column if not exists job_title         text,
  add column if not exists employee_count    text,
  add column if not exists budget_range      text,
  add column if not exists timeline          text,
  add column if not exists interests         text[] default '{}'::text[],
  add column if not exists consultation_pref text,
  add column if not exists message           text,
  add column if not exists client_at         timestamptz,
  add column if not exists url               text,
  add column if not exists referrer          text,
  add column if not exists user_agent        text,
  add column if not exists ip                text;

comment on column public.enterprise_inquiries.employee_count is
  'Single-select: under_50 | 50_300 | 300_1000 | over_1000 | unspecified';
comment on column public.enterprise_inquiries.budget_range is
  'Single-select: under_1m | 1_5m | 5_10m | over_10m | unspecified';
comment on column public.enterprise_inquiries.timeline is
  'Single-select: within_3m | 3_6m | 6_12m | over_12m | unspecified';
comment on column public.enterprise_inquiries.interests is
  'Multi-select: diagnosis_tool | training | consulting | development | other';
comment on column public.enterprise_inquiries.consultation_pref is
  'Single-select: immediate | later | info_only';

create index if not exists enterprise_inquiries_created_at_idx
  on public.enterprise_inquiries (created_at desc);
create index if not exists enterprise_inquiries_company_idx
  on public.enterprise_inquiries (lower(company));

alter table public.enterprise_inquiries enable row level security;

-- Done. Verify:
--   select count(*) from public.signups;
--   select count(*) from public.enterprise_inquiries;
