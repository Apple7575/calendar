import {contentBonus,emptyData,earned,getDay,routineDay} from '../lib/routineModel';
import {rewardSyncExtras} from '../lib/focusPenalty';
import {moneySummary,PROPOSED_MONEY_RATES,reconcileMoneyRewards,startMoneyRewards} from '../lib/moneyRewards';
import {makeBackup,validateBackup} from '../lib/routineBackup';
import {addContentIdea,CONTENT_PLATFORMS,contentIdeas,contentMonth,contentToday,contentUploads,contentWeek,parseContentLink,pickContentIdea,removeContentIdea,submitContentLink,unpickContentIdea} from '../lib/content';
import {timeWallet} from '../lib/timeWallet';
import {dailyTimeline} from '../lib/dailyTimeline';
import type {RoutineData} from '../lib/routineModel';

jest.mock('../lib/supabase',()=>({supabase:{}}));
const at=new Date(2026,10,5,9).getTime(),key=routineDay(new Date(at)),next=at+24*60*60*1000,user='00000000-0000-4000-8000-000000000000';
const reel=(id='Cabc_1-2')=>'https://www.instagram.com/reel/'+id+'/';
const short=(id='xYz_9-8')=>'https://www.youtube.com/shorts/'+id;

describe('reading a link',()=>{
 test.each([
  ['https://www.instagram.com/reel/AbC_1-z/','reels','AbC_1-z'],
  ['https://instagram.com/reel/AbC_1-z','reels','AbC_1-z'],
  ['instagram.com/reel/AbC_1-z/?igsh=abc&utm=1','reels','AbC_1-z'],
  ['http://m.instagram.com/reel/AbC_1-z/#x','reels','AbC_1-z'],
  ['  https://WWW.Instagram.COM/reel/AbC_1-z/  ','reels','AbC_1-z'],
  ['https://www.youtube.com/shorts/xYz_9-8','shorts','xYz_9-8'],
  ['https://m.youtube.com/shorts/xYz_9-8?feature=share','shorts','xYz_9-8'],
  ['youtube.com/shorts/xYz_9-8/','shorts','xYz_9-8'],
  ['https://youtu.be/xYz_9-8?si=abc','shorts','xYz_9-8'],
  ['youtu.be/xYz_9-8','shorts','xYz_9-8'],
  ['https://www.instagram.com/reels/AbC_1-z/','reels','AbC_1-z'],
 ])('%s is accepted',(url,platform,id)=>{
  expect(parseContentLink(url)).toMatchObject({platform,linkId:id,key:platform+':'+id});
 });
 test.each([
  [''],['그냥 글자'],
  ['https://www.instagram.com/p/AbC/'],['https://www.instagram.com/reel/'],['https://www.instagram.com/someone'],
  ['https://www.youtube.com/watch?v=abc'],['https://www.youtube.com/abc'],['https://youtu.be/'],['https://youtu.be/a/b'],['https://www.youtube.com/shorts/'],
  ['https://instagram.com.evil.example/reel/AbC'],['https://evil.example/instagram.com/reel/AbC'],['https://notinstagram.com/reel/AbC'],['https://evil.example/?u=youtube.com/shorts/abc'],
  ['https://www.instagram.com/reel/AbC/extra'],['https://www.youtube.com/shorts/a b'],['ftp://www.instagram.com/reel/AbC'],
  ['https://www.instagram.com/reel/'+'a'.repeat(200)],
 ])('%s is refused',url=>{
  expect(parseContentLink(url)).toBeNull();
 });
 test('ids differing only in capitals are different videos',()=>{
  expect(parseContentLink(short('AbC'))!.key).not.toBe(parseContentLink(short('abc'))!.key);
 });
 test('the same post written differently is one key',()=>{
  expect(parseContentLink('instagram.com/reel/abc?x=1')!.key).toBe(parseContentLink('https://m.instagram.com/reel/abc/')!.key);
  expect(parseContentLink('instagram.com/reels/abc')!.key).toBe(parseContentLink('instagram.com/reel/abc')!.key);
  expect(parseContentLink('https://youtu.be/abc?si=1')!.key).toBe(parseContentLink('https://youtube.com/shorts/abc')!.key);
 });
 test('every way of writing a post is kept as its one address',()=>{
  expect(parseContentLink('https://youtu.be/abc?si=1')!.url).toBe('https://www.youtube.com/shorts/abc');
  expect(parseContentLink('m.instagram.com/reels/abc/')!.url).toBe('https://www.instagram.com/reel/abc');
 });
});

