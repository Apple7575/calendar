import fs from 'fs';
import path from 'path';
import {APP_ICON_NAMES,appIconName} from '../lib/appIcon';
import {routineDay} from '../lib/routineModel';
import {NOTIFICATION_FACE_POLICY,notificationFace,quietNight} from '../lib/notificationFace';

// S2-12 (Diana, 2026-11-07): the app icon's face on notifications, picked for the moment the notification goes off.
const on=(h:number,m=0,d=7)=>new Date(2026,10,d,h,m).getTime();
const today=routineDay(new Date(on(14)));
const animalOf=(name:string)=>name.split('-')[1];
const faceOf=(name:string)=>name.split('-')[0];

describe('a nudge about today follows the app icon rule',()=>{
 test('morning before the routine smiles, afternoon before it worries, done cheers',()=>{
  expect(faceOf(notificationFace({at:on(9),kind:'nudge',today,todayDone:false}))).toBe('smile');
  expect(faceOf(notificationFace({at:on(15),kind:'nudge',today,todayDone:false}))).toBe('worried');
  expect(faceOf(notificationFace({at:on(15),kind:'nudge',today,todayDone:true}))).toBe('cheer');
 });
 test('it is the app icon of that moment, animal and all',()=>{
  for(const h of [5,9,13,18])expect(notificationFace({at:on(h),kind:'nudge',today,todayDone:false})).toBe(appIconName(today,h,false));
 });
 test('at night a done day smiles instead of cheering; a day not done still worries',()=>{
  expect(faceOf(notificationFace({at:on(22),kind:'nudge',today,todayDone:true}))).toBe('smile');
  expect(faceOf(notificationFace({at:on(22),kind:'nudge',today,todayDone:false}))).toBe('worried');
 });
 test('a notification for a later day does not know that day yet: it counts as not done',()=>{
  const tomorrow=on(15,0,8);
  expect(notificationFace({at:tomorrow,kind:'nudge',today,todayDone:true})).toBe(appIconName(routineDay(new Date(tomorrow)),15,false));
 });
});

describe('a time the user chose never worries',()=>{
 test('done today cheers, otherwise it smiles, at any hour',()=>{
  for(let h=0;h<24;h++){
   const face=faceOf(notificationFace({at:on(h),kind:'chosen',today,todayDone:false}));
   expect(face).toBe('smile');
  }
  expect(faceOf(notificationFace({at:on(15),kind:'chosen',today,todayDone:true}))).toBe('cheer');
 });
 test('at night even a done day smiles',()=>expect(faceOf(notificationFace({at:on(23),kind:'chosen',today,todayDone:true}))).toBe('smile'));
 test('the animal is that day\'s app icon animal',()=>{
  const at=on(15,0,9);
  expect(animalOf(notificationFace({at,kind:'chosen',today,todayDone:false}))).toBe(animalOf(appIconName(routineDay(new Date(at)),15,false)));
 });
});

describe('quiet night is 21:00 to 04:30',()=>{
 test('edges',()=>{
  expect(quietNight(new Date(on(20,59)))).toBe(false);
  expect(quietNight(new Date(on(21,0)))).toBe(true);
  expect(quietNight(new Date(on(4,29)))).toBe(true);
  expect(quietNight(new Date(on(4,30)))).toBe(false);
 });
});

describe('the picture files',()=>{
 const dir=path.join(__dirname,'../../assets/notification-faces');
 const pngSize=(file:string)=>{const b=fs.readFileSync(file);return {w:b.readUInt32BE(16),h:b.readUInt32BE(20),png:b.toString('ascii',1,4)==='PNG'};};
 test('one 600×600 PNG for every app icon name, and every face picked is one of them',()=>{
  for(const name of APP_ICON_NAMES)expect(pngSize(path.join(dir,name+'.png'))).toEqual({w:NOTIFICATION_FACE_POLICY.size,h:NOTIFICATION_FACE_POLICY.size,png:true});
  for(const kind of ['nudge','chosen'] as const)for(let h=0;h<24;h++)for(const done of [true,false])expect(APP_ICON_NAMES).toContain(notificationFace({at:on(h),kind,today,todayDone:done}));
 });
 test('each stays small enough for the app bundle',()=>{
  for(const name of APP_ICON_NAMES)expect(fs.statSync(path.join(dir,name+'.png')).size).toBeLessThan(400*1024);
 });
});
