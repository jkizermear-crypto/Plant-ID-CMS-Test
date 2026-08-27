import {$,esc} from './utils.js';
import {saveReleaseBanner,saveReleaseSettings} from './data.js';

const statusLabel=s=>s==='published'?'Published':s==='archived'?'Archived':'Draft';
const statusTone=s=>s==='published'?'#1f5f43':s==='archived'?'#65736a':'#a66a00';

export function renderReleaseManagerPage(state,onRefresh){
  const releases=[...(state.releases||[])].sort((a,b)=>String(b.version||'').localeCompare(String(a.version||''),undefined,{numeric:true}));
  const counts=state.releaseCounts||[];
  const countFor=id=>counts.find(x=>x.release_id===id)||{};

  $('#page').innerHTML=`
    <div class="card">
      <h2 style="margin-bottom:6px">Release Manager</h2>
      <p class="muted">Choose which release you are working on and manage whether that release is Draft, Published, or Archived.</p>
      <div class="error" style="margin-top:12px"><b>Phase 2 safety note:</b> the production game does not filter draft content yet. Use this screen to organize releases, but wait for Phase 3 before adding draft content you need hidden from players.</div>
    </div>
    <div id="releaseCards"></div>`;

  $('#releaseCards').innerHTML=releases.map(r=>{
    const c=countFor(r.id);
    const working=state.workingReleaseId===r.id;
    return `<div class="card" style="border:${working?'2px solid #1f5f43':'1px solid var(--line)'}">
      <div class="row">
        <div class="grow">
          <div class="row" style="gap:8px">
            <h3 style="margin:0">${esc(r.version)} — ${esc(r.title||'Untitled release')}</h3>
            <span style="display:inline-block;padding:5px 9px;border-radius:999px;background:${statusTone(r.status)}18;color:${statusTone(r.status)};font-weight:850;font-size:.78rem">${statusLabel(r.status)}</span>
            ${working?'<span style="display:inline-block;padding:5px 9px;border-radius:999px;background:#edf4ef;color:#1f5f43;font-weight:850;font-size:.78rem">Working release</span>':''}
          </div>
          <div class="muted small" style="margin-top:8px">${c.species_count??0} species • ${c.photo_count??0} photos • ${c.tip_count??0} ID cards • ${c.comparison_count??0} comparisons • ${c.distractor_count??0} distractors</div>
        </div>
        <button class="secondary workRelease" data-id="${r.id}">${working?'Selected':'Work on this release'}</button>
      </div>
      <div class="grid" style="margin-top:14px">
        <div><label>Status</label><select class="field releaseStatus" data-id="${r.id}"><option value="draft" ${r.status==='draft'?'selected':''}>Draft</option><option value="published" ${r.status==='published'?'selected':''}>Published</option><option value="archived" ${r.status==='archived'?'selected':''}>Archived</option></select></div>
        <div><label>Launch date/time</label><input class="field releaseLaunch" data-id="${r.id}" type="datetime-local" value="${toLocalInput(r.launch_at)}"></div>
      </div>
      <div class="row" style="margin-top:14px"><button class="primary saveRelease" data-id="${r.id}">Save Release Settings</button><div class="small" id="releaseMsg-${r.id}"></div></div>
    </div>`;
  }).join('')||'<div class="card muted">No releases found.</div>';

  document.querySelectorAll('.workRelease').forEach(b=>b.onclick=()=>{
    state.workingReleaseId=b.dataset.id;
    localStorage.setItem('fid_cms_working_release',state.workingReleaseId);
    renderReleaseManagerPage(state,onRefresh);
    window.dispatchEvent(new CustomEvent('fid-working-release-changed'));
  });

  document.querySelectorAll('.saveRelease').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.id;
    const status=$(`.releaseStatus[data-id="${id}"]`).value;
    const launchRaw=$(`.releaseLaunch[data-id="${id}"]`).value;
    const msg=$(`#releaseMsg-${id}`);
    const payload={status,launch_at:launchRaw?new Date(launchRaw).toISOString():null};
    if(status==='published') payload.published_at=new Date().toISOString();
    const r=await saveReleaseSettings(id,payload);
    if(r.error){msg.innerHTML=`<span style="color:#9c2f2f">${esc(r.error.message)}</span>`;return}
    msg.innerHTML='<span style="color:#1f5f43;font-weight:800">Saved.</span>';
    await onRefresh();
  });
}

export function renderReleaseBannerPage(state,onRefresh){
  const releases=[...(state.releases||[])].sort((a,b)=>String(b.version||'').localeCompare(String(a.version||''),undefined,{numeric:true}));
  const selected=releases.find(r=>r.id===state.workingReleaseId)||releases[0];

  if(!selected){
    $('#page').innerHTML='<div class="card"><h2>Release Banner</h2><div class="muted">No release records found.</div></div>';
    return;
  }

  $('#page').innerHTML=`
    <div class="card">
      <h2>Release Banner</h2>
      <p class="muted">Edit the announcement banner belonging to a specific release.</p>
      <label>Release</label>
      <select id="releaseSelect" class="field">
        ${releases.map(r=>`<option value="${r.id}" ${r.id===selected.id?'selected':''}>${esc(r.version)} — ${esc(r.title)} [${statusLabel(r.status)}]</option>`).join('')}
      </select>
    </div>
    <div class="card" id="releaseEditor"></div>`;

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
    <div class="small muted" style="margin-bottom:12px">Release status: <b>${statusLabel(release.status)}</b></div>
    <div id="releaseMsg"></div>
    <label class="check"><input id="bannerEnabled" type="checkbox" ${release.banner_enabled?'checked':''}> Show banner in game</label>
    <label>Banner title</label><input id="bannerTitle" class="field" value="${esc(release.banner_title||'')}">
    <label>Banner body</label><textarea id="bannerBody" class="field">${esc(release.banner_body||'')}</textarea>
    <label>Banner stats / footer line</label><input id="bannerMeta" class="field" value="${esc(release.banner_meta||'')}">
    <div style="margin-top:16px"><div class="small muted" style="margin-bottom:6px">Preview</div><div class="update-banner"><div id="prevTitle" class="update-banner-title">${esc(release.banner_title||'')}</div><div id="prevBody" class="update-banner-copy">${esc(release.banner_body||'')}</div><div id="prevMeta" class="update-banner-meta">${esc(release.banner_meta||'')}</div></div></div>
    <button id="saveBanner" class="primary" style="margin-top:16px">Save Banner</button>`;

  const syncPreview=()=>{$('#prevTitle').textContent=$('#bannerTitle').value;$('#prevBody').textContent=$('#bannerBody').value;$('#prevMeta').textContent=$('#bannerMeta').value};
  $('#bannerTitle').oninput=syncPreview;$('#bannerBody').oninput=syncPreview;$('#bannerMeta').oninput=syncPreview;
  $('#saveBanner').onclick=async()=>{
    const payload={banner_enabled:$('#bannerEnabled').checked,banner_title:$('#bannerTitle').value.trim()||null,banner_body:$('#bannerBody').value.trim()||null,banner_meta:$('#bannerMeta').value.trim()||null};
    const r=await saveReleaseBanner(release.id,payload);
    if(r.error){$('#releaseMsg').innerHTML=`<div class="error">${esc(r.error.message)}</div>`;return}
    $('#releaseMsg').innerHTML='<div class="ok">Banner saved.</div>';
    await onRefresh();
  };
}

function toLocalInput(value){
  if(!value)return '';
  const d=new Date(value);if(Number.isNaN(d.getTime()))return '';
  const pad=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