describe('the platforms',()=>{
 test('reels and shorts only, at the agreed rewards',()=>{
  expect(CONTENT_PLATFORMS.map(p=>[p.id,p.minutes,p.won])).toEqual([['reels',60,10000],['shorts',120,20000]]);
 });
});

describe('what an upload pays',()=>{
 test('a reel pays 60 minutes',()=>{
  const d=submitContentLink(emptyData(),'a',reel(),at);
  expect(contentUploads(d)[0]).toMatchObject({platform:'reels',rewarded:true,minutes:60,won:10000,day:key,linkId:'Cabc_1-2'});
  expect(getDay(d,key).bonus?.content).toBe(60);
 });
 test('a short pays 120 minutes, and both on one day pay 180',()=>{
  const d=submitContentLink(submitContentLink(emptyData(),'a',reel(),at),'b',short(),at);
  expect(getDay(d,key).bonus?.content).toBe(180);
  expect(earned(getDay(d,key))).toBe(180);
 });
 test('a second reel the same day is kept with no reward',()=>{
  const d=submitContentLink(submitContentLink(emptyData(),'a',reel('one'),at),'b',reel('two'),at);
  expect(contentUploads(d)[1]).toMatchObject({rewarded:false,minutes:0,won:0});
  expect(getDay(d,key).bonus?.content).toBe(60);
  expect(contentToday(d,key).find(p=>p.id==='reels')).toMatchObject({count:2,rewarded:true});
 });
 test('the next routine day pays again, and 04:00 is the line',()=>{
  const d=submitContentLink(submitContentLink(emptyData(),'a',reel('one'),at),'b',reel('two'),next);
  expect(contentUploads(d)[1].rewarded).toBe(true);
  const before=new Date(2026,10,6,3,59).getTime(),after=new Date(2026,10,6,4,1).getTime();
  const late=submitContentLink(emptyData(),'a',reel('one'),before),day=routineDay(new Date(before));
  expect(contentUploads(late)[0].day).toBe(day);
  const third=submitContentLink(late,'b',reel('two'),after);
  expect(contentUploads(third)[1]).toMatchObject({rewarded:true,day:routineDay(new Date(after))});
 });
 test('a day with nothing has no penalty and nothing owed',()=>{
  expect(getDay(emptyData(),key).bonus?.content).toBeUndefined();
  expect(contentToday(emptyData(),key).every(p=>p.count===0&&!p.rewarded)).toBe(true);
 });
});

