import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeName,validatePhoto,missingTip,safeUrl} from '../contribution-utils.js';
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
