import {$,esc} from './utils.js';
import {
  saveReleaseBanner,
  saveRelease,
  loadReleaseCounts,
  createRelease,
  publishRelease
} from './data.js';

export async function renderReleasesPage(state,onRefresh){
  $('#page').innerHTML=`
    <div class="card">
      <div class="row">
        <div class="grow">
          <h2 style="margin-bottom:4px">Releases</h2>
          <p class="muted" style="margin:0">
            Create future versions, choose a Working Release, and publish an entire release at once.
          </p>
        </div>
        <button id="newRelease" class="primary">+ Create Release</button>
      </div>
      <div id="releaseCounts" style="margin-top:12px">Loading…</div>
    </div>

    <div class="card">
      <div id="releaseCards"></div>
    </div>
  `;

  $('#newRelease').onclick=()=>openCreateReleaseModal(state,onRefresh);

  const c=await loadReleaseCounts();
  const counts=new Map((c.data||[]).map(x=>[x.release_id,x]));

  $('#releaseCounts').innerHTML=c.error
    ? `<div class="error">${esc(c.error.message)}</div>`
    : `<div class="small muted">
         Draft releases stay out of the normal game until you deliberately publish them.
       </div>`;

  const releases=[...(state.releases||[])];

  $('#releaseCards').innerHTML=releases.map(r=>{
    const n=counts.get(r.id)||{};
    const isWorking=r.id===state.workingReleaseId;
    const status=r.status||'draft';

    return `
      <div class="item">
        <div class="item-main">
          <div>
            <b>${esc(r.version)} — ${esc(r.title)}</b>
            <span class="pill">${esc(status)}</span>
          </div>

          <div class="small muted" style="margin-top:5px">
            ${n.species_count||0} species •
            ${n.photo_count||0} photos •
            ${n.tip_count||0} ID cards •
            ${n.comparison_count||0} comparisons •
            ${n.distractor_count||0} distractors
          </div>

          ${r.published_at
            ? `<div class="small muted" style="margin-top:4px">
                 Published ${esc(new Date(r.published_at).toLocaleString())}
               </div>`
            : ''}

          ${isWorking
            ? '<div class="ok" style="margin-top:7px">Current Working Release</div>'
            : ''}
        </div>

        <button class="secondary editRelease" data-id="${r.id}">Manage</button>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.editRelease').forEach(b=>{
    b.onclick=()=>openReleaseModal(
      state,
      state.releases.find(r=>r.id===b.dataset.id),
      onRefresh
    );
  });
}

function openCreateReleaseModal(state,onRefresh){
  const m=document.createElement('div');
  m.className='modal';

  m.innerHTML=`
    <div class="modal-card">
      <h2>Create New Release</h2>
      <p class="muted">
        The new release will start as Draft and will immediately become available in the Working Release selector.
      </p>

      <div id="createRelMsg"></div>

      <label>Version</label>
      <input id="newVersion" class="field" placeholder="Example: 8.0">

      <label>Release name</label>
      <input id="newTitle" class="field" placeholder="Example: Winter is Coming">

      <div class="row" style="margin-top:16px">
        <button id="createRel" class="primary">Create Draft Release</button>
        <button id="cancelCreateRel" class="secondary">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(m);

  $('#cancelCreateRel',m).onclick=()=>m.remove();

  $('#createRel',m).onclick=async()=>{
    const version=$('#newVersion',m).value.trim();
    const title=$('#newTitle',m).value.trim();

    if(!version||!title){
      $('#createRelMsg',m).innerHTML=
        '<div class="error">Version and release name are both required.</div>';
      return;
    }

    const btn=$('#createRel',m);
    btn.disabled=true;
    btn.textContent='Creating…';

    const x=await createRelease(version,title);

    if(x.error){
      btn.disabled=false;
      btn.textContent='Create Draft Release';
      $('#createRelMsg',m).innerHTML=
        `<div class="error">${esc(x.error.message)}</div>`;
      return;
    }

    const created=Array.isArray(x.data)?x.data[0]:x.data;
    if(created?.id){
      state.workingReleaseId=created.id;
      localStorage.setItem('fid_working_release',created.id);
    }

    m.remove();
    await onRefresh();
  };
}

function openReleaseModal(state,r,onRefresh){
  const m=document.createElement('div');
  m.className='modal';

  const status=r.status||'draft';
  const canPublish=status==='draft';

  m.innerHTML=`
    <div class="modal-card">
      <h2>${esc(r.version)} — ${esc(r.title)}</h2>

      <div style="margin-bottom:12px">
        <span class="pill">${esc(status)}</span>
        ${r.id===state.workingReleaseId
          ? '<span class="ok" style="margin-left:8px">Working Release</span>'
          : ''}
      </div>

      <div id="relMsg"></div>

      <label>Launch date/time (optional planning field)</label>
      <input
        id="relLaunch"
        class="field"
        type="datetime-local"
        value="${r.launch_at?new Date(r.launch_at).toISOString().slice(0,16):''}"
      >

      <div class="row" style="margin-top:16px">
        <button id="relSave" class="secondary">Save Date</button>
        <button id="relWork" class="secondary">Make Working Release</button>
      </div>

      ${canPublish ? `
        <div style="margin-top:20px;padding-top:18px;border-top:1px solid var(--line)">
          <h3 style="margin-bottom:5px">Ready to launch?</h3>
          <p class="muted">
            Publishing makes every Draft species, photo, ID card, comparison, and distractor assigned to this release visible to the production game.
          </p>
          <button id="relPublish" class="primary" style="width:100%">
            Publish ${esc(r.version)} — ${esc(r.title)}
          </button>
        </div>
      ` : ''}

      ${status==='published' ? `
        <div class="ok" style="margin-top:18px">
          This release is published.
        </div>
      ` : ''}

      <button id="relCancel" class="secondary" style="margin-top:16px;width:100%">
        Close
      </button>
    </div>
  `;

  document.body.appendChild(m);

  $('#relCancel',m).onclick=()=>m.remove();

  $('#relWork',m).onclick=()=>{
    state.workingReleaseId=r.id;
    localStorage.setItem('fid_working_release',r.id);
    m.remove();
    onRefresh();
  };

  $('#relSave',m).onclick=async()=>{
    const payload={
      launch_at:$('#relLaunch',m).value
        ? new Date($('#relLaunch',m).value).toISOString()
        : null
    };

    const x=await saveRelease(r.id,payload);

    if(x.error){
      $('#relMsg',m).innerHTML=
        `<div class="error">${esc(x.error.message)}</div>`;
      return;
    }

    $('#relMsg',m).innerHTML='<div class="ok">Launch date saved.</div>';
    await onRefresh();
  };

  if(canPublish){
    $('#relPublish',m).onclick=async()=>{
      const ok=confirm(
        `Publish ${r.version} — ${r.title}?\n\n`+
        `This will make all Draft content assigned to this release visible to the production game.`
      );

      if(!ok)return;

      const btn=$('#relPublish',m);
      btn.disabled=true;
      btn.textContent='Publishing…';

      const x=await publishRelease(r.id);

      if(x.error){
        btn.disabled=false;
        btn.textContent=`Publish ${r.version} — ${r.title}`;
        $('#relMsg',m).innerHTML=
          `<div class="error">${esc(x.error.message)}</div>`;
        return;
      }

      const result=Array.isArray(x.data)?x.data[0]:x.data;
      const summary=result
        ? `${result.species_published||0} species, `+
          `${result.photos_published||0} photos, `+
          `${result.tips_published||0} ID cards, `+
          `${result.comparisons_published||0} comparisons, `+
          `${result.distractors_published||0} distractors published.`
        : 'Release published successfully.';

      $('#relMsg',m).innerHTML=`<div class="ok">${esc(summary)}</div>`;

      setTimeout(async()=>{
        m.remove();
        await onRefresh();
      },700);
    };
  }
}

export function renderReleaseBannerPage(state,onRefresh){
  const releases=[...(state.releases||[])];
  const selected=
    releases.find(r=>r.id===state.workingReleaseId)||
    releases[0];

  if(!selected){
    $('#page').innerHTML=
      '<div class="card"><h2>Release Banner</h2><div class="muted">No release records found.</div></div>';
    return;
  }

  $('#page').innerHTML=`
    <div class="card">
      <h2>Release Banner</h2>
      <p class="muted">Editing banner for the current Working Release.</p>
      <div class="ok">
        <b>${esc(selected.version)} — ${esc(selected.title)}</b>
        (${esc(selected.status)})
      </div>
    </div>
    <div class="card" id="releaseEditor"></div>
  `;

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

  const sync=()=>{
    $('#prevTitle').textContent=$('#bannerTitle').value;
    $('#prevBody').textContent=$('#bannerBody').value;
    $('#prevMeta').textContent=$('#bannerMeta').value;
  };

  $('#bannerTitle').oninput=sync;
  $('#bannerBody').oninput=sync;
  $('#bannerMeta').oninput=sync;

  $('#saveBanner').onclick=async()=>{
    const payload={
      banner_enabled:$('#bannerEnabled').checked,
      banner_title:$('#bannerTitle').value.trim()||null,
      banner_body:$('#bannerBody').value.trim()||null,
      banner_meta:$('#bannerMeta').value.trim()||null
    };

    const x=await saveReleaseBanner(release.id,payload);

    if(x.error){
      $('#releaseMsg').innerHTML=
        `<div class="error">${esc(x.error.message)}</div>`;
      return;
    }

    $('#releaseMsg').innerHTML='<div class="ok">Banner saved.</div>';
    await onRefresh();
  };
}
