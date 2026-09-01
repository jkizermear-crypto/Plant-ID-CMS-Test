
import JSZip from 'jszip';
import {$,esc,slugify} from './utils.js';
import {supabase} from './supabase.js';
import {STORAGE_BUCKET} from './config.js';

const RELEASE_VERSION='7.1';
const RELEASE_TITLE='You Wanted More';
const CONTENT=[{"folder": "Prarie Coreopsis", "common": "Prairie Coreopsis", "scientific": "Coreopsis palmata", "sourceName": "Illinois Wildflowers", "sourceUrl": "https://www.illinoiswildflowers.info/prairie/plantx/pr_coreopsisx.htm", "general": "Look first at the leaves, not just the yellow flower. Prairie Coreopsis usually has opposite, sessile leaves divided into three narrow, finger-like lobes with smooth margins.", "memory": "Palmata means palm-like: think of the three-part leaves as a little open hand.", "stages": [["flower", "The yellow daisy-like heads sit above relatively sparse foliage. Confirm Prairie Coreopsis by checking for the opposite, three-lobed leaves below the flowers.", "Yellow flower plus three-finger leaves."], ["leaf", "Vegetative plants are best recognized by opposite leaves that are usually divided into a terminal lobe and two narrow side lobes. The leaf bases attach directly to the stem.", "Opposite little three-finger hands."]], "photoConcepts": [["flower"], ["leaf"], ["leaf"], ["habit", "flower"], ["flower"], ["habit", "flower"], ["habit", "flower"], ["leaf"]], "distractors": ["Black-eyed Susan", "Lanceleaf Coreopsis", "Tall Coreopsis", "Partridge Pea", "Prairie Blazing Star"], "comparisons": []}, {"folder": "Sideoats Grama", "common": "Sideoats Grama", "scientific": "Bouteloua curtipendula", "sourceName": "University of Illinois Extension", "sourceUrl": "https://extension.illinois.edu/grasses/side-oats-grama", "general": "The seedhead is the giveaway: many small oat-like spikelet clusters hang from one side of a slender, often zig-zagging stem. Young leaf margins can also show tiny glands, each bearing a hair.", "memory": "The oats ride on one SIDE.", "stages": [["seed", "Mature seedheads carry many short spikelet clusters lined up mostly on one side of the rachis. The clusters often turn reddish, then straw brown.", "A row of tiny flags hanging from one side."], ["leaf", "Before flowering, check young leaf margins for tiny gland-based hairs and look for a short hairy ligule.", "Gland hairs on the blade edge are the backup clue."]], "photoConcepts": [["bare", "habit"], ["bare", "seed"], ["seed"], ["seed"], ["flower", "seed"], ["flower", "seed"], ["habit"], ["leaf"]], "distractors": ["Blue Grama", "Hairy Grama", "Little Bluestem", "Big Bluestem", "Indian Grass"], "comparisons": [["Big Bluestem", "Sideoats Grama stays much shorter and its many little spikelet clusters line one side of a single slender axis. Big Bluestem ends in a few large finger-like 'turkey foot' branches.", "Many little side oats versus a few big turkey toes."], ["Indian Grass", "Sideoats Grama has separate little spikelet clusters hanging along one side of the stem. Indian Grass has a dense golden, plume-like panicle.", "Side-hanging oats versus one golden plume."]]}, {"folder": "Prarie Blazing Star", "common": "Prairie Blazing Star", "scientific": "Liatris pycnostachya", "sourceName": "Illinois Wildflowers", "sourceUrl": "https://www.illinoiswildflowers.info/prairie/plantx/pr_blazingstarx.htm", "general": "Prairie Blazing Star is a tall, mostly unbranched wand covered in many narrow alternate leaves and topped by a dense spike of purple flowerheads. The bracts beneath each flowerhead curve sharply outward.", "memory": "A purple prairie wand with recurved little hooks beneath the flowers.", "stages": [["flower", "The flowering spike is densely packed. Look closely at the green or reddish bracts beneath each flowerhead: in Prairie Blazing Star their tips strongly recurve outward.", "Prairie Blazing Star hooks its bracts backward."], ["leaf", "Before bloom, look for a single upright stem crowded with numerous narrow, grass-like alternate leaves that become smaller upward.", "One upright stem wearing lots of skinny leaves."]], "photoConcepts": [["flower", "habit"], ["flower"], ["flower", "habit"], ["flower"], ["leaf"], ["flower", "habit"], ["flower"], ["leaf"], ["flower", "habit"]], "distractors": ["Rough Blazing Star", "Marsh Blazing Star", "Purple Loosestrife", "New England Aster", "Field Thistle"], "comparisons": [["Purple Loosestrife", "Both can make a tall purple spike, but Prairie Blazing Star has narrow alternate leaves and composite flowerheads packed around one unbranched wand. Purple Loosestrife has opposite or whorled leaves and individual flowers with obvious petals.", "Blazing Star is a fuzzy composite wand; loosestrife has petaled flowers on leafy stems."], ["Field Thistle", "Prairie Blazing Star has a narrow spike of many small purple heads and no spiny leaves. Field Thistle has much larger separate flowerheads and deeply lobed, spiny leaves.", "Blazing Star is a wand; thistle is armed."]]}, {"folder": "Field Thistle", "common": "Field Thistle", "scientific": "Cirsium discolor", "sourceName": "NatureServe / regional field references", "sourceUrl": "https://explorer.natureserve.org/Taxon/ELEMENT_GLOBAL.2.132014/Cirsium_discolor", "general": "The strongest field mark is the leaf contrast: the upper surface is green while the underside is densely white-woolly. Leaves are deeply lobed and spiny, and the plant carries large pink-purple thistle heads.", "memory": "Field Thistle is two-toned: green upstairs, white wool downstairs.", "stages": [["flower", "Large pink-purple heads sit on branching stems. Do not identify from the flower alone; confirm the white-woolly undersides of the deeply lobed leaves.", "Purple head plus a white-backed leaf."], ["leaf", "Flip a leaf. Field Thistle has a striking white, woolly underside beneath a greener upper surface, with deep lobes and marginal spines.", "Flip it for the white underside."]], "photoConcepts": [["leaf", "flower"], ["flower"], ["flower"], ["flower", "habit"], ["flower"], ["leaf"], ["bare", "habit"], ["leaf"]], "distractors": ["Bull Thistle", "Canada Thistle", "Musk Thistle", "Tall Thistle", "Prairie Blazing Star"], "comparisons": [["Bull Thistle", "Field Thistle has densely white-woolly leaf undersides. Bull Thistle leaves are greener beneath, and its leaf bases run down the stem to form conspicuous spiny wings.", "Flip the leaf: white-backed Field Thistle, greener Bull Thistle."], ["Prairie Blazing Star", "Field Thistle has large individual heads and strongly spiny, deeply lobed leaves. Prairie Blazing Star has a dense narrow spike and many slender, unarmed leaves.", "Thistle is spiny and chunky; Blazing Star is a slender wand."]]}, {"folder": "Indian Grass", "common": "Indian Grass", "scientific": "Sorghastrum nutans", "sourceName": "University of Illinois Extension", "sourceUrl": "https://extension.illinois.edu/grasses/indian-grass", "general": "Indian Grass is a tall blue-green bunchgrass with a narrow golden-orange plume. At the collar, look for its famous 'horns': two stiff little projections rising where the blade meets the sheath.", "memory": "Indian Grass has HORNS and a golden plume.", "stages": [["seed", "The mature inflorescence is a contracted golden to orange panicle with silky, awned spikelets. It looks plume-like rather than fingered.", "One silky golden plume."], ["leaf", "Pull the blade slightly away from the stem and look at the collar. Indian Grass has two stiff horn-like projections with a membranous ligule between them.", "Find the horns before the flowers."]], "photoConcepts": [["seed", "habit"], ["seed"], ["habit"], ["seed"], ["leaf"], ["habit"], ["seed"], ["seed"], ["seed"]], "distractors": ["Big Bluestem", "Switchgrass", "Prairie Cordgrass", "Sideoats Grama", "Little Bluestem"], "comparisons": [["Big Bluestem", "Indian Grass makes one dense golden plume and has horn-like projections at the leaf collar. Big Bluestem makes several finger-like seedhead branches forming a turkey foot.", "Golden plume with horns versus turkey foot."], ["Sideoats Grama", "Indian Grass is tall with a dense golden plume. Sideoats Grama is shorter and has many separate oat-like clusters arranged along one side of a slender axis.", "Plume versus side oats."]]}, {"folder": "Big Bluestem", "common": "Big Bluestem", "scientific": "Andropogon gerardii", "sourceName": "University of Illinois Extension", "sourceUrl": "https://extension.illinois.edu/grasses/big-bluestem", "general": "Big Bluestem is a tall prairie grass with often reddish or purplish, slightly flattened stems. Its mature seedhead splits into several finger-like branches, the classic 'turkey foot.'", "memory": "Big Bluestem leaves a turkey footprint at the top.", "stages": [["seed", "The mature inflorescence usually has a few long finger-like racemes spreading from near the same point. That turkey-foot shape is one of the quickest prairie-grass IDs.", "Count turkey toes, not one plume."], ["leaf", "Before flowering, look for a robust tall bunchgrass with somewhat flattened stems, often developing red coloration, plus sparse hairs near the base of the leaf blade and a short membranous ligule.", "Big, flattened, often reddish stems."]], "photoConcepts": [["seed"], ["seed"], ["flower", "seed"], ["flower", "seed"], ["habit"], ["leaf"], ["habit"], ["seed"]], "distractors": ["Indian Grass", "Little Bluestem", "Switchgrass", "Sideoats Grama", "Prairie Cordgrass"], "comparisons": [["Indian Grass", "Big Bluestem ends in several finger-like 'turkey foot' branches. Indian Grass ends in one dense golden plume and has horn-like structures at the collar.", "Turkey foot versus golden plume."], ["Sideoats Grama", "Big Bluestem is much taller and carries only a few large finger-like racemes. Sideoats Grama has many small oat-like clusters lined along one side of a slender axis.", "Big turkey toes versus many side oats."]]}, {"folder": "Common Boneset", "common": "Common Boneset", "scientific": "Eupatorium perfoliatum", "sourceName": "Illinois Wildflowers", "sourceUrl": "https://www.illinoiswildflowers.info/prairie/plantx/cm_boneset.htm", "general": "Common Boneset has opposite leaves whose broad bases join completely around the stem, making the stem look as if it passes through one leaf. Flat-topped clusters of many tiny white flowerheads appear above.", "memory": "Perfoliatum = the stem perforates the paired leaves.", "stages": [["flower", "The top of the plant carries broad, flat to slightly rounded clusters of small fuzzy white flowerheads. Confirm it by finding a pair of leaves fused around the stem below.", "White cloud on top, fused leaves below."], ["leaf", "Opposite lance-shaped leaves are serrated and their bases merge around the stem. That perfoliate leaf pair is the fastest way to separate Common Boneset from most look-alikes.", "The paired leaves make one collar around the stem."]], "photoConcepts": [["flower", "habit"], ["leaf"], ["leaf", "habit"], ["flower"], ["flower"], ["flower", "leaf"], ["flower"], ["flower"], ["flower", "habit"]], "distractors": ["Late Boneset", "Tall Boneset", "White Snakeroot", "Flat-Topped Goldenrod", "Hairy White Aster"], "comparisons": [["Hairy White Aster", "Both can look like masses of small white flowers, but Common Boneset has no daisy-like rays and has opposite leaves fused around the stem. Hairy White Aster has small white-rayed daisies and alternate leaves.", "Boneset has fused opposite leaves; the aster has little white daisies."]]}, {"folder": "Orchard Grass", "common": "Orchard Grass", "scientific": "Dactylis glomerata", "sourceName": "University of Illinois Extension", "sourceUrl": "https://extension.illinois.edu/grasses/orchard-grass", "general": "Orchard Grass forms bunches with distinctly keeled, folded-looking leaves and sheaths. Its ligule is unusually tall and membranous, often torn into ragged pieces.", "memory": "Orchard Grass has a tall, torn paper ligule.", "stages": [["seed", "The panicle has bare stretches of branch with dense, bushy clusters of awnless spikelets concentrated near the branch tips. Mature branches may stick out nearly at right angles.", "Bushy clumps at the ends of bare panicle branches."], ["leaf", "Look for leaves and sheaths with a strong keel, like they were folded lengthwise, plus a tall membranous ligule that often looks ripped.", "Folded leaf, ripped-tall ligule."]], "photoConcepts": [["flower", "seed"], ["flower", "seed"], ["seed"], ["bare", "seed"], ["habit"], ["seed"], ["leaf"], ["seed"]], "distractors": ["Reed Canary Grass", "Tall Fescue", "Smooth Brome", "Kentucky Bluegrass", "Yellow Foxtail"], "comparisons": [["Reed Canary Grass", "Orchard Grass has strongly keeled leaves and a very tall, often ragged membranous ligule. Its panicle carries dense spikelet clumps near branch tips rather than the more evenly filled panicle of Reed Canary Grass.", "Orchard Grass looks folded and clumpy."]]}, {"folder": "Yellow Foxtail", "common": "Yellow Foxtail", "scientific": "Setaria pumila", "sourceName": "University of Illinois Extension", "sourceUrl": "https://extension.illinois.edu/grasses/foxtails", "general": "Yellow Foxtail has an upright, dense bottlebrush seedhead. Each spikelet is subtended by a cluster of many bristles, typically 5 to 15, and the stem/sheath can look slightly flattened or keeled.", "memory": "Yellow Foxtail packs MANY bristles under each seed.", "stages": [["seed", "The seedhead usually stays upright. Look closely at a spikelet: Yellow Foxtail has a larger bundle of bristles, commonly 5 to 15, rather than only a few.", "Many bristles, upright tail."], ["leaf", "Before seed set, look for a hairy ligule, keeled leaf sheaths, and often a few long hairs near the base of the leaf blade.", "Hairy collar plus a folded-looking sheath."]], "photoConcepts": [["seed"], ["seed", "habit"], ["leaf", "seed"], ["seed"], ["habit"], ["leaf"], ["habit"], ["habit"]], "distractors": ["Giant Foxtail", "Green Foxtail", "Barnyard Grass", "Orchard Grass", "Reed Canary Grass"], "comparisons": [["Orchard Grass", "Yellow Foxtail has a dense bottlebrush-like spike with obvious bristles. Orchard Grass has a branched panicle with bushy spikelet clusters and no foxtail bristles.", "Bottlebrush versus branched clumps."]]}, {"folder": "Hairy White Aster", "common": "Hairy White Aster", "scientific": "Symphyotrichum pilosum", "sourceName": "U.S. Fish & Wildlife Service / regional field references", "sourceUrl": "https://www.fws.gov/species/hairy-white-oldfield-aster-symphyotrichum-pilosum", "general": "Hairy White Aster has many small white daisy-like heads with yellow centers on a much-branched plant. The stems are conspicuously hairy, and the narrow alternate leaves become smaller toward the top.", "memory": "A frosty-looking hairy stem under a cloud of tiny white asters.", "stages": [["flower", "Look for numerous small white-rayed heads with yellow centers on an open, branching spray. Then check the stem for obvious spreading hairs.", "Tiny white daisies on a hairy frame."], ["leaf", "The leaves are alternate, narrow, usually entire or only slightly toothed, and shrink upward. Small secondary leaf clusters often appear in the leaf axils.", "Hairy stem, narrow alternate leaves, little axillary leaf bunches."]], "photoConcepts": [["leaf"], ["leaf"], ["flower"], ["flower"], ["flower"], ["habit"], ["habit"], ["leaf"]], "distractors": ["New England Aster", "Heath Aster", "Calico Aster", "Common Boneset", "White Snakeroot"], "comparisons": [["New England Aster", "Hairy White Aster has many small white-rayed heads and narrow leaves. New England Aster has much larger purple to pink heads and broader clasping leaves.", "Tiny white frost asters versus big purple New England asters."], ["Common Boneset", "Hairy White Aster has true daisy-like heads with white rays and alternate leaves. Common Boneset has fuzzy white disk-flower clusters and opposite leaves fused around the stem.", "Little daisies versus fused-leaf boneset."]]}, {"folder": "Tall Goldenrod", "common": "Tall Goldenrod", "scientific": "Solidago altissima", "sourceName": "NatureServe / regional field references", "sourceUrl": "https://explorer.natureserve.org/Taxon/ELEMENT_GLOBAL.2.799970/Solidago_altissima", "general": "Tall Goldenrod usually has a large arching, pyramidal flower plume with the tiny heads concentrated along one side of the branches. The stem is hairy, and the mid-stem leaves are rough, narrow, and strongly three-nerved.", "memory": "Tall Goldenrod is hairy from stem to plume.", "stages": [["flower", "The flowering branches form a broad, often arching pyramid with many tiny yellow heads arranged mostly to one side of each branch. Confirm the hairy stem below.", "A hairy stem holding a one-sided golden pyramid."], ["leaf", "Mid-stem leaves are narrow-lanceolate, rough to the touch, usually with small teeth and three prominent lengthwise veins. The stem is hairy.", "Rough three-veined leaves on a hairy stem."]], "photoConcepts": [["flower", "habit"], ["flower", "habit"], ["flower", "leaf"], ["flower", "habit"], ["flower", "habit"], ["flower", "habit"], ["flower", "habit"], ["flower", "habit"]], "distractors": ["Canada Goldenrod", "Giant Goldenrod", "Flat-Topped Goldenrod", "Early Goldenrod", "Grass-Leaved Goldenrod"], "comparisons": [["Flat-Topped Goldenrod", "Tall Goldenrod makes a broad pyramidal, often arching plume and has wider rough leaves on a hairy stem. Flat-Topped Goldenrod has a flatter top and much narrower grass-like leaves.", "Golden pyramid versus golden tabletop."], ["Hairy White Aster", "Tall Goldenrod has dense yellow flowerheads in an arching plume. Hairy White Aster has many small white-rayed daisies on a more open branching spray.", "Golden plume versus white daisy cloud."]]}, {"folder": "Flat-Topped Goldenrod", "common": "Flat-Topped Goldenrod", "scientific": "Euthamia graminifolia", "sourceName": "Native Plant Trust / regional field references", "sourceUrl": "https://gobotany.nativeplanttrust.org/species/euthamia/graminifolia/", "general": "Flat-Topped Goldenrod has a broad, flat to gently rounded cluster of yellow flowerheads and very narrow grass-like leaves. The leaves are sessile and characteristically show three main lengthwise veins.", "memory": "Golden flowers on a tabletop, with grass-like three-veined leaves underneath.", "stages": [["flower", "Instead of an arching goldenrod plume, the flower branches build a broad flat or gently domed top. Check below for narrow linear leaves.", "Think yellow tabletop, not yellow pyramid."], ["leaf", "The leaves are narrow and grass-like, attach directly to the stem, and have three main veins running lengthwise from near the base.", "Three veins in a skinny leaf."]], "photoConcepts": [["habit", "flower"], ["leaf", "flower"], ["flower", "habit"], ["habit"], ["flower"], ["flower", "habit"], ["flower"], ["flower", "habit"]], "distractors": ["Tall Goldenrod", "Canada Goldenrod", "Grass-Leaved Goldenrod", "Riddell's Goldenrod", "Ohio Goldenrod"], "comparisons": [["Tall Goldenrod", "Flat-Topped Goldenrod has a flatter flower cluster and very narrow grass-like leaves. Tall Goldenrod has a pyramidal arching plume and broader rough leaves on a hairy stem.", "Tabletop versus pyramid."], ["Common Boneset", "Both can form broad, fairly flat flower clusters, but Flat-Topped Goldenrod is yellow with narrow grass-like alternate leaves. Common Boneset is white with opposite leaves fused around the stem.", "Yellow skinny leaves versus white fused leaves."]]}];

