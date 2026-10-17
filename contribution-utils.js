export function normalizeName(value){return String(value||'').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US')}
export function validatePhoto(file){
  if(!file) throw new Error('Choose a photo.');
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Use a JPG, PNG, or WebP photo.');
  if(file.size>10*1024*1024)throw new Error('Photos must be 10 MB or smaller.');
  return {'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
}
export function safeUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
export function missingTip(species, stageId=''){return stageId?!(species.tip_stage_ids||[]).includes(stageId):!species.has_general_tip}
