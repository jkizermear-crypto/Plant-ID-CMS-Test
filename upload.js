import {$,$$,esc,slugify} from './utils.js';
import {supabase} from './supabase.js';
import {uploadImage} from './storage.js';
import {STORAGE_BUCKET} from './config.js';

export function renderUploadPage(state,onRefresh){
  const opts=state.species.filter(x=>x.is_active).map(s=>`<option value="${s.id}">${esc(s.common_name)}</option>`).join('');
  $('#page').innerHTML=`<div class="card"><h2>Bulk Photo Upload</h2><p class="muted">Upload many images to one species at once and apply initial tags to the whole batch.</p><div id="upMsg"></div>${workingReleaseNotice(state)}
  <label>Species</label><select id="upSpecies" class="field"><option value="">Choose species...</option>${opts}</select>
  <label>Photos</label><input id="upFiles" class="field" type="file" accept="image/jpeg,image/png,image/webp" multiple>
  <label>Initial tags</label><div class="checks">${state.tags.map(t=>`<label class="check"><input type="checkbox" name="upTag" value="${t.id}">${esc(t.label)}</label>`).join('')}</div>
  <label>Display orientation</label><select id="upOrientation" class="field"><option value="0">Normal</option><option value="90">90° clockwise</option><option value="180">180°</option><option value="270">90° counterclockwise</option></select>
  <div id="upPreview" class="preview-list" style="margin-top:14px"></div><button id="upGo" class="primary" style="margin-top:14px">Upload Batch</button></div>`;
  $('#upFiles').onchange=()=>previewFiles();
  $('#upGo').onclick=()=>uploadBatch(state,onRefresh);
}
function previewFiles(){
  const files=[...$('#upFiles').files];
  $('#upPreview').innerHTML=files.map((f,i)=>`<div class="preview"><img id="pv${i}"><div class="small">${esc(f.name)}</div></div>`).join('');
  files.forEach((f,i)=>{const r=new FileReader();r.onload=()=>{$(`#pv${i}`).src=r.result};r.readAsDataURL(f)});
}
async function uploadBatch(state,onRefresh){
  const speciesId=$('#upSpecies').value, files=[...$('#upFiles').files], orientation=Number($('#upOrientation').value);
  const tagIds=$$('input[name=upTag]:checked').map(x=>x.value);
  if(!speciesId){$('#upMsg').innerHTML='<div class="error">Choose a species.</div>';return}
  if(!files.length){$('#upMsg').innerHTML='<div class="error">Choose at least one photo.</div>';return}
  const sp=state.species.find(x=>x.id===speciesId);$('#upGo').disabled=true;
  for(let i=0;i<files.length;i++){
    const file=files[i], safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    const path=`species/${slugify(sp.common_name)}/${crypto.randomUUID()}-${safe}`;
    $('#upMsg').innerHTML=`<div class="ok">Uploading ${i+1} of ${files.length}: ${esc(file.name)}</div>`;
    const u=await uploadImage(path,file); if(u.error){$('#upMsg').innerHTML=`<div class="error">${esc(u.error.message)}</div>`;$('#upGo').disabled=false;return}
    const rel=workingRelease(state);
    const releaseMeta=rel?{release_id:rel.id,publish_status:rel.status==='published'?'published':'draft'}:{};
    const p=await supabase.from('fid_photos').insert({species_id:speciesId,storage_path:path,original_filename:file.name,orientation_degrees:orientation,is_active:true,...releaseMeta}).select('id').single();
    if(p.error){await supabase.storage.from(STORAGE_BUCKET).remove([path]);$('#upMsg').innerHTML=`<div class="error">${esc(p.error.message)}</div>`;$('#upGo').disabled=false;return}
    if(tagIds.length){
      const l=await supabase.from('fid_photo_tags').insert(tagIds.map(tag_id=>({photo_id:p.data.id,tag_id})));
      if(l.error){$('#upMsg').innerHTML=`<div class="error">${esc(l.error.message)}</div>`;$('#upGo').disabled=false;return}
    }
  }
  $('#upMsg').innerHTML=`<div class="ok"><b>Done.</b> Uploaded ${files.length} photos.</div>`;$('#upGo').disabled=false;await onRefresh();
}

function workingRelease(state){return (state.releases||[]).find(r=>r.id===state.workingReleaseId)||null}
function workingReleaseNotice(state){const r=workingRelease(state);return r?`<div class="ok"><b>Working release:</b> ${esc(r.version)} — ${esc(r.title)} (${esc(r.status)}). New photos will be saved as ${r.status==='published'?'published':'draft'}.</div>`:''}
