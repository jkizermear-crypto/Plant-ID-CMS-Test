-- Field ID Challenge MVP content architecture
-- Phase 1: content database + photo storage + CMS permissions
--
-- IMPORTANT:
-- 1) This does NOT alter field_id_scores or any checklist tables.
-- 2) Run in a TEST Supabase project/environment first.
-- 3) Public users can read published content only.
-- 4) Only users listed in fid_admins can change content.



-- =========================
-- RELEASES
-- =========================
create table if not exists public.fid_releases (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  title text not null,
  release_date date,
  status text not null default 'draft'
    check (status in ('draft','published','archived')),
  welcome_title text,
  welcome_body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- SPECIES
-- =========================
create table if not exists public.fid_species (
  id uuid primary key default gen_random_uuid(),
  common_name text not null unique,
  scientific_name text,
  notes text,
  is_active boolean not null default true,
  introduced_release_id uuid references public.fid_releases(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- TAG VOCABULARY
-- =========================
create table if not exists public.fid_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  sort_order integer not null default 0
);

insert into public.fid_tags (slug,label,sort_order)
values
 ('foliage','Foliage',10),
 ('flower','Flower',20),
 ('fruit','Fruit',30),
 ('seedhead','Seedhead',40),
 ('bare','Bare / Leaf-off',50),
 ('bark','Bark',60),
 ('shape','Overall Shape',70),
 ('acorn','Acorn',80),
 ('bud','Bud',90),
 ('twig','Twig / Stem',100)
on conflict (slug) do nothing;

-- =========================
-- PHOTOS
-- =========================
create table if not exists public.fid_photos (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.fid_species(id) on delete cascade,
  storage_path text not null unique,
  original_filename text,
  orientation_degrees integer not null default 0
    check (orientation_degrees in (0,90,180,270)),
  alt_text text,
  is_active boolean not null default true,

  -- Rights / attribution fields. These matter if the product is commercialized.
  photographer text,
  source_url text,
  license_code text,
  attribution_text text,

  introduced_release_id uuid references public.fid_releases(id) on delete set null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fid_photo_tags (
  photo_id uuid not null references public.fid_photos(id) on delete cascade,
  tag_id uuid not null references public.fid_tags(id) on delete cascade,
  primary key (photo_id,tag_id)
);

-- =========================
-- ID / PRACTICE CARDS
-- scope:
-- general = species fallback
-- stage   = stage/tag-specific lesson
-- photo   = exact-photo lesson
-- =========================
create table if not exists public.fid_tips (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.fid_species(id) on delete cascade,
  scope text not null check (scope in ('general','stage','photo')),
  stage_tag_id uuid references public.fid_tags(id) on delete set null,
  photo_id uuid references public.fid_photos(id) on delete cascade,
  body text not null,
  memory_text text,
  source_name text,
  source_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    (scope='general' and stage_tag_id is null and photo_id is null)
    or
    (scope='stage' and stage_tag_id is not null and photo_id is null)
    or
    (scope='photo' and photo_id is not null)
  )
);

-- =========================
-- COMPARISON CARDS
-- One row means:
-- "correct_species was pictured, user guessed wrong_species"
-- =========================
create table if not exists public.fid_comparisons (
  id uuid primary key default gen_random_uuid(),
  correct_species_id uuid not null references public.fid_species(id) on delete cascade,
  wrong_species_id uuid not null references public.fid_species(id) on delete cascade,
  scope text not null default 'general'
    check (scope in ('general','stage','photo')),
  stage_tag_id uuid references public.fid_tags(id) on delete set null,
  photo_id uuid references public.fid_photos(id) on delete cascade,
  body text not null,
  memory_text text,
  source_name text,
  source_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (correct_species_id <> wrong_species_id),
  check (
    (scope='general' and stage_tag_id is null and photo_id is null)
    or
    (scope='stage' and stage_tag_id is not null and photo_id is null)
    or
    (scope='photo' and photo_id is not null)
  )
);

-- =========================
-- DISTRACTORS
-- =========================
create table if not exists public.fid_distractors (
  species_id uuid not null references public.fid_species(id) on delete cascade,
  distractor_species_id uuid not null references public.fid_species(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (species_id,distractor_species_id),
  check (species_id <> distractor_species_id)
);

-- =========================
-- CMS ADMINS
-- Add your authenticated Supabase user UUID here after creating an admin login.
-- =========================
create table if not exists public.fid_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- =========================
-- UPDATED_AT helper
-- =========================
create or replace function public.fid_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'fid_releases','fid_species','fid_photos','fid_tips','fid_comparisons'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.fid_set_updated_at()',
      t || '_updated_at', t
    );
  end loop;
end $$;

-- =========================
-- INDEXES
-- =========================
create index if not exists fid_photos_species_idx
  on public.fid_photos(species_id);

create index if not exists fid_tips_species_scope_idx
  on public.fid_tips(species_id,scope);

create index if not exists fid_comparisons_lookup_idx
  on public.fid_comparisons(correct_species_id,wrong_species_id,scope);

create index if not exists fid_distractors_species_idx
  on public.fid_distractors(species_id);

-- =========================
-- RLS
-- =========================
alter table public.fid_releases enable row level security;
alter table public.fid_species enable row level security;
alter table public.fid_tags enable row level security;
alter table public.fid_photos enable row level security;
alter table public.fid_photo_tags enable row level security;
alter table public.fid_tips enable row level security;
alter table public.fid_comparisons enable row level security;
alter table public.fid_distractors enable row level security;
alter table public.fid_admins enable row level security;

create or replace function public.fid_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.fid_admins
    where user_id = auth.uid()
  );
$$;

-- Drop/recreate only FID policies so this migration is rerunnable.
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and tablename like 'fid_%'
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Public READ access to active/published game content.
create policy "fid releases public read"
on public.fid_releases for select
to anon, authenticated
using (status='published' or public.fid_is_admin());

create policy "fid species public read"
on public.fid_species for select
to anon, authenticated
using (is_active or public.fid_is_admin());

create policy "fid tags public read"
on public.fid_tags for select
to anon, authenticated
using (true);

create policy "fid photos public read"
on public.fid_photos for select
to anon, authenticated
using (is_active or public.fid_is_admin());

create policy "fid photo tags public read"
on public.fid_photo_tags for select
to anon, authenticated
using (true);

create policy "fid tips public read"
on public.fid_tips for select
to anon, authenticated
using (is_active or public.fid_is_admin());

create policy "fid comparisons public read"
on public.fid_comparisons for select
to anon, authenticated
using (is_active or public.fid_is_admin());

create policy "fid distractors public read"
on public.fid_distractors for select
to anon, authenticated
using (true);

create policy "fid admins self read"
on public.fid_admins for select
to authenticated
using (user_id=auth.uid());

-- Admin write policies.
create policy "fid releases admin write"
on public.fid_releases for all
to authenticated
using (public.fid_is_admin())
with check (public.fid_is_admin());

create policy "fid species admin write"
on public.fid_species for all
to authenticated
using (public.fid_is_admin())
with check (public.fid_is_admin());

create policy "fid tags admin write"
on public.fid_tags for all
to authenticated
using (public.fid_is_admin())
with check (public.fid_is_admin());

create policy "fid photos admin write"
on public.fid_photos for all
to authenticated
using (public.fid_is_admin())
with check (public.fid_is_admin());

create policy "fid photo tags admin write"
on public.fid_photo_tags for all
to authenticated
using (public.fid_is_admin())
with check (public.fid_is_admin());

create policy "fid tips admin write"
on public.fid_tips for all
to authenticated
using (public.fid_is_admin())
with check (public.fid_is_admin());

create policy "fid comparisons admin write"
on public.fid_comparisons for all
to authenticated
using (public.fid_is_admin())
with check (public.fid_is_admin());

create policy "fid distractors admin write"
on public.fid_distractors for all
to authenticated
using (public.fid_is_admin())
with check (public.fid_is_admin());

-- Grants for browser client.
grant select on public.fid_releases, public.fid_species, public.fid_tags,
  public.fid_photos, public.fid_photo_tags, public.fid_tips,
  public.fid_comparisons, public.fid_distractors
to anon, authenticated;

grant insert, update, delete on public.fid_releases, public.fid_species,
  public.fid_tags, public.fid_photos, public.fid_photo_tags,
  public.fid_tips, public.fid_comparisons, public.fid_distractors
to authenticated;

-- =========================
-- STORAGE
-- =========================
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'field-id-content',
  'field-id-content',
  true,
  15728640,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

-- Public photo reading.
drop policy if exists "fid storage public read" on storage.objects;
create policy "fid storage public read"
on storage.objects for select
to public
using (bucket_id='field-id-content');

-- Only CMS admins may upload/change/delete.
drop policy if exists "fid storage admin insert" on storage.objects;
create policy "fid storage admin insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id='field-id-content'
  and public.fid_is_admin()
);

drop policy if exists "fid storage admin update" on storage.objects;
create policy "fid storage admin update"
on storage.objects for update
to authenticated
using (
  bucket_id='field-id-content'
  and public.fid_is_admin()
)
with check (
  bucket_id='field-id-content'
  and public.fid_is_admin()
);

drop policy if exists "fid storage admin delete" on storage.objects;
create policy "fid storage admin delete"
on storage.objects for delete
to authenticated
using (
  bucket_id='field-id-content'
  and public.fid_is_admin()
);

-- Seed current and upcoming releases.
insert into public.fid_releases(version,title,release_date,status)
values
 ('7.0','The Ryes Before the Fall','2026-09-01','draft'),
 ('7.5','Oak My Goodness','2026-09-15','draft'),
 ('8.0','Winter Is Coming','2026-10-01','draft')
on conflict(version) do nothing;

