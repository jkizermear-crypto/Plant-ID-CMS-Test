import './styles.css';
import {$,$$,esc} from './utils.js';
import {renderContributorPortal,renderReviewPage} from './contribute.js';
import {supabase} from './supabase.js';
import {getSession,login,logout,requireAdmin} from './auth.js';
import {loadSpecies,loadTags,loadPhotos,loadTips,loadComparisons,loadDistractors,loadReleases} from './data.js';
import {renderSpeciesPage} from './species.js';
import {renderPhotosPage} from './photos.js';
import {renderUploadPage} from './upload.js';
import {renderTipsPage,renderComparisonsPage,renderDistractorsPage,renderPreviewPage} from './learning.js';
import {renderReleaseBannerPage,renderReleasesPage} from './release.js';

let state={session:null,admin:null,species:[],tags:[],photos:[],tips:[],comparisons:[],distractors:[],releases:[],workingReleaseId:localStorage.getItem('fid_working_release')||null,view:'dashboard'};

const contributorMode=new URLSearchParams(location.search).has('contribute');
let authVersion=0;
async function applySession(session){
  const version=++authVersion;state.session=session;state.admin=null;
  if(session){
    const result=await requireAdmin(session.user.id);
    if(version!==authVersion)return;
    state.admin=result.data||null;
  }
  if(!session)return renderLogin();
  if(contributorMode||!state.admin)return renderContributorPortal(session);
  renderShell();await refreshAll();
}
async function init(){
  await applySession(await getSession());
  supabase.auth.onAuthStateChange((event,session)=>{
    // Supabase auth callbacks must finish before issuing another Supabase request.
    if(event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED')return;
    setTimeout(()=>{applySession(session).catch(showFatal)},0);
  });
}
function showFatal(error){$('#app').innerHTML=`<div class="login card error">${esc(error.message||'Could not load your workspace.')}</div>`}
function renderLogin(){
 $('#app').innerHTML=`<div class="login card"><span class="pill">Thistle Be Fun</span><h1>${contributorMode?'Help the field guide grow':'Field ID workspace'}</h1><p class="muted">Sign in to contribute photos and missing ID tips. All submissions need Dean’s approval.</p><form id="authForm"><div id="loginMsg" role="status"></div><label for="email">Email</label><input id="email" class="field" type="email" autocomplete="email" required><label for="pw">Password</label><input id="pw" class="field" type="password" autocomplete="current-password" required><div id="signupFields" hidden><label for="signupName">Public credit name</label><input id="signupName" class="field" maxlength="80" autocomplete="nickname"><p class="small muted">Shown below your approved photos as “Contribution from …”.</p></div><button id="login" class="primary" style="width:100%;margin-top:14px">Sign In</button><button id="toggleSignup" type="button" class="secondary" style="width:100%;margin-top:10px">Create a contributor account</button></form></div>`;
 let signup=false;
 $('#toggleSignup').onclick=()=>{signup=!signup;$('#signupFields').hidden=!signup;$('#signupName').required=signup;$('#pw').autocomplete=signup?'new-password':'current-password';$('#pw').minLength=signup?8:1;$('#login').textContent=signup?'Create Account':'Sign In';$('#toggleSignup').textContent=signup?'Already registered? Sign in':'Create a contributor account';$('#loginMsg').textContent='';};
 $('#authForm').onsubmit=async event=>{
  event.preventDefault();const button=$('#login');button.disabled=true;
  try{
   const email=$('#email').value.trim(),password=$('#pw').value;
   const result=signup?await supabase.auth.signUp({email,password,options:{data:{display_name:$('#signupName').value.trim()},emailRedirectTo:location.origin+'/?contribute=1'}}):await login(email,password);
   if(result.error)throw result.error;
   if(signup&&!result.data.session)$('#loginMsg').innerHTML='<div class="ok">Check your email to confirm your account, then return here to sign in.</div>';
  }catch(e){if($('#loginMsg'))$('#loginMsg').innerHTML=`<div class="error">${esc(e.message)}</div>`}
  finally{if(button.isConnected)button.disabled=false}
 };
}
function renderShell(){
  $('#app').innerHTML=`<div class="shell"><header class="topbar"><div class="brand"><b>Field ID Challenge CMS</b><span>Release-aware CMS • ${esc(state.admin.display_name||'Admin')} • Test Environment</span></div><div class="row"><a class="secondary" href="?contribute=1">Contributor portal</a><button id="logout" class="secondary">Sign Out</button></div></header>
  <main class="wrap"><div id="workingReleaseBar" class="card" style="margin-top:12px"></div><div class="tabs"><button class="tab active" data-view="dashboard">Dashboard</button><button class="tab" data-view="releases">Releases</button><button class="tab" data-view="species">Species</button><button class="tab" data-view="submissions">Submissions</button><button class="tab" data-view="photos">Photos</button><button class="tab" data-view="upload">Bulk Upload</button><button class="tab" data-view="tips">ID Cards</button><button class="tab" data-view="comparisons">Comparisons</button><button class="tab" data-view="distractors">Distractors</button><button class="tab" data-view="preview">Preview</button><button class="tab" data-view="release">Release Banner</button></div><div id="page"></div></main></div>`;
  $('#logout').onclick=logout;$$('.tab').forEach(b=>b.onclick=()=>setView(b.dataset.view));setView(state.view);
}
async function refreshAll(){
  const [s,t,p,ti,co,di,re]=await Promise.all([loadSpecies(),loadTags(),loadPhotos(),loadTips(),loadComparisons(),loadDistractors(),loadReleases()]);
  const err=s.error||t.error||p.error||ti.error||co.error||di.error||re.error;if(err){$('#page').innerHTML=`<div class="error">${err.message}</div>`;return}
  state.species=s.data||[];state.tags=t.data||[];state.photos=p.data||[];state.tips=ti.data||[];state.comparisons=co.data||[];state.distractors=di.data||[];state.releases=re.data||[];
  if(!state.workingReleaseId||!state.releases.some(r=>r.id===state.workingReleaseId)){
    state.workingReleaseId=(state.releases.find(r=>r.status==='draft')||state.releases.find(r=>r.status==='published')||state.releases[0])?.id||null;
    if(state.workingReleaseId)localStorage.setItem('fid_working_release',state.workingReleaseId);
  }
  renderWorkingReleaseBar();setView(state.view);
}
function renderWorkingReleaseBar(){
  const box=$('#workingReleaseBar');if(!box)return;
  const r=state.releases.find(x=>x.id===state.workingReleaseId);
  box.innerHTML=`<div class="row"><div class="grow"><div class="small muted">Working Release</div><b>${r?`${r.version} — ${r.title}`:'No release selected'}</b>${r?` <span class="pill">${r.status}</span>`:''}<div class="small muted" style="margin-top:4px">New CMS records are stamped to this release. Contribution-only species stay out of the game until you publish them from Species.</div></div><select id="workingReleaseSelect" class="field" style="max-width:280px">${state.releases.map(x=>`<option value="${x.id}" ${x.id===state.workingReleaseId?'selected':''}>${x.version} — ${x.title} (${x.status})</option>`).join('')}</select></div>`;
  $('#workingReleaseSelect').onchange=()=>{state.workingReleaseId=$('#workingReleaseSelect').value;localStorage.setItem('fid_working_release',state.workingReleaseId);renderWorkingReleaseBar();setView(state.view);};
}
function setView(v){state.view=v;$$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===v));if(v==='dashboard')renderDashboard();if(v==='submissions')renderReviewPage(state,refreshAll);if(v==='releases')renderReleasesPage(state,refreshAll);if(v==='species')renderSpeciesPage(state,refreshAll);if(v==='photos')renderPhotosPage(state,refreshAll);if(v==='upload')renderUploadPage(state,refreshAll);if(v==='tips')renderTipsPage(state,refreshAll);if(v==='comparisons')renderComparisonsPage(state,refreshAll);if(v==='distractors')renderDistractorsPage(state,refreshAll);if(v==='preview')renderPreviewPage(state);if(v==='release')renderReleaseBannerPage(state,refreshAll);}
function renderDashboard(){const r=state.releases.find(x=>x.id===state.workingReleaseId);const rel=id=>id===state.workingReleaseId;$('#page').innerHTML=`<div class="card"><h2>CMS Dashboard</h2><p class="muted">Working release: <b>${r?`${r.version} — ${r.title}`:'None'}</b></p><div class="grid"><div class="stat"><b>${state.species.filter(x=>rel(x.release_id)).length}</b>species in release</div><div class="stat"><b>${state.photos.filter(x=>rel(x.release_id)).length}</b>photos in release</div><div class="stat"><b>${state.tips.filter(x=>rel(x.release_id)).length}</b>ID cards in release</div><div class="stat"><b>${state.comparisons.filter(x=>rel(x.release_id)).length}</b>comparisons in release</div></div></div><div class="card"><h3>Draft safety</h3><p>New species, uploaded photos, new ID cards, new comparisons, and saved distractor sets are now stamped to the selected Working Release. Existing published records are still live if edited; the CMS will warn you about that until full versioned editing is added.</p></div>`;}
init().catch(showFatal);