function norm(x){return String(x||'').trim().toLowerCase();}
function workingReleaseMeta(r){return {release_id:r.id,publish_status:'draft'};}
function logLine(msg,cls=''){const box=$('#batch71Log'); if(!box)return; box.insertAdjacentHTML('beforeend',`<div class="${cls}">${esc(msg)}</div>`); box.scrollTop=box.scrollHeight;}
function safeName(name){return name.replace(/[^a-zA-Z0-9._-]/g,'_');}
function mimeFor(name){const n=name.toLowerCase();return n.endsWith('.png')?'image/png':n.endsWith('.webp')?'image/webp':'image/jpeg';}
function conceptTag(state,concept){
  const words={
    flower:['flower','bloom','flowering'],
    seed:['seed','seedhead','seed head','fruit'],
    leaf:['leaf','leaves','foliage','vegetative'],
    bare:['bare','winter','dormant','dead'],
    habit:['habit','whole plant','stand','form']
  }[concept]||[concept];
  return (state.tags||[]).find(t=>{
    const hay=`${norm(t.slug)} ${norm(t.label)}`;
    return words.some(w=>hay.includes(w));
  })||null;
}
function findSpeciesByName(all,name){
  const n=norm(name);
  return all.find(s=>norm(s.common_name)===n)||null;
}
async function getOrCreateRelease(state){
  let r=(state.releases||[]).find(x=>String(x.version)===RELEASE_VERSION);
  if(r){
    if(r.status!=='draft') throw new Error(`Release ${RELEASE_VERSION} already exists but is ${r.status}. This importer will only write to a draft release.`);
    return r;
  }
  logLine(`Creating draft release ${RELEASE_VERSION} — ${RELEASE_TITLE}...`);
  const x=await supabase.rpc('fid_create_release',{p_version:RELEASE_VERSION,p_title:RELEASE_TITLE});
  if(x.error) throw x.error;
  r=Array.isArray(x.data)?x.data[0]:x.data;
  if(!r?.id) throw new Error('Release was created but no release ID was returned.');
  state.releases=[r,...(state.releases||[])];
  return r;
}
async function loadZip(file){
  const zip=await JSZip.loadAsync(file);
  const names=Object.keys(zip.files).filter(n=>!zip.files[n].dir);
  const missing=CONTENT.filter(sp=>!names.some(n=>n.startsWith(sp.folder+'/')));
  if(missing.length) throw new Error(`ZIP is missing expected folders: ${missing.map(x=>x.folder).join(', ')}`);
  return zip;
}
async function ensureSpecies(sp,release,allSpecies){
  const existing=findSpeciesByName(allSpecies,sp.common);
  if(existing){
    if(existing.release_id===release.id && existing.publish_status==='draft') return existing;
    throw new Error(`${sp.common} already exists outside this 7.1 draft. Import stopped so I do not create a duplicate or touch live content.`);
  }
  const x=await supabase.from('fid_species').insert({
    common_name:sp.common,
    scientific_name:sp.scientific,
    notes:'Prepared batch import for v7.1. Review in CMS before publishing.',
    is_active:true,
    ...workingReleaseMeta(release)
  }).select('*').single();
  if(x.error) throw x.error;
  allSpecies.push(x.data);
  return x.data;
}
async function uploadPhotos(zip,sp,spRow,release,state){
  const entries=Object.values(zip.files)
    .filter(f=>!f.dir && f.name.startsWith(sp.folder+'/'))
    .sort((a,b)=>a.name.localeCompare(b.name));
  const existing=await supabase.from('fid_photos')
    .select('id,original_filename')
    .eq('species_id',spRow.id)
    .eq('release_id',release.id);
  if(existing.error) throw existing.error;
  const done=new Set((existing.data||[]).map(x=>x.original_filename));
  for(let i=0;i<entries.length;i++){
    const entry=entries[i], original=entry.name.split('/').pop();
    if(done.has(original)){logLine(`  photo ${i+1}/${entries.length}: already present, skipped`);continue;}
    const blob=await entry.async('blob');
    const typed=new File([blob],original,{type:mimeFor(original)});
    const path=`species/${slugify(sp.common)}/${crypto.randomUUID()}-${safeName(original)}`;
    logLine(`  photo ${i+1}/${entries.length}: ${original}`);
    const u=await supabase.storage.from(STORAGE_BUCKET).upload(path,typed,{upsert:false,contentType:typed.type});
    if(u.error) throw u.error;
    const p=await supabase.from('fid_photos').insert({
      species_id:spRow.id,storage_path:path,original_filename:original,
      orientation_degrees:0,is_active:true,...workingReleaseMeta(release)
    }).select('id').single();
    if(p.error){
      await supabase.storage.from(STORAGE_BUCKET).remove([path]);
      throw p.error;
    }
    const concepts=sp.photoConcepts[i]||[];
    const tagIds=[...new Set(concepts.map(c=>conceptTag(state,c)?.id).filter(Boolean))];
    if(tagIds.length){
      const t=await supabase.from('fid_photo_tags').insert(tagIds.map(tag_id=>({photo_id:p.data.id,tag_id})));
      if(t.error) throw t.error;
    }
  }
}
async function ensureTip(spRow,release,tip){
  let q=supabase.from('fid_tips').select('id').eq('species_id',spRow.id).eq('release_id',release.id).eq('body',tip.body).limit(1);
  const e=await q;if(e.error)throw e.error;if((e.data||[]).length)return;
  const x=await supabase.from('fid_tips').insert({...tip,species_id:spRow.id,is_active:true,...workingReleaseMeta(release)});
  if(x.error)throw x.error;
}
async function addTips(sp,spRow,release,state){
  await ensureTip(spRow,release,{
    scope:'general',stage_tag_id:null,photo_id:null,body:sp.general,memory_text:sp.memory,
    source_name:sp.sourceName,source_url:sp.sourceUrl
  });
  for(const [concept,body,memory] of sp.stages||[]){
    const tag=conceptTag(state,concept);
    if(!tag){logLine(`  stage card "${concept}" skipped because no matching CMS tag exists.`);continue;}
    await ensureTip(spRow,release,{
      scope:'stage',stage_tag_id:tag.id,photo_id:null,body,memory_text:memory,
      source_name:sp.sourceName,source_url:sp.sourceUrl
    });
  }
}
async function addComparisons(sp,spRow,release,allSpecies){
  for(const [wrongName,body,memory] of sp.comparisons||[]){
    const wrong=findSpeciesByName(allSpecies,wrongName);
    if(!wrong){logLine(`  comparison vs ${wrongName}: target is not a playable species, kept only as a distractor label.`);continue;}
    const check=await supabase.from('fid_comparisons').select('id')
      .eq('correct_species_id',spRow.id).eq('wrong_species_id',wrong.id)
      .eq('release_id',release.id).eq('body',body).limit(1);
    if(check.error)throw check.error;
    if((check.data||[]).length)continue;
    const x=await supabase.from('fid_comparisons').insert({
      correct_species_id:spRow.id,wrong_species_id:wrong.id,scope:'general',
      stage_tag_id:null,photo_id:null,body,memory_text:memory,
      source_name:sp.sourceName,source_url:sp.sourceUrl,is_active:true,
      ...workingReleaseMeta(release)
    });
    if(x.error)throw x.error;
  }
}
async function setDistractors(sp,spRow,release,allSpecies){
  const playable=[],labels=[];
  for(const name of sp.distractors||[]){
    const found=findSpeciesByName(allSpecies,name);
    if(found && found.id!==spRow.id) playable.push(found.id);
    else labels.push(name);
  }
  const del=await supabase.from('fid_distractor_options').delete().eq('species_id',spRow.id);
  if(del.error)throw del.error;
  const rows=[
    ...playable.map((id,i)=>({species_id:spRow.id,distractor_species_id:id,distractor_label:null,sort_order:i,...workingReleaseMeta(release)})),
    ...labels.map((label,i)=>({species_id:spRow.id,distractor_species_id:null,distractor_label:label,sort_order:playable.length+i,...workingReleaseMeta(release)}))
  ];
  if(rows.length){
    const x=await supabase.from('fid_distractor_options').insert(rows);
    if(x.error)throw x.error;
  }
}
async function runImport(state,onRefresh){
  const file=$('#batch71Zip')?.files?.[0];
  if(!file){$('#batch71Msg').innerHTML='<div class="error">Choose the original You Wanted More.zip file first.</div>';return;}
  if(!confirm('Import the 12-species v7.1 batch as DRAFT content? Nothing will be published.'))return;
  const btn=$('#batch71Go');btn.disabled=true;
  $('#batch71Log').innerHTML='';
  $('#batch71Msg').innerHTML='<div class="ok">Import started. Keep this page open until it finishes.</div>';
  try{
    const zip=await loadZip(file);
    const release=await getOrCreateRelease(state);
    state.workingReleaseId=release.id;
    localStorage.setItem('fid_working_release',release.id);

    const fresh=await supabase.from('fid_species').select('*');
    if(fresh.error)throw fresh.error;
    const allSpecies=[...(fresh.data||[])];
    const rows=new Map();

    logLine('Creating/reusing the 12 draft species...');
    for(const sp of CONTENT){
      const row=await ensureSpecies(sp,release,allSpecies);
      rows.set(sp.common,row);
      logLine(`✓ ${sp.common}`,'ok');
    }

    for(const sp of CONTENT){
      const row=rows.get(sp.common);
      logLine(`Uploading ${sp.common} photos...`);
      await uploadPhotos(zip,sp,row,release,state);
      logLine(`Building ${sp.common} practice cards...`);
      await addTips(sp,row,release,state);
    }

    // Reload species so comparisons can resolve both existing game species and all new species.
    const again=await supabase.from('fid_species').select('*');
    if(again.error)throw again.error;
    const finalSpecies=again.data||[];

    for(const sp of CONTENT){
      const row=findSpeciesByName(finalSpecies,sp.common);
      logLine(`Building ${sp.common} comparisons and distractors...`);
      await addComparisons(sp,row,release,finalSpecies);
      await setDistractors(sp,row,release,finalSpecies);
    }

    $('#batch71Msg').innerHTML='<div class="ok"><b>7.1 import complete.</b> All content is still Draft. Review it in Species, Photos, ID Cards, Comparisons, Distractors, and Preview before publishing.</div>';
    logLine('DONE. Nothing was published.','ok');
    await onRefresh();
  }catch(err){
    console.error(err);
    $('#batch71Msg').innerHTML=`<div class="error"><b>Import stopped:</b> ${esc(err?.message||String(err))}<br><br>The importer is resume-safe. Fix the issue and run it again; existing 7.1 rows/photos will be skipped where possible.</div>`;
    logLine(`ERROR: ${err?.message||String(err)}`,'error');
  }finally{
    btn.disabled=false;
  }
}
export function renderBatch71Page(state,onRefresh){
  const expected=CONTENT.map(x=>x.common);
  $('#page').innerHTML=`
    <div class="card">
      <h2>7.1 Batch Import</h2>
      <p class="muted">One-time importer for <b>You Wanted More.zip</b>. It creates/reuses draft release <b>7.1 — You Wanted More</b>, uploads the 12 photo sets, and builds species records, practice cards, comparisons, and distractors.</p>
      <div class="ok"><b>Safety:</b> This page never calls Publish Release. Everything it creates is stamped <b>draft</b> under 7.1.</div>
      <div id="batch71Msg" style="margin-top:12px"></div>
      <label>Original ZIP</label>
      <input id="batch71Zip" class="field" type="file" accept=".zip,application/zip">
      <button id="batch71Go" class="primary" style="margin-top:14px;width:100%">Import 12 Species into Draft 7.1</button>
    </div>
    <div class="card">
      <h3>Included species</h3>
      <div class="small muted">${expected.map(esc).join(' • ')}</div>
    </div>
    <div class="card">
      <h3>Import log</h3>
      <div id="batch71Log" class="small" style="max-height:420px;overflow:auto;line-height:1.55"></div>
    </div>`;
  $('#batch71Go').onclick=()=>runImport(state,onRefresh);
}
