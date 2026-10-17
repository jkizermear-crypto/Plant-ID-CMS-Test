export function normalizeName(value){return String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US')}
export function validatePhoto(file){
  if(!file) throw new Error('Choose a photo.');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use a JPG, PNG, or WebP photo.');
  if(file.size>10*1024*1024)throw new Error('Photos must be 10 MB or smaller.');
  return {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
}
export function safeUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
export function missingTip(species, stageId=''){return stageId?!(species.tip_stage_ids||[]).includes(stageId):!species.has_general_tip}

export function validatePhotoSource(origin,url,photographer,confirmed){
 if(!confirmed)throw new Error('Please confirm the photo ownership or CC0 and Research Grade checks.');
 if(origin==='own')return {photo_origin:'own'};
 if(origin!=='inaturalist_cc0')throw new Error('Choose a supported photo source.');
 let source=null;
 if(url.trim()){
  try{source=new URL(url.trim())}catch{throw new Error('Enter a valid iNaturalist link, or leave it blank.');}
  if(source.protocol!=='https:'||!['www.inaturalist.org','inaturalist.org'].includes(source.hostname)||!/^\/(observations|photos)\/\d+\/?$/.test(source.pathname)||source.username||source.password||source.port)
   throw new Error('Use an https://www.inaturalist.org/observations/123 or /photos/123 link, or leave it blank.');
 }
 return {photo_origin:'inaturalist_cc0',source_url:source?.href||null,source_name:photographer.trim()||null};
}
