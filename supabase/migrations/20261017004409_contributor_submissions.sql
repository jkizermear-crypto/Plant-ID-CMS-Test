-- Apply as the database owner. This adds a separate, private submission queue.
begin;
create schema if not exists fid_private;
revoke all on schema fid_private from public, anon, authenticated;
grant usage on schema fid_private to authenticated;
alter table public.fid_species add column if not exists accepts_contributions boolean not null default true;
alter table public.fid_species add column if not exists contribution_only boolean not null default false;
alter table public.fid_photos add column if not exists contributor_credit text;
alter table public.fid_tips add column if not exists contributor_credit text;

create or replace function fid_private.is_contribution_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.fid_admins where user_id = auth.uid());
$$;
revoke all on function fid_private.is_contribution_admin() from public, anon, authenticated;
grant execute on function fid_private.is_contribution_admin() to authenticated;

-- Avoid name variants when admins add placeholders; leave any historic data intact.
create or replace function fid_private.species_name_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare normalized text;
begin
 normalized := lower(regexp_replace(btrim(new.common_name),'\s+',' ','g'));
 if normalized = '' then raise exception 'A common name is required.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(normalized,0));
 if exists(select 1 from public.fid_species s where
    lower(regexp_replace(btrim(s.common_name),'\s+',' ','g'))=normalized and s.id<>new.id)
 then raise exception 'That species name already exists. Select its existing record.'; end if;
 new.common_name := regexp_replace(btrim(new.common_name),'\s+',' ','g');
 return new;
end; $$;
drop trigger if exists fid_species_name_guard on public.fid_species;
create trigger fid_species_name_guard before insert or update of common_name on public.fid_species
for each row execute function fid_private.species_name_guard();

create table if not exists public.fid_contributor_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(char_length(btrim(display_name)) between 1 and 80),
 created_at timestamptz not null default now()
);
create table if not exists public.fid_submissions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id),
 species_id uuid not null references public.fid_species(id),
 kind text not null check(kind in ('photo','tip')),
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 credit_name text not null check(char_length(btrim(credit_name)) between 1 and 80),
 storage_path text unique,
 original_filename text,
 orientation_degrees integer not null default 0 check(orientation_degrees in (0,90,180,270)),
 tag_ids uuid[] not null default '{}',
 scope text not null default 'general' check(scope in ('general','stage')),
 stage_tag_id uuid references public.fid_tags(id),
 body text check(char_length(body) between 1 and 6000),
 memory_text text check(char_length(memory_text)<=1000),
 source_name text check(char_length(source_name)<=300),
 source_url text check(char_length(source_url)<=2000 and source_url ~ '^https?://'),
 rights_confirmed boolean not null default false,
 review_note text check(char_length(review_note)<=2000),
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 approved_photo_id uuid references public.fid_photos(id),
 approved_tip_id uuid references public.fid_tips(id),
 created_at timestamptz not null default now(),
 check((kind='photo' and storage_path is not null and rights_confirmed)
    or (kind='tip' and storage_path is null and body is not null and char_length(btrim(body))>0
     and ((scope='general' and stage_tag_id is null) or (scope='stage' and stage_tag_id is not null))))
);
create index if not exists fid_submissions_queue on public.fid_submissions(status,created_at);
create index if not exists fid_submissions_user on public.fid_submissions(user_id,created_at);
create index if not exists fid_submissions_species on public.fid_submissions(species_id);
create index if not exists fid_submissions_stage on public.fid_submissions(stage_tag_id);
create index if not exists fid_submissions_reviewer on public.fid_submissions(reviewed_by);
create index if not exists fid_submissions_photo on public.fid_submissions(approved_photo_id);
create index if not exists fid_submissions_tip on public.fid_submissions(approved_tip_id);
alter table public.fid_contributor_profiles enable row level security;
alter table public.fid_submissions enable row level security;
-- Contributors can only create pending rows. They have no update/delete grant.
revoke all on public.fid_contributor_profiles, public.fid_submissions from anon, authenticated;
grant select,insert,update on public.fid_contributor_profiles to authenticated;
grant select,insert on public.fid_submissions to authenticated;
drop policy if exists contributor_profile_read on public.fid_contributor_profiles;
create policy contributor_profile_read on public.fid_contributor_profiles for select to authenticated
 using(user_id=(select auth.uid()) or (select fid_private.is_contribution_admin()));
