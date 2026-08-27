
import {$,$$,esc} from './utils.js';
import {
  saveTip,deleteTip,saveComparison,deleteComparison,replaceDistractors
} from './data.js';
import {publicUrl} from './storage.js';

function scopeFields(scope,state,current={}){
  if(scope==='stage'){
    return `<label>Stage / visible feature</label>
      <select id="scopeTag" class="field">
        <option value="">Choose tag...</option>
        ${state.tags.map(t=>`<option value="${t.id}" ${current.stage_tag_id===t.id?'selected':''}>${esc(t.label)}</option>`).join('')}
      </select>`;
  }
  if(scope==='photo'){
    const photos=state.photos.filter(p=>p.species_id===current.species_id || !current.species_id);
    return `<label>Exact photo</label>
      <select id="scopePhoto" class="field">
        <option value="">Choose photo...</option>
        ${photos.map(p=>`<option value="${p.id}" ${current.photo_id===p.id?'selected':''}>${esc(p.original_filename||p.storage_path)}</option>`).join('')}
      </select>`;
  }
  return '';
}

export function renderTipsPage(state,onRefresh){
  const page=$('#page');
  page.innerHTML=`
    <div class="card">
      <div class="row">
        <div class="grow"><h2 style="margin-bottom:4px">ID Cards</h2>
        <div class="muted">General, stage-specific, and exact-photo teaching cards.</div></div>
        <button id="addTip" class="primary">+ Add ID Card</button>
      </div>
    </div>
    <div class="card">
      <input id="tipSearch" class="field" placeholder="Search species or card text...">
      <div id="tipList" class="list" style="margin-top:12px"></div>
    </div>`;
  $('#addTip').onclick=()=>openTipModal(state,null,onRefresh);
  $('#tipSearch').oninput=()=>paintTips(state,onRefresh);
  paintTips(state,onRefresh);
}

function paintTips(state,onRefresh){
  const q=($('#tipSearch')?.value||'').toLowerCase();
  const rows=state.tips.filter(t=>{
    const hay=[t.fid_species?.common_name,t.scope,t.body,t.memory_text,t.fid_tags?.label,t.fid_photos?.original_filename].join(' ').toLowerCase();
    return !q||hay.includes(q);
  });
  $('#tipList').innerHTML=rows.map(t=>`
    <div class="item">
      <div class="item-main">
        <b>${esc(t.fid_species?.common_name||'Unknown')}</b>
        <div class="small muted">${esc(t.scope)}${t.fid_tags?.label?' • '+esc(t.fid_tags.label):''}${t.fid_photos?.original_filename?' • '+esc(t.fid_photos.original_filename):''}</div>
        <div style="margin-top:6px">${esc(t.body.slice(0,150))}${t.body.length>150?'…':''}</div>
      </div>
      <div class="row"><button class="secondary editTip" data-id="${t.id}">Edit</button></div>
    </div>`).join('')||'<div class="muted">No ID cards yet.</div>';
  $$('.editTip').forEach(b=>b.onclick=()=>openTipModal(state,state.tips.find(t=>t.id===b.dataset.id),onRefresh));
}

