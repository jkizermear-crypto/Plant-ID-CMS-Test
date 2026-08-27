import {$,$$,esc,rotateStyle} from './utils.js';
import {publicUrl,removeImages} from './storage.js';
import {updatePhoto,deletePhotoRow,replacePhotoTags,addTags,removeTags,bulkUpdatePhotos} from './data.js';

let selected=new Set();

export function renderPhotosPage(state,onRefresh){
  const spOpts=state.species.map(s=>`<option value="${s.id}">${esc(s.common_name)}</option>`).join('');
  $('#page').innerHTML=`<div class="card"><div class="row"><div class="grow"><h2 style="margin-bottom:4px">Photo Library</h2><div class="muted">Edit one photo or select many for bulk changes.</div></div><input id="photoSearch" class="field grow" placeholder="Search species or filename..."></div></div>
  <div id="bulkBar" class="toolbar hidden"><div class="row"><b><span id="selCount">0</span> selected</b>
  <button id="bulkTags" class="secondary">Tags</button><button id="bulkSpecies" class="secondary">Change Species</button><button id="bulkOff" class="secondary">Deactivate</button><button id="bulkOn" class="secondary">Activate</button><button id="clearSel" class="secondary">Clear</button></div></div>
  <div id="photoGrid" class="photo-grid"></div>`;
  $('#photoSearch').oninput=()=>paint(state,onRefresh);
  $('#bulkTags').onclick=()=>openBulkTags(state,onRefresh);
  $('#bulkSpecies').onclick=()=>openBulkSpecies(state,onRefresh);
  $('#bulkOff').onclick=()=>bulkStatus(false,onRefresh);
  $('#bulkOn').onclick=()=>bulkStatus(true,onRefresh);
  $('#clearSel').onclick=()=>{selected.clear();paint(state,onRefresh)};
  paint(state,onRefresh);
}
function tagsFor(p){return (p.fid_photo_tags||[]).map(x=>x.fid_tags).filter(Boolean)}
function paint(state,onRefresh){
  const q=($('#photoSearch')?.value||'').toLowerCase();
  const rows=state.photos.filter(p=>!q||(p.fid_species?.common_name||'').toLowerCase().includes(q)||(p.original_filename||'').toLowerCase().includes(q));
  $('#photoGrid').innerHTML=rows.map(p=>`<div class="photo-card ${p.is_active?'':'inactive'}">
    <input class="photo-select" type="checkbox" data-id="${p.id}" ${selected.has(p.id)?'checked':''}>
    ${p.is_active?'':'<div class="badge">Inactive</div>'}${p.publish_status?`<div class="badge">${esc(p.publish_status)}</div>`:''}
    <img src="${esc(publicUrl(p.storage_path))}" style="${rotateStyle(p.orientation_degrees)}" loading="lazy">
    <div class="photo-body"><b>${esc(p.fid_species?.common_name||'Unknown')}</b><div class="muted small">${esc(p.original_filename||p.storage_path)}</div>
    <div>${tagsFor(p).map(t=>`<span class="pill">${esc(t.label)}</span>`).join('')}</div>
    <button class="secondary editPhoto" data-id="${p.id}" style="width:100%;margin-top:7px">Edit</button></div></div>`).join('')||'<div class="muted">No photos yet.</div>';
  $$('.photo-select').forEach(c=>c.onchange=()=>{c.checked?selected.add(c.dataset.id):selected.delete(c.dataset.id);syncBulk()});
  $$('.editPhoto').forEach(b=>b.onclick=()=>openPhotoEditor(state,state.photos.find(p=>p.id===b.dataset.id),onRefresh));
  syncBulk();
}
function syncBulk(){
  const n=selected.size;$('#selCount').textContent=n;$('#bulkBar').classList.toggle('hidden',n===0);
}
function openPhotoEditor(state,p,onRefresh){
  const current=new Set(tagsFor(p).map(t=>t.id));
  const m=document.createElement('div');m.className='modal';
  m.innerHTML=`<div class="modal-card"><h2>Edit Photo</h2><div id="photoMsg"></div>${releaseEditNotice(state,p)}
  <img src="${esc(publicUrl(p.storage_path))}" style="width:100%;max-height:320px;object-fit:contain;background:#111;${rotateStyle(p.orientation_degrees)}">
  <label>Species</label><select id="peSpecies" class="field">${state.species.map(s=>`<option value="${s.id}" ${s.id===p.species_id?'selected':''}>${esc(s.common_name)}</option>`).join('')}</select>
  <label>Tags</label><div class="checks">${state.tags.map(t=>`<label class="check"><input type="checkbox" name="peTag" value="${t.id}" ${current.has(t.id)?'checked':''}>${esc(t.label)}</label>`).join('')}</div>
  <label>Orientation</label><select id="peOrientation" class="field">${[0,90,180,270].map(d=>`<option value="${d}" ${d===p.orientation_degrees?'selected':''}>${d===0?'Normal':d+'° clockwise'}</option>`).join('')}</select>
  <label>Alt text</label><input id="peAlt" class="field" value="${esc(p.alt_text||'')}">
  <label>Photographer / attribution</label><input id="pePhotographer" class="field" value="${esc(p.photographer||'')}">
  <label>Source URL</label><input id="peSource" class="field" value="${esc(p.source_url||'')}">
  <label>License code</label><input id="peLicense" class="field" value="${esc(p.license_code||'')}">
  <label class="check"><input id="peActive" type="checkbox" ${p.is_active?'checked':''}> Active in game</label>
  <div class="row" style="margin-top:16px"><button id="peSave" class="primary">Save Changes</button><button id="peCancel" class="secondary">Cancel</button><button id="peDelete" class="danger">Delete Permanently</button></div></div>`;
  document.body.appendChild(m);
  $('#peCancel',m).onclick=()=>m.remove();
  $('#peSave',m).onclick=async()=>{
    const payload={species_id:$('#peSpecies',m).value,orientation_degrees:Number($('#peOrientation',m).value),alt_text:$('#peAlt',m).value.trim()||null,photographer:$('#pePhotographer',m).value.trim()||null,source_url:$('#peSource',m).value.trim()||null,license_code:$('#peLicense',m).value.trim()||null,is_active:$('#peActive',m).checked};
    const a=await updatePhoto(p.id,payload);if(a.error){$('#photoMsg',m).innerHTML=`<div class="error">${esc(a.error.message)}</div>`;return}
    const ids=$$('input[name=peTag]:checked',m).map(x=>x.value);const b=await replacePhotoTags(p.id,ids);if(b.error){$('#photoMsg',m).innerHTML=`<div class="error">${esc(b.error.message)}</div>`;return}
    m.remove();await onRefresh();
  };
  $('#peDelete',m).onclick=async()=>{
    if(!confirm(`Permanently delete this photo?\n\n${p.original_filename||p.storage_path}\n\nThis removes it from both the database and Storage.`))return;
    const s=await removeImages([p.storage_path]);if(s.error){$('#photoMsg',m).innerHTML=`<div class="error">${esc(s.error.message)}</div>`;return}
    const d=await deletePhotoRow(p.id);if(d.error){$('#photoMsg',m).innerHTML=`<div class="error">${esc(d.error.message)}</div>`;return}
    selected.delete(p.id);m.remove();await onRefresh();
  };
}
function openBulkTags(state,onRefresh){
  const m=document.createElement('div');m.className='modal';
  m.innerHTML=`<div class="modal-card"><h2>Bulk Tags</h2><p>${selected.size} photos selected.</p><div class="checks">${state.tags.map(t=>`<label class="check"><input type="checkbox" name="bt" value="${t.id}">${esc(t.label)}</label>`).join('')}</div>
  <div id="btMsg"></div><div class="row" style="margin-top:16px"><button id="btAdd" class="primary">Add Selected Tags</button><button id="btRemove" class="secondary">Remove Selected Tags</button><button id="btCancel" class="secondary">Cancel</button></div></div>`;
  document.body.appendChild(m);$('#btCancel',m).onclick=()=>m.remove();
  async function go(kind){const ids=$$('input[name=bt]:checked',m).map(x=>x.value);if(!ids.length){$('#btMsg',m).innerHTML='<div class="error">Choose at least one tag.</div>';return}
    const r=kind==='add'?await addTags([...selected],ids):await removeTags([...selected],ids);if(r.error){$('#btMsg',m).innerHTML=`<div class="error">${esc(r.error.message)}</div>`;return}m.remove();await onRefresh();}
  $('#btAdd',m).onclick=()=>go('add');$('#btRemove',m).onclick=()=>go('remove');
}
function openBulkSpecies(state,onRefresh){
  const m=document.createElement('div');m.className='modal';
  m.innerHTML=`<div class="modal-card"><h2>Change Species</h2><p>Move ${selected.size} selected photos to:</p><select id="bsSpecies" class="field">${state.species.map(s=>`<option value="${s.id}">${esc(s.common_name)}</option>`).join('')}</select><div class="row" style="margin-top:16px"><button id="bsGo" class="primary">Move Photos</button><button id="bsCancel" class="secondary">Cancel</button></div></div>`;
  document.body.appendChild(m);$('#bsCancel',m).onclick=()=>m.remove();$('#bsGo',m).onclick=async()=>{const r=await bulkUpdatePhotos([...selected],{species_id:$('#bsSpecies',m).value});if(r.error){alert(r.error.message);return}m.remove();await onRefresh()};
}
async function bulkStatus(active,onRefresh){const r=await bulkUpdatePhotos([...selected],{is_active:active});if(r.error){alert(r.error.message);return}await onRefresh()}

function workingRelease(state){return (state.releases||[]).find(r=>r.id===state.workingReleaseId)||null}
function releaseEditNotice(state,p){const r=workingRelease(state);if(p?.publish_status==='published'&&r?.status==='draft')return `<div class="error"><b>Live photo:</b> Editing this published photo changes live content immediately. New uploads to ${esc(r.version)} will be draft-safe.</div>`;return ''}
