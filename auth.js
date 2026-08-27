import {supabase} from './supabase.js';
export async function getSession(){return (await supabase.auth.getSession()).data.session}
export async function login(email,password){return supabase.auth.signInWithPassword({email,password})}
export async function logout(){return supabase.auth.signOut()}
export async function requireAdmin(uid){
  return supabase.from('fid_admins').select('display_name').eq('user_id',uid).maybeSingle();
}