function openTipModal(state,tip,onRefresh){
  const m=document.createElement('div');m.className='modal';
  const sp=tip?.species_id||state.species[0]?.id||'';
  const scope=tip?.scope||'general';
  m.innerHTML=`<div class="modal-card">
    <h2>${tip?'Edit':'Add'} ID Card</h2><div id="tipMsg"></div>
    <label>Species</label><select id="tipSpecies" class="field">
      ${state.species.map(s=>`<option value="${s.id}" ${s.id===sp?'selected':''}>${esc(s.common_name)}</option>`).join('')}
    </select>
    <label>Card type</label><select id="tipScope" class="field">
      <option value="general" ${scope==='general'?'selected':''}>General</option>
      <option value="stage" ${scope==='stage'?'selected':''}>Stage-specific</option>
      <option value="photo" ${scope==='photo'?'selected':''}>Exact photo</option>
    </select>
    <div id="tipScopeFields"></div>
    <label>ID text</label><textarea id="tipBody" class="field">${esc(tip?.body||'')}</textarea>
    <label>Remember it</label><textarea id="tipMemory" class="field">${esc(tip?.memory_text||'')}</textarea>
    <label>Source name</label><input id="tipSourceName" class="field" value="${esc(tip?.source_name||'')}">
    <label>Source URL</label><input id="tipSourceUrl" class="field" value="${esc(tip?.source_url||'')}">
    <label class="check"><input id="tipActive" type="checkbox" ${tip?.is_active===false?'':'checked'}> Active</label>
    <div class="row" style="margin-top:16px">
      <button id="tipSave" class="primary">Save</button>
      <button id="tipPreview" class="secondary">Preview</button>
      <button id="tipCancel" class="secondary">Cancel</button>
      ${tip?'<button id="tipDelete" class="danger">Delete</button>':''}
    </div>
    <div id="tipPreviewBox" style="margin-top:14px"></div>
  </div>`;
  document.body.appendChild(m);

  function repaintScope(){
    const cur={
      species_id:$('#tipSpecies',m).value,
      stage_tag_id:tip?.stage_tag_id||null,
      photo_id:tip?.photo_id||null
    };
    $('#tipScopeFields',m).innerHTML=scopeFields($('#tipScope',m).value,state,cur);
  }
  $('#tipScope',m).onchange=repaintScope;
  $('#tipSpecies',m).onchange=repaintScope;
  repaintScope();

  $('#tipCancel',m).onclick=()=>m.remove();
  $('#tipPreview',m).onclick=()=> {
    $('#tipPreviewBox',m).innerHTML=previewCard(
      state.species.find(s=>s.id===$('#tipSpecies',m).value)?.common_name||'Species',
      $('#tipBody',m).value,
      $('#tipMemory',m).value,
      $('#tipSourceName',m).value
    );
  };
  $('#tipSave',m).onclick=async()=>{
    const sc=$('#tipScope',m).value;
    const payload={
      species_id:$('#tipSpecies',m).value,
      scope:sc,
      stage_tag_id:sc==='stage'?($('#scopeTag',m)?.value||null):null,
      photo_id:sc==='photo'?($('#scopePhoto',m)?.value||null):null,
      body:$('#tipBody',m).value.trim(),
      memory_text:$('#tipMemory',m).value.trim()||null,
      source_name:$('#tipSourceName',m).value.trim()||null,
      source_url:$('#tipSourceUrl',m).value.trim()||null,
      is_active:$('#tipActive',m).checked
    };
    if(!payload.body){$('#tipMsg',m).innerHTML='<div class="error">ID text is required.</div>';return}
    if(sc==='stage'&&!payload.stage_tag_id){$('#tipMsg',m).innerHTML='<div class="error">Choose a stage tag.</div>';return}
    if(sc==='photo'&&!payload.photo_id){$('#tipMsg',m).innerHTML='<div class="error">Choose a photo.</div>';return}
    if(!tip){Object.assign(payload,newRecordReleaseMeta(state));}
    const r=await saveTip(payload,tip?.id||null);
    if(r.error){$('#tipMsg',m).innerHTML=`<div class="error">${esc(r.error.message)}</div>`;return}
    m.remove();await onRefresh();
  };
  if(tip)$('#tipDelete',m).onclick=async()=>{
    if(!confirm('Delete this ID card?'))return;
    const r=await deleteTip(tip.id);if(r.error){$('#tipMsg',m).innerHTML=`<div class="error">${esc(r.error.message)}</div>`;return}
    m.remove();await onRefresh();
  };
}

