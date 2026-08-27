
import {$,$$,esc} from './utils.js';
import {saveSpecies} from './data.js';

export function renderSpeciesPage(state,onRefresh){
  const page=$('#page');
  page.innerHTML=`
    <div class="card">
      <div class="row">
        <div class="grow">
          <h2 style="margin-bottom:4px">Species</h2>
          <div class="muted">Create and edit species records.</div>
        </div>
        <button id="addSpecies" class="primary">+ Add Species</button>
      </div>
    </div>
    <div class="card">
      <div class="row">
        <input id="speciesSearch" class="field grow" placeholder="Search species...">
        <div class="small muted"><span id="speciesCount">${state.species.length}</span> species</div>
      </div>
      <div id="speciesList" class="list" style="margin-top:12px"></div>
    </div>`;

  $('#addSpecies').onclick=()=>openSpeciesModal(state,null,onRefresh);
  $('#speciesSearch').oninput=()=>paintSpeciesList(state,onRefresh);
  paintSpeciesList(state,onRefresh);
}

function paintSpeciesList(state,onRefresh){
  const list=$('#speciesList');
  if(!list) return;

  const q=($('#speciesSearch')?.value||'').trim().toLowerCase();
  const rows=[...(state.species||[])]
    .filter(sp=>{
      if(!q) return true;
      return (sp.common_name||'').toLowerCase().includes(q)
        || (sp.scientific_name||'').toLowerCase().includes(q);
    })
    .sort((a,b)=>(a.common_name||'').localeCompare(b.common_name||''));

  $('#speciesCount').textContent=rows.length;

  if(!rows.length){
    list.innerHTML='<div class="muted">No species found.</div>';
    return;
  }

  list.innerHTML=rows.map(sp=>`
    <div class="item">
      <div class="item-main">
        <b>${esc(sp.common_name||'Unnamed species')}</b>
        <div class="muted small">${esc(sp.scientific_name||'No scientific name')}</div>
        ${sp.is_active===false?'<span class="pill">Inactive</span>':''}
      </div>
      <div class="row">
        <button class="secondary editSpecies" data-id="${sp.id}">Edit</button>
      </div>
    </div>`).join('');

  $$('.editSpecies').forEach(btn=>{
    btn.onclick=()=>openSpeciesModal(
      state,
      state.species.find(sp=>sp.id===btn.dataset.id),
      onRefresh
    );
  });
}

function openSpeciesModal(state,sp,onRefresh){
  const modal=document.createElement('div');
  modal.className='modal';
  modal.innerHTML=`<div class="modal-card">
    <h2>${sp?'Edit':'Add'} Species</h2>
    <div id="spMsg"></div>
    ${releaseNotice(state,sp)}

    <label>Common name</label>
    <input id="spCommon" class="field" value="${esc(sp?.common_name||'')}">

    <label>Scientific name</label>
    <input id="spScientific" class="field" value="${esc(sp?.scientific_name||'')}">

    <label>Notes</label>
    <textarea id="spNotes" class="field">${esc(sp?.notes||'')}</textarea>

    <label class="check">
      <input id="spActive" type="checkbox" ${sp?.is_active===false?'':'checked'}>
      Active in game
    </label>

    <div class="row" style="margin-top:16px">
      <button id="spSave" class="primary">Save</button>
      <button id="spCancel" class="secondary">Cancel</button>
    </div>
  </div>`;

  document.body.appendChild(modal);

  $('#spCancel',modal).onclick=()=>modal.remove();
  $('#spSave',modal).onclick=async()=>{
    const payload={
      common_name:$('#spCommon',modal).value.trim(),
      scientific_name:$('#spScientific',modal).value.trim()||null,
      notes:$('#spNotes',modal).value.trim()||null,
      is_active:$('#spActive',modal).checked
    };
    if(!sp){Object.assign(payload,newRecordReleaseMeta(state));}

    if(!payload.common_name){
      $('#spMsg',modal).innerHTML='<div class="error">Common name is required.</div>';
      return;
    }

    const r=await saveSpecies(payload,sp?.id||null);
    if(r.error){
      $('#spMsg',modal).innerHTML=`<div class="error">${esc(r.error.message)}</div>`;
      return;
    }

    modal.remove();
    await onRefresh();
  };
}

function workingRelease(state){return (state.releases||[]).find(r=>r.id===state.workingReleaseId)||null}
function newRecordReleaseMeta(state){const r=workingRelease(state);return r?{release_id:r.id,publish_status:r.status==='published'?'published':'draft'}:{};}
function releaseNotice(state,record){const r=workingRelease(state);if(!r)return '';if(record&&record.publish_status==='published'&&r.status==='draft')return `<div class="error"><b>Live record:</b> Editing this existing published species changes live content immediately. For now, use the draft release for new species only.</div>`;return `<div class="ok"><b>Working release:</b> ${esc(r.version)} — ${esc(r.title)} (${esc(r.status)})${record?'':' • New species will be saved here.'}</div>`;}
