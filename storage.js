import {supabase} from './supabase.js';
import {STORAGE_BUCKET} from './config.js';
export function publicUrl(path){return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl}
export async function uploadImage(path,file){return supabase.storage.from(STORAGE_BUCKET).upload(path,file,{upsert:false,contentType:file.type})}
export async function removeImages(paths){return supabase.storage.from(STORAGE_BUCKET).remove(paths)}