export function renderComparisonsPage(state,onRefresh){
  $('#page').innerHTML=`
    <div class="card"><div class="row"><div class="grow"><h2 style="margin-bottom:4px">Comparison Cards</h2>
    <div class="muted">Teach the difference when a player chooses a plausible wrong answer.</div></div>
    <button id="addCmp" class="primary">+ Add Comparison</button></div></div>
    <div class="card"><input id="cmpSearch" class="field" placeholder="Search correct species, wrong species, or text...">
    <div id="cmpList" class="list" style="margin-top:12px"></div></div>`;
  $('#addCmp').onclick=()=>openComparisonModal(state,null,onRefresh);
  $('#cmpSearch').oninput=()=>paintComparisons(state,onRefresh);
  paintComparisons(state,onRefresh);
}

function paintComparisons(state,onRefresh){
  const q=($('#cmpSearch')?.value||'').toLowerCase();
  const rows=state.comparisons.filter(c=>{
    const hay=[c.correct?.common_name,c.wrong?.common_name,c.scope,c.body,c.memory_text,c.stage_tag?.label].join(' ').toLowerCase();
    return !q||hay.includes(q);
  });
  $('#cmpList').innerHTML=rows.map(c=>`
    <div class="item"><div class="item-main">
      <b>${esc(c.correct?.common_name||'?')} → guessed ${esc(c.wrong?.common_name||'?')}</b>
      <div class="small muted">${esc(c.scope)}${c.stage_tag?.label?' • '+esc(c.stage_tag.label):''}</div>
      <div style="margin-top:6px">${esc(c.body.slice(0,150))}${c.body.length>150?'…':''}</div>
    </div><button class="secondary editCmp" data-id="${c.id}">Edit</button></div>`).join('')||'<div class="muted">No comparisons yet.</div>';
  $$('.editCmp').forEach(b=>b.onclick=()=>openComparisonModal(state,state.comparisons.find(c=>c.id===b.dataset.id),onRefresh));
}

