export const $=(s,r=document)=>r.querySelector(s);
export const $$=(s,r=document)=>[...r.querySelectorAll(s)];
export const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
export const slugify=s=>String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const rotateStyle=deg=>deg?`transform:rotate(${deg}deg);object-fit:contain;background:#111`:'';
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
