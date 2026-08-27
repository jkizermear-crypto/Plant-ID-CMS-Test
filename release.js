
import {$,esc} from './utils.js';
import {saveReleaseBanner} from './data.js';

export function renderReleaseBannerPage(state,onRefresh){
  const releases=[...(state.releases||[])].sort((a,b)=>(b.release_date||'').localeCompare(a.release_date||''));
  const selected=releases.find(r=>r.version==='7.0')||releases[0];

  if(!selected){
    $('#page').innerHTML='<div class="card"><h2>Release Banner</h2><div class="muted">No release records found.</div></div>';
    return;
  }

  $('#page').innerHTML=`
    <div class="card">
      <h2>Release Banner</h2>
      <p class="muted">This controls the announcement banner shown at the top of the game. No “seen it” tracking is required.</p>

      <label>Release</label>
      <select id="releaseSelect" class="field">
        ${releases.map(r=>`<option value="${r.id}" ${r.id===selected.id?'selected':''}>${esc(r.version)} — ${esc(r.title)}</option>`).join('')}
      </select>
    </div>

    <div class="card" id="releaseEditor"></div>
  `;

  $('#releaseSelect').onchange=()=>{
    const r=releases.find(x=>x.id===$('#releaseSelect').value);
    paintEditor(r,onRefresh);
  };
  paintEditor(selected,onRefresh);
}

function paintEditor(release,onRefresh){
  const box=$('#releaseEditor');
  box.innerHTML=`
    <h3>${esc(release.version)} Banner</h3>
    <div id="releaseMsg"></div>

    <label class="check">
      <input id="bannerEnabled" type="checkbox" ${release.banner_enabled?'checked':''}>
      Show banner in game
    </label>

    <label>Banner title</label>
    <input id="bannerTitle" class="field" value="${esc(release.banner_title||'')}">

    <label>Banner body</label>
    <textarea id="bannerBody" class="field">${esc(release.banner_body||'')}</textarea>

    <label>Banner stats / footer line</label>
    <input id="bannerMeta" class="field" value="${esc(release.banner_meta||'')}">

    <div style="margin-top:16px">
      <div class="small muted" style="margin-bottom:6px">Preview</div>
      <div class="update-banner">
        <div id="prevTitle" class="update-banner-title">${esc(release.banner_title||'')}</div>
        <div id="prevBody" class="update-banner-copy">${esc(release.banner_body||'')}</div>
        <div id="prevMeta" class="update-banner-meta">${esc(release.banner_meta||'')}</div>
      </div>
    </div>

    <button id="saveBanner" class="primary" style="margin-top:16px">Save Banner</button>
  `;

  const syncPreview=()=>{
    $('#prevTitle').textContent=$('#bannerTitle').value;
    $('#prevBody').textContent=$('#bannerBody').value;
    $('#prevMeta').textContent=$('#bannerMeta').value;
  };
  $('#bannerTitle').oninput=syncPreview;
  $('#bannerBody').oninput=syncPreview;
  $('#bannerMeta').oninput=syncPreview;

  $('#saveBanner').onclick=async()=>{
    const payload={
      banner_enabled:$('#bannerEnabled').checked,
      banner_title:$('#bannerTitle').value.trim()||null,
      banner_body:$('#bannerBody').value.trim()||null,
      banner_meta:$('#bannerMeta').value.trim()||null
    };
    const r=await saveReleaseBanner(release.id,payload);
    if(r.error){
      $('#releaseMsg').innerHTML=`<div class="error">${esc(r.error.message)}</div>`;
      return;
    }
    $('#releaseMsg').innerHTML='<div class="ok">Banner saved.</div>';
    await onRefresh();
  };
}
