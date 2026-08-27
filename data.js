import {supabase} from './supabase.js';
export async function loadSpecies(){return supabase.from('fid_species').select('*').order('common_name')}
export async function saveSpecies(payload,id=null){
  return id?supabase.from('fid_species').update(payload).eq('id',id):supabase.from('fid_species').insert(payload);
}
export async function loadTags(){return supabase.from('fid_tags').select('*').order('sort_order')}
export async function loadPhotos(){
  return supabase.from('fid_photos')
    .select('*,fid_species(common_name),fid_photo_tags(tag_id,fid_tags(id,slug,label))')
    .order('created_at',{ascending:false});
}
export async function updatePhoto(id,payload){return supabase.from('fid_photos').update(payload).eq('id',id)}
export async function deletePhotoRow(id){return supabase.from('fid_photos').delete().eq('id',id)}
export async function replacePhotoTags(photoId,tagIds){
  const d=await supabase.from('fid_photo_tags').delete().eq('photo_id',photoId);
  if(d.error)return d;
  if(!tagIds.length)return {error:null};
  return supabase.from('fid_photo_tags').insert(tagIds.map(tag_id=>({photo_id:photoId,tag_id})));
}
export async function addTags(photoIds,tagIds){
  if(!photoIds.length||!tagIds.length)return {error:null};
  const rows=[];
  for(const photo_id of photoIds)for(const tag_id of tagIds)rows.push({photo_id,tag_id});
  return supabase.from('fid_photo_tags').upsert(rows,{onConflict:'photo_id,tag_id',ignoreDuplicates:true});
}
export async function removeTags(photoIds,tagIds){
  if(!photoIds.length||!tagIds.length)return {error:null};
  return supabase.from('fid_photo_tags').delete().in('photo_id',photoIds).in('tag_id',tagIds);
}
export async function bulkUpdatePhotos(ids,payload){
  if(!ids.length)return {error:null};
  return supabase.from('fid_photos').update(payload).in('id',ids);
}


export async function loadTips(){
  return supabase.from('fid_tips')
    .select('*,fid_species(common_name),fid_tags(slug,label),fid_photos(original_filename,storage_path)')
    .order('created_at',{ascending:false});
}
export async function saveTip(payload,id=null){
  return id ? supabase.from('fid_tips').update(payload).eq('id',id)
            : supabase.from('fid_tips').insert(payload);
}
export async function deleteTip(id){
  return supabase.from('fid_tips').delete().eq('id',id);
}

export async function loadComparisons(){
  return supabase.from('fid_comparisons')
    .select('*,correct:fid_species!fid_comparisons_correct_species_id_fkey(common_name),wrong:fid_species!fid_comparisons_wrong_species_id_fkey(common_name),stage_tag:fid_tags!fid_comparisons_stage_tag_id_fkey(id,slug,label),fid_photos(original_filename,storage_path),required_tags:fid_comparison_required_tags(tag_id,fid_tags(id,slug,label))')
    .order('created_at',{ascending:false});
}
export async function saveComparison(payload,id=null){
  return id ? supabase.from('fid_comparisons').update(payload).eq('id',id)
            : supabase.from('fid_comparisons').insert(payload);
}
export async function deleteComparison(id){
  return supabase.from('fid_comparisons').delete().eq('id',id);
}

export async function loadDistractors(){
  return supabase.from('fid_distractor_options')
    .select('id,species_id,distractor_species_id,distractor_label,sort_order,species:fid_species!fid_distractor_options_species_id_fkey(common_name),distractor:fid_species!fid_distractor_options_distractor_species_id_fkey(common_name)')
    .order('sort_order');
}
export async function replaceDistractors(speciesId,distractorIds,labelOnly=[]){
  const d=await supabase.from('fid_distractor_options').delete().eq('species_id',speciesId);
  if(d.error)return d;
  const rows=[
    ...distractorIds.map((id,i)=>({species_id:speciesId,distractor_species_id:id,distractor_label:null,sort_order:i})),
    ...labelOnly.filter(Boolean).map((label,i)=>({species_id:speciesId,distractor_species_id:null,distractor_label:label,sort_order:distractorIds.length+i}))
  ];
  if(!rows.length)return {error:null};
  return supabase.from('fid_distractor_options').insert(rows);
}


export async function loadReleases(){
  return supabase.from('fid_releases').select('*').order('release_date',{ascending:false});
}
export async function saveReleaseBanner(id,payload){
  return supabase.from('fid_releases').update(payload).eq('id',id);
}
