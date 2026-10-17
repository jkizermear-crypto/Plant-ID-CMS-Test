-- Keep submitter contribution credit separate from the original CC0 photographer.
begin;
alter table public.fid_submissions add column if not exists photo_origin text not null default 'own';
alter table public.fid_submissions drop constraint if exists fid_submission_photo_origin;
alter table public.fid_submissions add constraint fid_submission_photo_origin check(photo_origin in ('own','inaturalist_cc0'));
alter table public.fid_submissions drop constraint if exists fid_submission_inat_source;
alter table public.fid_submissions add constraint fid_submission_inat_source check(
 kind<>'photo' or photo_origin='own' or (
  source_url is not null and source_url ~ '^https://(www\.)?inaturalist\.org/(observations|photos)/[0-9]+/?([?#].*)?$'
  and nullif(btrim(source_name),'') is not null
  and rights_confirmed
 ));
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
   insert into public.fid_photos(species_id,storage_path,original_filename,orientation_degrees,is_active,release_id,publish_status,contributor_credit,photographer,license_code,attribution_text,source_url)
   values(s.species_id,p_public_path,s.original_filename,s.orientation_degrees,true,sp.release_id,published,s.credit_name,
    case when s.photo_origin='inaturalist_cc0' then s.source_name else s.credit_name end,
    case when s.photo_origin='inaturalist_cc0' then 'CC0-1.0' else 'permission' end,
    case when s.photo_origin='inaturalist_cc0' then 'Photo by '||s.source_name||' (CC0). Contribution from '||s.credit_name
     else 'Used with contributor permission. Contribution from '||s.credit_name end,
    case when s.photo_origin='inaturalist_cc0' then s.source_url else null end) returning id into new_id;
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

commit;