describe('the same link never counts twice',()=>{
 test('refused the same day',()=>{
  const d=submitContentLink(emptyData(),'a',reel(),at);
  expect(()=>submitContentLink(d,'b',reel(),at)).toThrow(/이미 인증한 링크/);
 });
 test('refused any later day, written any way',()=>{
  const d=submitContentLink(emptyData(),'a',reel('abc'),at);
  expect(()=>submitContentLink(d,'b','instagram.com/reel/abc?x=1',next)).toThrow(/이미 인증한 링크/);
  expect(()=>submitContentLink(d,'c','instagram.com/reels/abc',next)).toThrow(/이미 인증한 링크/);
  const s=submitContentLink(emptyData(),'a',short('abc'),at);
  expect(()=>submitContentLink(s,'b','https://youtu.be/abc?si=x',next)).toThrow(/이미 인증한 링크/);
 });
 test('still refused after the records are cleared',()=>{
  const d=submitContentLink(emptyData(),'a',reel('abc'),at);
  expect(()=>submitContentLink({...d,contentUploads:[]},'b',reel('abc'),next)).toThrow(/이미 인증한 링크/);
 });
 test('still refused when only the upload row is left',()=>{
  const d=submitContentLink(emptyData(),'a',reel('abc'),at);
  expect(()=>submitContentLink({...d,contentSeenLinks:undefined},'b',reel('abc'),next)).toThrow(/이미 인증한 링크/);
 });
 test('the same id on the other platform is another post',()=>{
  const d=submitContentLink(emptyData(),'a',reel('same'),at);
  expect(()=>submitContentLink(d,'b',short('same'),at)).not.toThrow();
 });
 test('pressing twice with one id pays once',()=>{
  const once=submitContentLink(emptyData(),'a',reel(),at);
  expect(submitContentLink(once,'a',reel(),at)).toBe(once);
 });
 test('a link that is not one is refused and changes nothing',()=>{
  expect(()=>submitContentLink(emptyData(),'a','https://www.instagram.com/p/abc/',at)).toThrow(/youtu\.be/);
 });
});

describe('ideas',()=>{
 const base=()=>addContentIdea(emptyData(),'i1','회로 외우는 법',at);
 test('are kept as one line, in order, and blank ones are refused',()=>{
  expect(contentIdeas(base())[0]).toMatchObject({id:'i1',text:'회로 외우는 법',stage:'idea'});
  expect(()=>addContentIdea(emptyData(),'x','   ',at)).toThrow();
 });
 test('long text is cut to one line of 200',()=>{
  expect(contentIdeas(addContentIdea(emptyData(),'x','가'.repeat(500),at))[0].text).toHaveLength(200);
  expect(contentIdeas(addContentIdea(emptyData(),'y','첫 줄\n둘째 줄',at))[0].text).toBe('첫 줄 둘째 줄');
 });
 test('at most 500 are kept, dropping old unstarted ones first',()=>{
  let d=emptyData();for(let i=0;i<510;i++)d=addContentIdea(d,'i'+i,'아이디어 '+i,at);
  expect(contentIdeas(d)).toHaveLength(500);
  expect(contentIdeas(d).some(x=>x.id==='i509')).toBe(true);
  expect(contentIdeas(d).some(x=>x.id==='i0')).toBe(false);
 });
 test('picking moves it to making, and back again',()=>{
  const d=pickContentIdea(base(),'i1',key);
  expect(contentIdeas(d)[0]).toMatchObject({stage:'making',pickedDay:key});
  expect(contentIdeas(unpickContentIdea(d,'i1'))[0].stage).toBe('idea');
 });
 test('an upload can finish the idea being made',()=>{
  const d=submitContentLink(pickContentIdea(base(),'i1',key),'u',reel(),at,'i1');
  expect(contentIdeas(d)[0]).toMatchObject({stage:'posted',uploadId:'u'});
  expect(contentUploads(d)[0].ideaId).toBe('i1');
 });
 test('a posted idea cannot be picked again or removed',()=>{
  const d=submitContentLink(pickContentIdea(base(),'i1',key),'u',reel(),at,'i1');
  expect(pickContentIdea(d,'i1',key)).toBe(d);
  expect(unpickContentIdea(d,'i1')).toBe(d);
  expect(removeContentIdea(d,'i1')).toBe(d);
 });
 test('an unstarted idea can be removed',()=>{
  expect(contentIdeas(removeContentIdea(base(),'i1'))).toEqual([]);
 });
 test('adding the same id twice changes nothing',()=>{
  const once=base();
  expect(addContentIdea(once,'i1','다른 말',at)).toBe(once);
 });
});