drop policy if exists contributor_profile_insert on public.fid_contributor_profiles;
create policy contributor_profile_insert on public.fid_contributor_profiles for insert to authenticated
 with check(user_id=(select auth.uid()));
drop policy if exists contributor_profile_update on public.fid_contributor_profiles;
create policy contributor_profile_update on public.fid_contributor_profiles for update to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists contributor_submission_read on public.fid_submissions;
create policy contributor_submission_read on public.fid_submissions for select to authenticated
 using(user_id=(select auth.uid()) or (select fid_private.is_contribution_admin()));
create or replace function fid_private.accepting_contributions(p_species_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists(select 1 from public.fid_species where id=p_species_id and accepts_contributions);
$$;
revoke all on function fid_private.accepting_contributions(uuid) from public, anon, authenticated;
grant execute on function fid_private.accepting_contributions(uuid) to authenticated;
drop policy if exists contributor_submission_insert on public.fid_submissions;
create policy contributor_submission_insert on public.fid_submissions for insert to authenticated
 with check(user_id=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null
 and review_note is null and approved_photo_id is null and approved_tip_id is null
 and exists(select 1 from public.fid_contributor_profiles p where p.user_id=auth.uid() and p.display_name=credit_name)
 and fid_private.accepting_contributions(species_id)
 and (kind='tip' or storage_path=auth.uid()::text||'/'||id::text||'.jpg'
  or storage_path=auth.uid()::text||'/'||id::text||'.png'
  or storage_path=auth.uid()::text||'/'||id::text||'.webp'));
create or replace function fid_private.validate_submission() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if new.kind='photo' and not exists(select 1 from storage.objects where bucket_id='field-id-submissions' and name=new.storage_path) then
  raise exception 'Upload the photo before submitting it.';
 end if;
 if new.kind='tip' and exists(select 1 from public.fid_tips t where t.species_id=new.species_id and t.is_active and t.scope=new.scope
   and (new.scope='general' or t.stage_tag_id=new.stage_tag_id)) then
  raise exception 'That ID tip already exists. Choose a missing tip.';
 end if;
 return new;
end; $$;
drop trigger if exists fid_validate_submission on public.fid_submissions;
create trigger fid_validate_submission before insert on public.fid_submissions for each row execute function fid_private.validate_submission();
-- The catalog RPC exposes only names and contribution needs, including unpublished placeholders.
create or replace function public.fid_contribution_catalog() returns table(
 id uuid, common_name text, scientific_name text, contribution_only boolean,
 has_general_tip boolean, tip_stage_ids uuid[])
language sql stable security definer set search_path = '' as $$
 select s.id,s.common_name,s.scientific_name,s.contribution_only,
 exists(select 1 from public.fid_tips t where t.species_id=s.id and t.is_active and t.scope='general'),
 array(select distinct t.stage_tag_id from public.fid_tips t where t.species_id=s.id and t.is_active and t.scope='stage')
 from public.fid_species s where s.accepts_contributions and auth.uid() is not null order by s.common_name;
$$;
revoke all on function public.fid_contribution_catalog() from public, anon, authenticated;
grant execute on function public.fid_contribution_catalog() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('field-id-submissions','field-id-submissions',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists contributor_photo_upload on storage.objects;
create policy contributor_photo_upload on storage.objects for insert to authenticated
 with check(bucket_id='field-id-submissions' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists contributor_photo_read on storage.objects;
create policy contributor_photo_read on storage.objects for select to authenticated
 using(bucket_id='field-id-submissions' and ((storage.foldername(name))[1]=auth.uid()::text or (select fid_private.is_contribution_admin())));
drop policy if exists contributor_orphan_cleanup on storage.objects;
create policy contributor_orphan_cleanup on storage.objects for delete to authenticated
 using(bucket_id='field-id-submissions' and (storage.foldername(name))[1]=auth.uid()::text
 and not exists(select 1 from public.fid_submissions s where s.storage_path=name));
drop policy if exists contribution_approved_photo_upload on storage.objects;
create policy contribution_approved_photo_upload on storage.objects for insert to authenticated
 with check(bucket_id='field-id-content' and (storage.foldername(name))[1]='contributions' and (select fid_private.is_contribution_admin()));
drop policy if exists contribution_approved_photo_cleanup on storage.objects;
create policy contribution_approved_photo_cleanup on storage.objects for delete to authenticated
 using(bucket_id='field-id-content' and (storage.foldername(name))[1]='contributions' and (select fid_private.is_contribution_admin()));

-- A single transaction creates the approved record and records the decision.
-- FOR UPDATE makes double-clicks / concurrent approvals idempotent.
create or replace function public.fid_review_submission(
 p_id uuid, p_approve boolean, p_note text default null, p_body text default null,
 p_memory text default null, p_public_path text default null)
returns public.fid_submissions language plpgsql security definer set search_path = '' as $$
declare s public.fid_submissions; sp public.fid_species; new_id uuid; published text;
begin
 if not fid_private.is_contribution_admin() then raise exception 'Administrator access required.'; end if;
 select * into s from public.fid_submissions where id=p_id for update;
 if not found then raise exception 'Submission not found.'; end if;
 if s.status<>'pending' then return s; end if;
 if p_approve then
  select * into sp from public.fid_species where id=s.species_id;
  published:=case when not sp.contribution_only and sp.is_active and coalesce(sp.publish_status,'published')='published' then 'published' else 'draft' end;
  if s.kind='photo' then
   if p_public_path is null or p_public_path<>('contributions/'||s.id::text||'.'||split_part(s.storage_path,'.',2)) then
    raise exception 'Invalid approved photo path.';
   end if;
   if not exists(select 1 from storage.objects where bucket_id='field-id-content' and name=p_public_path) then
    raise exception 'Upload the approved photo first.';
   end if;
   insert into public.fid_photos(species_id,storage_path,original_filename,orientation_degrees,is_active,release_id,publish_status,contributor_credit,photographer,license_code,attribution_text)
   values(s.species_id,p_public_path,s.original_filename,s.orientation_degrees,true,sp.release_id,published,s.credit_name,s.credit_name,'permission','Used with contributor permission. Contribution from '||s.credit_name) returning id into new_id;
   insert into public.fid_photo_tags(photo_id,tag_id) select new_id,t.id from public.fid_tags t where t.id=any(s.tag_ids);
   s.approved_photo_id:=new_id;
  else
   if exists(select 1 from public.fid_tips t where t.species_id=s.species_id and t.is_active and t.scope=s.scope
    and (s.scope='general' or t.stage_tag_id=s.stage_tag_id)) then raise exception 'This species already has that tip. Review it in ID Cards first.'; end if;
   insert into public.fid_tips(species_id,scope,stage_tag_id,body,memory_text,source_name,source_url,is_active,release_id,publish_status,contributor_credit)
   values(s.species_id,s.scope,s.stage_tag_id,coalesce(nullif(btrim(p_body),''),s.body),coalesce(p_memory,s.memory_text),s.source_name,s.source_url,true,sp.release_id,published,s.credit_name) returning id into new_id;
   s.approved_tip_id:=new_id;
  end if;
 end if;
 update public.fid_submissions set status=case when p_approve then 'approved' else 'rejected' end,
  review_note=nullif(btrim(p_note),''),reviewed_by=auth.uid(),reviewed_at=now(),
  approved_photo_id=s.approved_photo_id,approved_tip_id=s.approved_tip_id where id=p_id returning * into s;
 return s;
end; $$;
revoke all on function public.fid_review_submission(uuid,boolean,text,text,text,text) from public, anon, authenticated;
grant execute on function public.fid_review_submission(uuid,boolean,text,text,text,text) to authenticated;

-- Publishing a placeholder is a separate, intentional admin action.
create or replace function public.fid_publish_contributor_species(p_species_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
 if not fid_private.is_contribution_admin() then raise exception 'Administrator access required.'; end if;
 perform 1 from public.fid_species where id=p_species_id and contribution_only for update;
 if not found then raise exception 'Choose a contribution-only species.'; end if;
 if not exists(select 1 from public.fid_photos where species_id=p_species_id and is_active) then
  raise exception 'Approve at least one photo before publishing this species.';
 end if;
 update public.fid_photos set publish_status='published' where species_id=p_species_id and is_active;
 update public.fid_tips set publish_status='published' where species_id=p_species_id and is_active;
 update public.fid_species set contribution_only=false,is_active=true,publish_status='published' where id=p_species_id;
end; $$;
revoke all on function public.fid_publish_contributor_species(uuid) from public, anon, authenticated;
grant execute on function public.fid_publish_contributor_species(uuid) to authenticated;
commit;
