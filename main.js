import './styles.css';
import {$,$$,esc} from './utils.js';
import {supabase} from './supabase.js';
import {getSession,login,logout,requireAdmin} from './auth.js';
import {loadSpecies,loadTags,loadPhotos,loadTips,loadComparisons,loadDistractors,loadReleases,loadReleaseCounts} from './data.js';
import {renderSpeciesPage} from './species.js';
import {renderPhotosPage} from './photos.js';
import {renderUploadPage} from './upload.js';
import {renderTipsPage,renderComparisonsPage,renderDistractorsPage,renderPreviewPage} from './learning.js';
import {renderReleaseBannerPage,renderReleaseManagerPage} from './release.js';

let state={session:null,admin:null,species:[],tags:[],photos:[],tips:[],comparisons:[],distractors:[],releases:[],releaseCounts:[],workingReleaseId:null,view:'dashboard'};

async function init(){
  state.session=await getSession();
  if(state.session){const a=await requireAdmin(state.session.user.id);state.admin=a.data||null}
  render();
  supabase.auth.onAuthStateChange(async(_e,s)=>{state.session=s;state.admin=null;if(s){const a=await requireAdmin(s.user.id);state.admin=a.data||null}render()});
  window.addEventListener('fid-working-release-changed',()=>{renderShell();});
}
function render(){if(!state.session)return renderLogin();if(!state.admin)return renderDenied();renderShell();refreshAll()}
function renderLogin(){
  $('#app').innerHTML=`<div class="login card"><h1>Field ID Challenge CMS</h1><p class="muted">v0.5 • Release Manager Test</p><div id="loginMsg"></div><label>Email</label><input id="email" class="field" type="email"><label>Password</label><input id="pw" class="field" type="password"><button id="login" class="primary" style="width:100%;margin-top:14px">Sign In</button></div>`;
  $('#login').onclick=async()=>{const r=await login($('#email').value.trim(),$('#pw').value);if(r.error)$('#loginMsg').innerHTML=`<div class="error">${esc(r.error.message)}</div>`};
}
function renderDenied(){$('#app').innerHTML=`<div class="login card"><h2>Not authorized</h2><p>This account is authenticated but is not a Field ID CMS administrator.</p><button id="out" class="secondary">Sign Out</button></div>`;$('#out').onclick=logout}
function renderShell(){
  const wr=state.releases.find(r=>r.id===state.workingReleaseId);
  $('#app').innerHTML=`<div class="shell"><header class="topbar"><div class="brand"><b>Field ID Challenge CMS</b><span>v0.5 • ${esc(state.admin.display_name||'Admin')} • ${wr?`Working on ${esc(wr.version)} (${esc(wr.status||'draft')})`:'Loading release...'}</span></div><button id="logout" class="secondary">Sign Out</button></header>
  <main class="wrap">
    ${state.releases.length?`<div class="card" style="padding:12px 14px"><div class="row"><div class="grow"><b>Working release</b><div class="small muted">This selection is saved on this device.</div></div><select id="globalRelease" class="field" style="max-width:360px">${state.releases.map(r=>`<option value="${r.id}" ${r.id===state.workingReleaseId?'selected':''}>${esc(r.version)} — ${esc(r.title||'Untitled')} [${esc(r.status||'draft')}]</option>`).join('')}</select></div></div>`:''}
    <div class="tabs"><button class="tab active" data-view="dashboard">Dashboard</button><button class="tab" data-view="releases">Releases</button><button class="tab" data-view="species">Species</button><button class="tab" data-view="photos">Photos</button><button class="tab" data-view="upload">Bulk Upload</button><button class="tab" data-view="tips">ID Cards</button><button class="tab" data-view="comparisons">Comparisons</button><button class="tab" data-view="distractors">Distractors</button><button class="tab" data-view="preview">Preview</button><button class="tab" data-view="release">Release Banner</button></div><div id="page"></div></main></div>`;
  $('#logout').onclick=logout;
  const gr=$('#globalRelease');if(gr)gr.onchange=()=>{state.workingReleaseId=gr.value;localStorage.setItem('fid_cms_working_release',gr.value);renderShell()};
  $$('.tab').forEach(b=>b.onclick=()=>setView(b.dataset.view));setView(state.view);
}
async function refreshAll(){
  const [s,t,p,ti,co,di,re,rc]=await Promise.all([loadSpecies(),loadTags(),loadPhotos(),loadTips(),loadComparisons(),loadDistractors(),loadReleases(),loadReleaseCounts()]);
  const err=s.error||t.error||p.error||ti.error||co.error||di.error||re.error||rc.error;
  if(err){$('#page').innerHTML=`<div class="error">${esc(err.message)}</div>`;return}
  state.species=s.data||[];state.tags=t.data||[];state.photos=p.data||[];state.tips=ti.data||[];state.comparisons=co.data||[];state.distractors=di.data||[];state.releases=re.data||[];state.releaseCounts=rc.data||[];
  const saved=localStorage.getItem('fid_cms_working_release');
  if(!state.workingReleaseId||!state.releases.some(r=>r.id===state.workingReleaseId)) state.workingReleaseId=(saved&&state.releases.some(r=>r.id===saved))?saved:(state.releases.find(r=>r.status==='draft')?.id||state.releases.find(r=>r.status==='published')?.id||state.releases[0]?.id||null);
  renderShell();
}
function setView(v){
  state.view=v;$$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  if(v==='dashboard')renderDashboard();
  if(v==='releases')renderReleaseManagerPage(state,refreshAll);
  if(v==='species')renderSpeciesPage(state,refreshAll);
  if(v==='photos')renderPhotosPage(state,refreshAll);
  if(v==='upload')renderUploadPage(state,refreshAll);
  if(v==='tips')renderTipsPage(state,refreshAll);
  if(v==='comparisons')renderComparisonsPage(state,refreshAll);
  if(v==='distractors')renderDistractorsPage(state,refreshAll);
  if(v==='preview')renderPreviewPage(state);
  if(v==='release')renderReleaseBannerPage(state,refreshAll);
}
function renderDashboard(){
  const wr=state.releases.find(r=>r.id===state.workingReleaseId);
  const c=state.releaseCounts.find(x=>x.release_id===state.workingReleaseId)||{};
  $('#page').innerHTML=`<div class="card"><h2>CMS Dashboard</h2>${wr?`<div class="ok" style="margin-bottom:14px"><b>Working release: ${esc(wr.version)} — ${esc(wr.title||'')}</b><br><span class="small">Status: ${esc(wr.status||'draft')}</span></div>`:''}<div class="grid"><div class="stat"><b>${state.species.filter(x=>x.is_active).length}</b>active species total</div><div class="stat"><b>${state.photos.filter(x=>x.is_active).length}</b>active photos total</div><div class="stat"><b>${c.species_count??0}</b>species assigned to this release</div><div class="stat"><b>${c.photo_count??0}</b>photos assigned to this release</div></div></div>
  <div class="card"><h3>Phase 2</h3><p>Release selection and release status management are active. Production draft filtering is not active until Phase 3.</p></div>`;
}
init();