describe('the week and the calendar',()=>{
 test('the week runs Monday to Sunday and counts days with an upload',()=>{
  const wed=new Date(2026,10,4,9).getTime(),d=submitContentLink(submitContentLink(submitContentLink(emptyData(),'a',reel('a'),wed),'b',short('b'),wed),'c',reel('c'),at);
  const week=contentWeek(d,key);
  expect(week.days.map(x=>x.key)).toEqual(['2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07','2026-11-08']);
  expect(week.count).toBe(2);
 });
 test('a Sunday belongs to the week before it',()=>{
  expect(contentWeek(emptyData(),'2026-11-08').days[0].key).toBe('2026-11-02');
 });
 test('the month lists its uploads, newest first, and which platforms each day had',()=>{
  const d=submitContentLink(submitContentLink(emptyData(),'a',reel('a'),at),'b',short('b'),next),m=contentMonth(d,'2026-11');
  expect(m.uploads.map(u=>u.id)).toEqual(['b','a']);
  expect(m.days[key]).toEqual(['reels']);
  expect(contentMonth(d,'2026-12').uploads).toEqual([]);
 });
});

describe('every path that adds up time includes it',()=>{
 const fs=require('fs'),path=require('path');
 const read=(f:string)=>fs.readFileSync(path.join(__dirname,'../..',f),'utf8') as string;
 const paid=submitContentLink(emptyData(),'a',short(),at);
 const native={supported:true,authorized:true,enabled:true,rewardMode:true,day:key,grantedMinutes:120,consumedMinutes:0,morningComplete:true,usingRewards:true,policyVersion:2,locked:false} as any;
 test('earned and the wallet: nothing pending once the device has it',()=>{
  expect(timeWallet(getDay(paid,key),key,native)).toMatchObject({localEarned:120,pending:0,credited:120,balance:120});
 });
 test('pending until the device has it',()=>{
  expect(timeWallet(getDay(paid,key),key,{...native,grantedMinutes:0}).pending).toBe(120);
 });
 test('it adds to speaking and the others',()=>{
  const day=getDay(paid,key);
  expect(earned({...day,bonus:{...day.bonus,speaking:5}})).toBe(125);
 });
 test('the provider sends it again when it changes',()=>{
  const source=read('src/features/routine/RoutineProvider.tsx');
  expect(source).toContain('bonus?.content,');
  expect(source).toContain('native?.supportsContentRewards');
 });
 test('Swift: the balance is the sum of every ledger entry',()=>{
  expect(read('modules/routine-screen-time/ios/ScreenTimeState.swift')).toContain('(state.paid ?? [:]).values.reduce(0, +)');
 });
 test('the day record, wallet screen and rules list name it',()=>{
  expect(dailyTimeline(paid,key,null).totals.earnedMinutes).toBe(120);
  expect(read('src/features/routine/DailyTimeline.tsx')).toContain('ContentDayRecords');
  expect(read('src/features/routine/TimeWalletScreen.tsx')).toContain('bonus?.content');
  expect(read('src/features/routine/RewardSourcesCard.tsx')).toContain("'콘텐츠'");
 });
 test('upload time is not study time',()=>{
  expect(dailyTimeline(paid,key,null).totals.studySeconds).toBe(0);
 });
});

