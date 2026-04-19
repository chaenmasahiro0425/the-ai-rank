-- Enhance enterprise_inquiries with role, interests, and consultation preference.
-- These align with real intake needs: 役職 / 興味カテゴリ / 相談段階.

alter table public.enterprise_inquiries
  add column if not exists job_title         text,
  add column if not exists interests         text[] default '{}'::text[],
  add column if not exists consultation_pref text;

comment on column public.enterprise_inquiries.interests is
  'Multi-select: diagnosis_tool | training | consulting | development | other';
comment on column public.enterprise_inquiries.consultation_pref is
  'Single-select: immediate | later | info_only';
