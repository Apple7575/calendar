import {appIconName,appIconSlot,nextAppIcon,APP_ICON_NAMES} from '../lib/appIcon';
import {streakWidgetView} from '../lib/streakWidget';

const DAY='2026-11-06';

describe('앱 아이콘 규칙 (12시 기준, 하루 2칸)',()=>{
 test('04~12시는 오전 칸, 12~다음 날 04시는 오후 칸이다',()=>{
  expect(appIconSlot(4)).toBe('am');
  expect(appIconSlot(11)).toBe('am');
  expect(appIconSlot(12)).toBe('pm');
  expect(appIconSlot(23)).toBe('pm');
  expect(appIconSlot(3)).toBe('pm');
 });

 test('동물은 위젯과 같은 날짜 순서다',()=>{
  const animal=streakWidgetView(null,DAY,9).animal;
  expect(appIconName(DAY,9,false)).toBe(`smile-${animal}`);
 });

 test('오전은 웃는 얼굴, 오후에 안 했으면 걱정, 했으면 신난 얼굴',()=>{
  const animal=streakWidgetView(null,DAY,9).animal;
  expect(appIconName(DAY,9,false)).toBe(`smile-${animal}`);
  expect(appIconName(DAY,9,true)).toBe(`cheer-${animal}`);
  expect(appIconName(DAY,13,false)).toBe(`worried-${animal}`);
  expect(appIconName(DAY,13,true)).toBe(`cheer-${animal}`);
 });

 test('아이콘 이름 12개가 모두 정의돼 있다',()=>{
  expect(APP_ICON_NAMES).toHaveLength(12);
  expect(APP_ICON_NAMES).toContain(appIconName(DAY,13,false));
 });

 test('같은 칸에서는 한 번만 바꾼다',()=>{
  const first=nextAppIcon({last:null,current:null,day:DAY,hour:8,todayDone:false});
  expect(first).toEqual({icon:appIconName(DAY,8,false),last:{day:DAY,slot:'am'}});
  // 오전에 실천해도 오전 칸은 이미 바뀌어서 그대로
  expect(nextAppIcon({last:first!.last,current:first!.icon,day:DAY,hour:10,todayDone:true})).toBeNull();
  // 오후 칸으로 넘어가면 신난 얼굴
  expect(nextAppIcon({last:first!.last,current:first!.icon,day:DAY,hour:15,todayDone:true})).toEqual({icon:appIconName(DAY,15,true),last:{day:DAY,slot:'pm'}});
 });

 test('오후에 걱정 얼굴을 본 뒤 실천하면 한 번 더 신난 얼굴로 바꾼다',()=>{
  const worried=appIconName(DAY,13,false);
  const last={day:DAY,slot:'pm' as const};
  expect(nextAppIcon({last,current:worried,day:DAY,hour:20,todayDone:false})).toBeNull();
  expect(nextAppIcon({last,current:worried,day:DAY,hour:20,todayDone:true})).toEqual({icon:appIconName(DAY,20,true),last});
 });

 test('새벽 4시 전은 전날 오후 칸이다',()=>{
  const worried=appIconName(DAY,23,false);
  const last={day:DAY,slot:'pm' as const};
  expect(nextAppIcon({last,current:worried,day:DAY,hour:2,todayDone:false})).toBeNull();
 });

 test('하루 최대 3번이다 (오전 1, 오후 1, 걱정 뒤 실천 1)',()=>{
  let state={last:null as null|{day:string;slot:'am'|'pm'},current:null as string|null},changes=0;
  const steps:[number,boolean][]=[[5,false],[9,false],[11,false],[12,false],[14,false],[18,true],[21,true],[23,true]];
  for(const [hour,todayDone] of steps){
   const next=nextAppIcon({...state,day:DAY,hour,todayDone});
   if(next){changes++;state={last:next.last,current:next.icon};}
  }
  expect(changes).toBe(3);
  expect(state.current).toBe(appIconName(DAY,23,true));
 });

 test('이미 원하는 아이콘이면 바꾸지 않는다',()=>{
  expect(nextAppIcon({last:null,current:appIconName(DAY,9,false),day:DAY,hour:9,todayDone:false})).toBeNull();
 });
});

describe('앱 아이콘 파일과 설정',()=>{
 const fs=require('fs'),path=require('path');
 const root=path.join(__dirname,'..','..');
 const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8'));
 const plugin=app.expo.plugins.find((p:unknown)=>Array.isArray(p)&&p[0]==='expo-alternate-app-icons');
 test('규칙의 아이콘 12개가 모두 app.json에 있고 그림 파일이 있다',()=>{
  const {nativeIconName}=require('../lib/appIcon');
  const configured=new Map<string,string>(plugin[1].map((i:{name:string;ios:string})=>[i.name,i.ios]));
  expect(configured.size).toBe(12);
  for(const name of APP_ICON_NAMES){
   const file=configured.get(nativeIconName(name));
   expect(file).toBe(`./assets/app-icons/${name}.png`);
   expect(fs.existsSync(path.join(root,file!))).toBe(true);
  }
 });
});
