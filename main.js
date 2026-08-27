import './styles.css';
import {$,$$} from './utils.js';
import {supabase} from './supabase.js';
import {getSession,login,logout,requireAdmin} from './auth.js';
import {loadSpecies,loadTags,loadPhotos,loadTips,loadComparisons,loadDistractors,loadReleases} from './data.js';
import {renderSpeciesPage} from './species.js';
import {renderPhotosPage} from './photos.js';
import {renderUploadPage} from './upload.js';
import {renderTipsPage,renderComparisonsPage,renderDistractorsPage,renderPreviewPage} from './learning.js';
import {renderReleaseBannerPage} from './release.js';

let state={session:null,admin:null,species:[],tags:[],photos:[],tips:[],comparisons:[],distractors:[],releases:[],view:'dashboard'};

async function init(){
  state.session=await getSession();
  if(state.session){const a=await requireAdmin(state.session.user.id);state.admin=a.data||null}
  render();
  supabase.auth.onAuthStateChange(async(_e,s)=>{state.session=s;state.admin=null;if(s){const a=await requireAdmin(s.user.id);state.admin=a.data||null}render()});
}
function render(){
  if(!state.session)return renderLogin();
  if(!state.admin)return renderDenied();
  renderShell();refreshAll();
}
function renderLogin(){
  $('#app').innerHTML=`<div class="login card"><h1>Field ID Challenge CMS</h1><p class="muted">MVP Test Environment</p><div id="loginMsg"></div><label>Email</label><input id="email" class="field" type="email"><label>Password</label><input id="pw" class="field" type="password"><button id="login" class="primary" style="width:100%;margin-top:14px">Sign In</button></div>`;
  $('#login').onclick=async()=>{const r=await login($('#email').value.trim(),$('#pw').value);if(r.error)$('#loginMsg').innerHTML=`<div class="error">${r.error.message}</div>`};
}
function renderDenied(){$('#app').innerHTML=`<div class="login card"><h2>Not authorized</h2><p>This account is authenticated but is not a Field ID CMS administrator.</p><button id="out" class="secondary">Sign Out</button></div>`;$('#out').onclick=logout}
function renderShell(){
  $('#app').innerHTML=`<div class="shell"><header class="topbar"><div class="brand"><b>Field ID Challenge CMS</b><span>v0.3 • ${state.admin.display_name||'Admin'} • Test Environment</span></div><button id="logout" class="secondary">Sign Out</button></header>
  <main class="wrap"><div class="tabs"><button class="tab active" data-view="dashboard">Dashboard</button><button class="tab" data-view="species">Species</button><button class="tab" data-view="photos">Photos</button><button class="tab" data-view="upload">Bulk Upload</button><button class="tab" data-view="tips">ID Cards</button><button class="tab" data-view="comparisons">Comparisons</button><button class="tab" data-view="distractors">Distractors</button><button class="tab" data-view="preview">Preview</button><button class="tab" data-view="release">Release Banner</button></div><div id="page"></div></main></div>`;
  $('#logout').onclick=logout;$$('.tab').forEach(b=>b.onclick=()=>setView(b.dataset.view));setView(state.view);
}
async function refreshAll(){
  const [s,t,p,ti,co,di,re]=await Promise.all([loadSpecies(),loadTags(),loadPhotos(),loadTips(),loadComparisons(),loadDistractors(),loadReleases()]);
  const err=s.error||t.error||p.error||ti.error||co.error||di.error||re.error;if(err){$('#page').innerHTML=`<div class="error">${err.message}</div>`;return}
  state.species=s.data||[];state.tags=t.data||[];state.photos=p.data||[];state.tips=ti.data||[];state.comparisons=co.data||[];state.distractors=di.data||[];state.releases=re.data||[];setView(state.view);
}
function setView(v){
  state.view=v;$$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  if(v==='dashboard')renderDashboard();
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
  $('#page').innerHTML=`<div class="card"><h2>CMS Dashboard</h2><p class="muted">Content management is now separated from game code.</p><div class="grid"><div class="stat"><b>${state.species.filter(x=>x.is_active).length}</b>active species</div><div class="stat"><b>${state.photos.filter(x=>x.is_active).length}</b>active photos</div><div class="stat"><b>${state.tags.length}</b>photo tags</div></div></div>
  <div class="card"><h3>v0.3 capabilities</h3><p>Everything from v0.2 plus ID cards, stage/photo-specific teaching content, comparison cards, distractors, and a player-facing preview.</p></div>`;
}
init();
