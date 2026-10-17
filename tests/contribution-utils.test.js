import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeName,validatePhoto,missingTip,safeUrl,validatePhotoSource} from '../contribution-utils.js';
test('species spelling and case normalize consistently',()=>assert.equal(normalizeName(' WHITE   Snakeroot '),'white snakeroot'));
test('photo validation checks format and size',()=>{
 assert.equal(validatePhoto({type:'image/jpeg',size:1000}),'jpg');
 assert.throws(()=>validatePhoto({type:'image/svg+xml',size:1000}),/JPG/);
 assert.throws(()=>validatePhoto({type:'image/jpeg',size:10485761}),/10 MB/);
});
test('general and stage tip needs are independent',()=>{
 const sp={has_general_tip:true,tip_stage_ids:['flower']};
 assert.equal(missingTip(sp),false);assert.equal(missingTip(sp,'bare'),true);assert.equal(missingTip(sp,'flower'),false);
});
test('reference urls reject executable schemes',()=>{
 assert.equal(safeUrl('javascript:alert(1)'),'');assert.equal(safeUrl('https://example.org/'),'https://example.org/');
});

test('iNaturalist sources require the original creator, source link, and explicit checks',()=>{
 assert.deepEqual(validatePhotoSource('own','','',true),{photo_origin:'own'});
 assert.equal(validatePhotoSource('inaturalist_cc0','https://www.inaturalist.org/observations/123','Photographer',true).source_name,'Photographer');
 for(const url of ['https://inaturalist.org.evil.test/observations/123','https://evil.test/','javascript:alert(1)','https://www.inaturalist.org/people/123'])assert.throws(()=>validatePhotoSource('inaturalist_cc0',url,'Creator',true));
 assert.throws(()=>validatePhotoSource('inaturalist_cc0','https://www.inaturalist.org/photos/123','',true),/photographer/);
 assert.throws(()=>validatePhotoSource('inaturalist_cc0','https://www.inaturalist.org/photos/123','Creator',false),/confirm/);
});