function openComparisonModal(state,c,onRefresh){
  const m=document.createElement('div');m.className='modal';
  const correct=c?.correct_species_id||state.species[0]?.id||'';
  const wrong=c?.wrong_species_id||state.species.find(s=>s.id!==correct)?.id||'';
  const scope=c?.scope||'general';
  m.innerHTML=`<div class="modal-card"><h2>${c?'Edit':'Add'} Comparison</h2><div id="cmpMsg"></div>
    <label>Correct species</label><select id="cmpCorrect" class="field">${state.species.map(s=>`<option value="${s.id}" ${s.id===correct?'selected':''}>${esc(s.common_name)}</option>`).join('')}</select>
    <label>Wrong guess</label><select id="cmpWrong" class="field">${state.species.map(s=>`<option value="${s.id}" ${s.id===wrong?'selected':''}>${esc(s.common_name)}</option>`).join('')}</select>
    <label>Comparison type</label><select id="cmpScope" class="field">
      <option value="general" ${scope==='general'?'selected':''}>General</option>
      <option value="stage" ${scope==='stage'?'selected':''}>Stage-specific</option>
      <option value="photo" ${scope==='photo'?'selected':''}>Exact photo</option>
    </select>
    <div id="cmpScopeFields"></div>
    <label>Comparison text</label><textarea id="cmpBody" class="field">${esc(c?.body||'')}</textarea>
    <label>Remember it</label><textarea id="cmpMemory" class="field">${esc(c?.memory_text||'')}</textarea>
    <label>Source name</label><input id="cmpSourceName" class="field" value="${esc(c?.source_name||'')}">
    <label>Source URL</label><input id="cmpSourceUrl" class="field" value="${esc(c?.source_url||'')}">
    <label class="check"><input id="cmpActive" type="checkbox" ${c?.is_active===false?'':'checked'}> Active</label>
    <div class="row" style="margin-top:16px"><button id="cmpSave" class="primary">Save</button><button id="cmpPreview" class="secondary">Preview</button><button id="cmpCancel" class="secondary">Cancel</button>${c?'<button id="cmpDelete" class="danger">Delete</button>':''}</div>
    <div id="cmpPreviewBox" style="margin-top:14px"></div></div>`;
  document.body.appendChild(m);

  function repaint(){
    const fake={species_id:$('#cmpCorrect',m).value,stage_tag_id:c?.stage_tag_id||null,photo_id:c?.photo_id||null};
    $('#cmpScopeFields',m).innerHTML=scopeFields($('#cmpScope',m).value,state,fake);
  }
  $('#cmpScope',m).onchange=repaint;$('#cmpCorrect',m).onchange=repaint;repaint();
  $('#cmpCancel',m).onclick=()=>m.remove();
  $('#cmpPreview',m).onclick=()=>{
    const correctName=state.species.find(s=>s.id===$('#cmpCorrect',m).value)?.common_name||'Correct species';
    const wrongName=state.species.find(s=>s.id===$('#cmpWrong',m).value)?.common_name||'Wrong guess';
    $('#cmpPreviewBox',m).innerHTML=previewCard(correctName,$('#cmpBody',m).value,$('#cmpMemory',m).value,$('#cmpSourceName',m).value,wrongName);
  };
  $('#cmpSave',m).onclick=async()=>{
    const sc=$('#cmpScope',m).value;
    const payload={
      correct_species_id:$('#cmpCorrect',m).value,
      wrong_species_id:$('#cmpWrong',m).value,
      scope:sc,
      stage_tag_id:sc==='stage'?($('#scopeTag',m)?.value||null):null,
      photo_id:sc==='photo'?($('#scopePhoto',m)?.value||null):null,
      body:$('#cmpBody',m).value.trim(),
      memory_text:$('#cmpMemory',m).value.trim()||null,
      source_name:$('#cmpSourceName',m).value.trim()||null,
      source_url:$('#cmpSourceUrl',m).value.trim()||null,
      is_active:$('#cmpActive',m).checked
    };
    if(payload.correct_species_id===payload.wrong_species_id){$('#cmpMsg',m).innerHTML='<div class="error">Correct species and wrong guess cannot be the same.</div>';return}
    if(!payload.body){$('#cmpMsg',m).innerHTML='<div class="error">Comparison text is required.</div>';return}
    if(sc==='stage'&&!payload.stage_tag_id){$('#cmpMsg',m).innerHTML='<div class="error">Choose a stage tag.</div>';return}
    if(sc==='photo'&&!payload.photo_id){$('#cmpMsg',m).innerHTML='<div class="error">Choose a photo.</div>';return}
    if(!c){Object.assign(payload,newRecordReleaseMeta(state));}
    const r=await saveComparison(payload,c?.id||null);
    if(r.error){$('#cmpMsg',m).innerHTML=`<div class="error">${esc(r.error.message)}</div>`;return}
    m.remove();await onRefresh();
  };
  if(c)$('#cmpDelete',m).onclick=async()=>{
    if(!confirm('Delete this comparison card?'))return;
    const r=await deleteComparison(c.id);if(r.error){$('#cmpMsg',m).innerHTML=`<div class="error">${esc(r.error.message)}</div>`;return}
    m.remove();await onRefresh();
  };
}

