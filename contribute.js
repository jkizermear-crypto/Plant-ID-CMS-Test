import {$,esc} from './utils.js';
import {supabase} from './supabase.js';
import {validatePhoto,missingTip,safeUrl} from './contribution-utils.js';
const PENDING_BUCKET='field-id-submissions';
const checked=r=>{if(r.error)throw r.error;return r.data};
async function allRows(table){let out=[];for(let from=0;;from+=1000){const rows=checked(await supabase.from(table).select('*').order('created_at',{ascending:false}).range(from,from+999));out.push(...rows);if(rows.length<1000)return out}}

export async function renderContributorPortal(session){
 const app=$('#app');
 app.innerHTML=`<div class="shell"><header class="topbar"><div class="brand"><b>Thistle Be Fun</b><span>Contributor garden</span></div><button id="contributorOut" class="secondary">Sign Out</button></header><main class="wrap"><div id="contributorPage" aria-live="polite">Loading your contribution workspace…</div></main></div>`;
 $('#contributorOut').onclick=()=>supabase.auth.signOut();
 try{
  const [profile,catalog,tags,submissions]=await Promise.all([
   supabase.from('fid_contributor_profiles').select('*').eq('user_id',session.user.id).maybeSingle().then(checked),
   supabase.rpc('fid_contribution_catalog').then(checked),
   supabase.from('fid_tags').select('*').order('sort_order').then(checked),
   allRows('fid_submissions')
  ]);
  if(!document.querySelector('#contributorPage'))return;
  renderForm({session,profile,catalog,tags,submissions});
 }catch(e){if($('#contributorPage'))$('#contributorPage').innerHTML=`<div class="card error">Contributions could not load: ${esc(e.message)}. Please contact the game administrator.</div>`}
}
function renderForm(state){
 const {session,catalog,tags,submissions}=state;
 $('#contributorPage').innerHTML=`<section class="card contribution-hero"><span class="pill">Help the field guide grow</span><h1>A good eye makes a better game.</h1><p>Share a plant photo or fill a missing ID tip. Dean reviews every submission before it can appear in the game.</p></section>
 <section class="card"><h2>Your photo credit</h2><p class="muted">This name will appear publicly below approved photos as “Contribution from …”. Your email stays private.</p><label for="creditName">Public credit name</label><input id="creditName" class="field" maxlength="80" required value="${esc(state.profile?.display_name||session.user.user_metadata?.display_name||'')}" placeholder="Your name or nickname"><p class="small muted">Choose a name you are comfortable showing to players.</p></section>
 <form id="contributionForm" class="card"><h2>Make a contribution</h2><div id="contributionMsg" role="status"></div>
 <div class="row"><label class="check"><input type="radio" name="kind" value="photo" checked> Photo</label><label class="check"><input type="radio" name="kind" value="tip"> ID tip</label></div>
 <label for="speciesQuery">Find a species</label><input id="speciesQuery" class="field" type="search" placeholder="Search common or scientific name">
 <label class="check"><input id="needsTips" type="checkbox"> Show species missing a general ID tip</label>
 <label for="contributionSpecies">Species</label><select id="contributionSpecies" class="field" required></select><p id="speciesHelp" class="small muted"></p>
 <div id="photoFields"><label for="contributionPhoto">Photo</label><input id="contributionPhoto" class="field" type="file" accept="image/jpeg,image/png,image/webp"><p class="small muted">JPG, PNG, or WebP · up to 10 MB</p><img id="contributionPreview" class="contribution-preview" alt="Your selected photo" hidden>
 <label for="contributionOrientation">Rotation</label><select id="contributionOrientation" class="field"><option value="0">Normal</option><option value="90">90° clockwise</option><option value="180">180°</option><option value="270">90° counterclockwise</option></select>
 <label>Visible features</label><div class="checks">${tags.map(t=>`<label class="check"><input type="checkbox" name="contributionTag" value="${esc(t.id)}">${esc(t.label)}</label>`).join('')}</div>
 <label class="check"><input id="contributionRights" type="checkbox"> I took this photo and give permission to display it in Thistle Be Fun with my credit.</label></div>
 <div id="tipFields" hidden><label for="tipStage">Tip applies to</label><select id="tipStage" class="field"></select><label for="contributionBody">How can someone recognize this plant?</label><textarea id="contributionBody" class="field" rows="6" maxlength="6000" placeholder="Describe useful identifying features and how to distinguish look-alikes."></textarea><label for="contributionMemory">Memory trick (optional)</label><textarea id="contributionMemory" class="field" maxlength="1000"></textarea><label for="contributionSource">Reference name (optional)</label><input id="contributionSource" class="field" maxlength="300"><label for="contributionUrl">Reference link (optional)</label><input id="contributionUrl" class="field" type="url" maxlength="2000" placeholder="https://…"><p class="small muted">Focus on identification. Include a reference for botanical claims.</p></div>
 <button id="submitContribution" class="primary" style="margin-top:18px">Send for approval</button></form>
 <section class="card"><h2>Your submissions</h2><div id="mySubmissions"></div></section>`;
 let previewUrl;
 const kind=()=>document.querySelector('input[name="kind"]:checked').value;
 function paintSpecies(){
  const prev=$('#contributionSpecies').value,q=$('#speciesQuery').value.trim().toLowerCase();
  const rows=catalog.filter(s=>(!q||`${s.common_name} ${s.scientific_name||''}`.toLowerCase().includes(q))&&(!$('#needsTips').checked||!s.has_general_tip));
  $('#contributionSpecies').innerHTML='<option value="">Choose a species…</option>'+rows.map(s=>`<option value="${esc(s.id)}">${esc(s.common_name)}${s.scientific_name?' — '+esc(s.scientific_name):''}${s.contribution_only?' · In preparation':''}</option>`).join('');
  if(rows.some(s=>s.id===prev))$('#contributionSpecies').value=prev;
  paintNeeds();
 }
 function paintNeeds(){
  const s=catalog.find(s=>s.id===$('#contributionSpecies').value);
  $('#speciesHelp').textContent=s?(s.contribution_only?'This species is in preparation. Your approved content stays out of the game until Dean publishes the species.':'Every submission is reviewed before use.'):'';
  const stages=s?[...(!s.has_general_tip?[{id:'',label:'General identification'}]:[]),...tags.filter(t=>missingTip(s,t.id))]:[];
  $('#tipStage').innerHTML=stages.length?stages.map(t=>`<option value="${esc(t.id)}">${esc(t.label)}</option>`).join(''):'<option value="">Choose a species with a missing tip</option>';
  $('#tipStage').disabled=!stages.length;
 }
 document.querySelectorAll('input[name="kind"]').forEach(r=>r.onchange=()=>{
  $('#photoFields').hidden=kind()!=='photo';$('#tipFields').hidden=kind()!=='tip';
  $('#needsTips').checked=kind()==='tip';paintSpecies();
 });
 $('#speciesQuery').oninput=paintSpecies;$('#needsTips').onchange=paintSpecies;$('#contributionSpecies').onchange=paintNeeds;paintSpecies();
 $('#contributionPhoto').onchange=()=>{
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  const f=$('#contributionPhoto').files[0];$('#contributionPreview').hidden=!f;
  if(f){try{validatePhoto(f);previewUrl=URL.createObjectURL(f);$('#contributionPreview').src=previewUrl}catch(e){$('#contributionPreview').hidden=true;$('#contributionMsg').textContent=e.message}}
 };
 $('#contributionOrientation').onchange=()=>$('#contributionPreview').style.transform=`rotate(${$('#contributionOrientation').value}deg)`;
 $('#mySubmissions').innerHTML=submissions.map(s=>`<div class="item"><div><b>${esc(catalog.find(x=>x.id===s.species_id)?.common_name||'Species')}</b><div class="small muted">${s.kind==='photo'?'Photo':'ID tip'} · ${esc(new Date(s.created_at).toLocaleDateString())}</div>${s.review_note?`<p>${esc(s.review_note)}</p>`:''}</div><span class="pill">${esc(s.status)}</span></div>`).join('')||'<p class="muted">Your first contribution starts here.</p>';
 $('#contributionForm').onsubmit=async event=>{
  event.preventDefault();const button=$('#submitContribution'),msg=$('#contributionMsg');button.disabled=true;let path,inserted=false;
  try{
   const name=$('#creditName').value.trim();if(!name)throw new Error('Add your public credit name first.');
   const sp=catalog.find(s=>s.id===$('#contributionSpecies').value);if(!sp)throw new Error('Choose a species from the list.');
   const row={id:crypto.randomUUID(),user_id:session.user.id,species_id:sp.id,kind:kind(),credit_name:name};
   if(row.kind==='photo'){
    const file=$('#contributionPhoto').files[0],ext=validatePhoto(file);
    if(!$('#contributionRights').checked)throw new Error('Please confirm you own the photo and give permission to display it.');
    // Decode before uploading, rejecting files that only pretend to be images.
    const bitmap=await createImageBitmap(file);bitmap.close();
    path=`${session.user.id}/${row.id}.${ext}`;
    checked(await supabase.storage.from(PENDING_BUCKET).upload(path,file,{upsert:false,contentType:file.type}));
    Object.assign(row,{storage_path:path,original_filename:file.name,rights_confirmed:true,orientation_degrees:Number($('#contributionOrientation').value),tag_ids:[...document.querySelectorAll('input[name="contributionTag"]:checked')].map(t=>t.value)});
   }else{
    if($('#tipStage').disabled)throw new Error('Choose a species with a missing ID tip.');
    const stage=$('#tipStage').value,body=$('#contributionBody').value.trim();
    if(!body)throw new Error('Write an ID tip.');
    if(!missingTip(sp,stage))throw new Error('That tip is already available. Choose another missing tip.');
    Object.assign(row,{scope:stage?'stage':'general',stage_tag_id:stage||null,body,memory_text:$('#contributionMemory').value.trim()||null,source_name:$('#contributionSource').value.trim()||null,source_url:$('#contributionUrl').value.trim()||null});
   }
   if(row.source_url&&!safeUrl(row.source_url))throw new Error('Reference links must start with https:// or http://.');
   checked(await supabase.from('fid_contributor_profiles').upsert({user_id:session.user.id,display_name:name}));
   checked(await supabase.from('fid_submissions').insert(row));inserted=true;
   if(previewUrl)URL.revokeObjectURL(previewUrl);
   await renderContributorPortal(session);
   if($('#contributionMsg'))$('#contributionMsg').innerHTML='<div class="ok">Thank you! Your submission is pending Dean’s approval.</div>';
  }catch(e){
   if(path&&!inserted)await supabase.storage.from(PENDING_BUCKET).remove([path]);
   msg.innerHTML=`<div class="error">${esc(e.message||'Submission failed. Please try again.')}</div>`;button.disabled=false;
  }
 };
}