describe('money',()=>{
 const wallet=()=>startMoneyRewards(emptyData(),key,'w',PROPOSED_MONEY_RATES,new Date(at));
 test('10,000 and 20,000 won, once each',()=>{
  const before=wallet(),one=reconcileMoneyRewards(before,submitContentLink(before,'a',reel(),at),key,new Date(at)),two=reconcileMoneyRewards(one,submitContentLink(one,'b',short(),at),key,new Date(at));
  expect(two.money!.entries.find(e=>e.id==='content:a')?.amount).toBe(10000);
  expect(two.money!.entries.find(e=>e.id==='content:b')?.amount).toBe(20000);
  expect(moneySummary(two).balance).toBe(30000);
  expect(reconcileMoneyRewards(two,two,key,new Date(at)).money!.entries).toHaveLength(two.money!.entries.length);
 });
 test('a second upload with no reward pays no money',()=>{
  const before=wallet(),one=reconcileMoneyRewards(before,submitContentLink(before,'a',reel('a'),at),key,new Date(at)),two=reconcileMoneyRewards(one,submitContentLink(one,'b',reel('b'),at),key,new Date(at));
  expect(two.money!.entries.some(e=>e.id==='content:b')).toBe(false);
 });
 test('uploads from before the wallet started are not paid back',()=>{
  const old=submitContentLink(emptyData(),'a',reel(),at),started=startMoneyRewards(old,key,'w',PROPOSED_MONEY_RATES,new Date(at));
  expect(reconcileMoneyRewards(started,started,key,new Date(at)).money!.entries.some(e=>e.id==='content:a')).toBe(false);
 });
});

describe('saved data never blocks the app',()=>{
 test('earlier data has none of it',()=>{
  expect(contentUploads(emptyData())).toEqual([]);
  expect(contentIdeas(emptyData())).toEqual([]);
 });
 test.each([['text'],[{}],[[null,5,{id:1}]]])('broken rows %j are skipped',bad=>{
  const d={...emptyData(),contentUploads:bad as never,contentIdeas:bad as never,contentSeenLinks:bad as never};
  expect(contentUploads(d)).toEqual([]);
  expect(contentIdeas(d)).toEqual([]);
  expect(()=>submitContentLink(d,'a',reel(),at)).not.toThrow();
  expect(()=>validateBackup(makeBackup(d,user),user)).not.toThrow();
 });
 test.each([[0,0],[60,60],[120,120],[180,180],[61,0],[-60,0],['x',0],[NaN,0],[240,0]])('a saved bonus of %j counts as %j',(value,counted)=>{
  const day={...getDay(emptyData(),key),bonus:{content:value as number}};
  expect(contentBonus(day)).toBe(counted);
  expect(earned(day)).toBe(counted);
 });
 test('goes through a backup',()=>{
  expect(()=>validateBackup(makeBackup(submitContentLink(addContentIdea(emptyData(),'i','아이디어',at),'a',reel(),at),user),user)).not.toThrow();
 });
});

describe('the device',()=>{
 const d=submitContentLink(emptyData(),'a',reel(),at);
 const fs=require('fs'),path=require('path');
 const read=(f:string)=>fs.readFileSync(path.join(__dirname,'../..',f),'utf8') as string;
 test('a build that knows it gets the minutes',()=>{
  expect(rewardSyncExtras(d,key,{supportsHandwritingRewards:true,supportsMinuteHandwriting:true,supportsContentRewards:true})).toMatchObject({content:60});
 });
 test('a build that does not is never sent them',()=>{
  expect(rewardSyncExtras(d,key,{supportsHandwritingRewards:true,supportsMinuteHandwriting:true})).not.toHaveProperty('content');
 });
 test('a broken value is never sent, which would fail the whole sync',()=>{
  const broken={...d,days:{...d.days,[key]:{...getDay(d,key),bonus:{content:61}}}};
  expect(rewardSyncExtras(broken,key,{supportsHandwritingRewards:true,supportsMinuteHandwriting:true,supportsContentRewards:true})).toMatchObject({content:0});
 });
 test('Swift allows only these values, adds them to the ledger and says it can',()=>{
  expect(read('modules/routine-screen-time/ios/RoutineScreenTimeModule.swift')).toContain('"content": [0, 60, 120, 180]');
  expect(read('modules/routine-screen-time/ios/ScreenTimeState.swift')).toContain('"supportsContentRewards": true');
  expect(read('targets/screentime/ScreenTimeState.swift')).toBe(read('modules/routine-screen-time/ios/ScreenTimeState.swift'));
 });
});