export function renderDistractorsPage(state,onRefresh){
  $('#page').innerHTML=`
    <div class="card"><h2>Distractors</h2><p class="muted">Choose playable wrong answers and preserve useful look-alike labels that are not playable species.</p>
    <label>Species</label><select id="distSpecies" class="field">
      ${state.species.map(s=>`<option value="${s.id}">${esc(s.common_name)}</option>`).join('')}
    </select></div>
    <div class="card">
      <h3>Playable-species distractors</h3><div id="distList"></div>
      <label>Additional label-only look-alikes</label>
      <textarea id="distLabels" class="field" placeholder="One look-alike per line"></textarea>
      <div class="small muted">Use this for useful wrong-answer names that are not species currently playable in the game.</div>
      <button id="saveDist" class="primary" style="margin-top:14px">Save Distractors</button>
      <div id="distMsg" style="margin-top:10px"></div>
    </div>`;
  $('#distSpecies').onchange=()=>paintDistractors(state);
  $('#saveDist').onclick=()=>saveDistractorsUI(state,onRefresh);
  paintDistractors(state);
}
function paintDistractors(state){
  const sid=$('#distSpecies').value;
  const rows=state.distractors.filter(d=>d.species_id===sid);
  const current=new Set(rows.filter(d=>d.distractor_species_id).map(d=>d.distractor_species_id));
  const labels=rows.filter(d=>d.distractor_label).map(d=>d.distractor_label);
  $('#distList').innerHTML=`<div class="checks">${state.species.filter(s=>s.id!==sid).map(s=>`
    <label class="check"><input type="checkbox" name="dist" value="${s.id}" ${current.has(s.id)?'checked':''}>${esc(s.common_name)}</label>`).join('')}</div>`;
  $('#distLabels').value=labels.join('\\n');
}
async function saveDistractorsUI(state,onRefresh){
  const sid=$('#distSpecies').value;
  const ids=$$('input[name=dist]:checked').map(x=>x.value);
  const labels=$('#distLabels').value.split(/\\r?\\n/).map(x=>x.trim()).filter(Boolean);
  const r=await replaceDistractors(sid,ids,labels,newRecordReleaseMeta(state));
  if(r.error){$('#distMsg').innerHTML=`<div class="error">${esc(r.error.message)}</div>`;return}
  $('#distMsg').innerHTML='<div class="ok">Distractors saved.</div>';await onRefresh();
}

export function renderPreviewPage(state){
  const spOpts=state.species.map(s=>`<option value="${s.id}">${esc(s.common_name)}</option>`).join('');
  $('#page').innerHTML=`<div class="card"><h2>Player Preview</h2><p class="muted">Preview the active teaching content for one species.</p>
  <label>Species</label><select id="prevSpecies" class="field">${spOpts}</select></div>
  <div id="prevContent"></div>`;
  $('#prevSpecies').onchange=()=>paintPreview(state);
  paintPreview(state);
}
function paintPreview(state){
  const sid=$('#prevSpecies').value;
  const sp=state.species.find(s=>s.id===sid);
  const tips=state.tips.filter(t=>t.species_id===sid&&t.is_active);
  const cmps=state.comparisons.filter(c=>c.correct_species_id===sid&&c.is_active);
  const photos=state.photos.filter(p=>p.species_id===sid&&p.is_active);
  $('#prevContent').innerHTML=`
    <div class="card"><h3>${esc(sp?.common_name||'')}</h3><div class="muted">${photos.length} active photos • ${tips.length} active ID cards • ${cmps.length} active comparisons</div></div>
    ${tips.map(t=>`<div class="card">${previewCard(sp.common_name,t.body,t.memory_text,t.source_name)}</div>`).join('')}
    ${cmps.map(c=>`<div class="card">${previewCard(sp.common_name,c.body,c.memory_text,c.source_name,c.wrong?.common_name)}</div>`).join('')}
  `;
}
function previewCard(title,body,memory,source,wrong=''){
  return `<div style="border:1px solid #d9e2dc;border-radius:14px;padding:16px;background:#fff">
    <div class="small muted">${wrong?`You chose: <b>${esc(wrong)}</b>`:'Practice tip'}</div>
    <h3 style="margin:5px 0 10px">${esc(title)}</h3>
    <div style="line-height:1.5">${esc(body||'')}</div>
    ${memory?`<div style="margin-top:12px;background:#edf4ef;border-radius:12px;padding:12px;font-weight:800">Remember it: ${esc(memory)}</div>`:''}
    ${source?`<div class="small muted" style="margin-top:10px">Source: ${esc(source)}</div>`:''}
  </div>`;
}

function workingRelease(state){return (state.releases||[]).find(r=>r.id===state.workingReleaseId)||null}
function newRecordReleaseMeta(state){const r=workingRelease(state);return r?{release_id:r.id,publish_status:r.status==='published'?'published':'draft'}:{};}