export async function renderReviewPage(state,onRefresh){
 $('#page').innerHTML='<div class="card">Loading submissions…</div>';
 try{
  const rows=await allRows('fid_submissions');
  if(state.view!=='submissions')return;
  $('#page').innerHTML=`<div class="card"><h2>Contributor submissions</h2><p class="muted">Approve content for existing live species, or collect content for species in preparation. Photo credits use the contributor’s chosen public name.</p><label for="reviewFilter">Status</label><select id="reviewFilter" class="field"><option value="pending">Pending approval</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div><div id="reviewList"></div>`;
  async function paint(){
   const list=$('#reviewList'),status=$('#reviewFilter').value;list.innerHTML='';
   const filtered=rows.filter(s=>s.status===status);
   if(!filtered.length){list.innerHTML='<div class="card muted">No submissions here.</div>';return}
   for(const row of filtered){
    const sp=state.species.find(x=>x.id===row.species_id),card=document.createElement('section');card.className='card';
    card.innerHTML=`<span class="pill">${esc(row.kind)} · ${esc(row.status)}</span><h3>${esc(sp?.common_name||'Species')}</h3><p class="small muted">Contribution from ${esc(row.credit_name)} · ${esc(new Date(row.created_at).toLocaleString())}</p>${sp?.contribution_only?'<p class="ok">In preparation: approval will save a draft. Publish the species separately when ready.</p>':''}<div class="reviewMedia"></div><div class="reviewMsg" role="status"></div>`;
    list.appendChild(card);const media=card.querySelector('.reviewMedia');
    if(row.kind==='photo'){
     const signed=checked(await supabase.storage.from(PENDING_BUCKET).createSignedUrl(row.storage_path,600));
     const img=document.createElement('img');img.className='contribution-preview';img.src=signed.signedUrl;img.alt='Submitted plant photo';img.style.transform=`rotate(${row.orientation_degrees}deg)`;media.appendChild(img);
     const tagText=document.createElement('p');tagText.className='small muted';tagText.textContent=(row.tag_ids||[]).map(id=>state.tags.find(t=>t.id===id)?.label).filter(Boolean).join(' · ');media.appendChild(tagText);
    }else{
     media.innerHTML=`<p class="small muted">${row.scope==='general'?'General tip':esc(state.tags.find(t=>t.id===row.stage_tag_id)?.label||'Stage tip')}</p><label>ID tip (edit before approval)</label><textarea class="field reviewBody" rows="5" maxlength="6000" ${status!=='pending'?'disabled':''}>${esc(row.body)}</textarea><label>Memory trick</label><textarea class="field reviewMemory" maxlength="1000" ${status!=='pending'?'disabled':''}>${esc(row.memory_text||'')}</textarea><p class="small muted">${esc(row.source_name||'No reference supplied')} ${esc(row.source_url||'')}</p>`;
    }
    if(status==='pending'){
     const controls=document.createElement('div');controls.innerHTML='<label>Review note (visible to contributor)</label><textarea class="field reviewNote" maxlength="2000"></textarea><div class="row" style="margin-top:12px"><button class="primary approve">Approve</button><button class="secondary reject">Reject</button></div>';card.appendChild(controls);
     controls.querySelector('.approve').onclick=()=>review(true,row,card);
     controls.querySelector('.reject').onclick=()=>review(false,row,card);
    }else if(row.review_note){const p=document.createElement('p');p.textContent=row.review_note;card.appendChild(p)}
   }
  }
  async function review(approve,row,card){
   const buttons=card.querySelectorAll('button');buttons.forEach(b=>b.disabled=true);
   try{
    let publicPath=null;
    if(approve&&row.kind==='photo'){
     publicPath=`contributions/${row.id}.${row.storage_path.split('.').pop()}`;
     const file=checked(await supabase.storage.from(PENDING_BUCKET).download(row.storage_path));
     const uploaded=await supabase.storage.from('field-id-content').upload(publicPath,file,{upsert:false,contentType:file.type});
     // A previous interrupted approval may already have uploaded this immutable path.
     if(uploaded.error&&!['409','Duplicate'].includes(String(uploaded.error.statusCode))&&uploaded.error.error!=='Duplicate')throw uploaded.error;
    }
    checked(await supabase.rpc('fid_review_submission',{p_id:row.id,p_approve:approve,p_note:card.querySelector('.reviewNote').value.trim()||null,p_body:card.querySelector('.reviewBody')?.value.trim()||null,p_memory:card.querySelector('.reviewMemory')?.value??null,p_public_path:publicPath}));
    await onRefresh();
   }catch(e){card.querySelector('.reviewMsg').innerHTML=`<div class="error">${esc(e.message)}</div>`;buttons.forEach(b=>b.disabled=false)}
  }
  $('#reviewFilter').onchange=()=>paint().catch(e=>{$('#reviewList').textContent=e.message});await paint();
 }catch(e){if($('#page')&&state.view==='submissions')$('#page').innerHTML=`<div class="error">${esc(e.message)}</div>`}
}
