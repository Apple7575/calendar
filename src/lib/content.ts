import type {RoutineData} from './routineModel';
import {contentBonus,routineDay,withDay} from './routineModel';
import {addDays} from './dateUtils';

/**
 * Upload rewards (user decision 2026-11-05). Uploading is hard, so it pays well. To add a platform, add a row here. A link
 * proves the upload: the work happens on a laptop, so a screenshot would only get in the way. Only the form is checked:
 * the app cannot see whether the post exists or whose it is. Each platform pays once a routine day, with no penalty for a day missed.
 */
export type ContentPlatformId='reels'|'shorts';
export type ContentPlatform={id:ContentPlatformId;title:string;minutes:number;won:number;links:readonly {host:string;path?:string}[];home:string};
export const CONTENT_PLATFORMS:readonly ContentPlatform[]=[
 {id:'reels',title:'인스타 릴스',minutes:60,won:10000,links:[{host:'instagram.com',path:'reel'},{host:'instagram.com',path:'reels'}],home:'https://www.instagram.com/reel/'},
 {id:'shorts',title:'유튜브 쇼츠',minutes:120,won:20000,links:[{host:'youtube.com',path:'shorts'},{host:'youtu.be'}],home:'https://www.youtube.com/shorts/'},
];
export const CONTENT_IDEA_CHARS=200;
const MAX_IDEAS=500;
export type ContentUpload={id:string;key:string;platform:ContentPlatformId;linkId:string;url:string;at:string;day:string;rewarded:boolean;minutes:number;won:number;ideaId?:string};
/** refs and why came later (build 53): old ideas have neither, and a broken value drops only that field, never the idea. */
export type ContentIdea={id:string;text:string;at:string;stage:'idea'|'making'|'posted';pickedDay?:string;uploadId?:string;refs?:string[];why?:string};
export const IDEA_REFS_MAX=5;
export const IDEA_WHY_CHARS=40;

/**
 * Reference links on an idea: someone else's video that sparked it. Only Instagram, YouTube, TikTok and Threads, read as
 * strictly as upload links, and always kept as an https address rebuilt from the parts, so whatever is stored can be opened.
 * No thumbnail is fetched; the label names the kind of post.
 */
const ID='([A-Za-z0-9_-]{1,64})',USER='@([A-Za-z0-9_.]{1,64})';
const REF_KINDS:readonly {label:string;hosts:readonly string[];path:RegExp;url:(m:string[])=>string}[]=[
 {label:'인스타 릴스',hosts:['instagram.com'],path:new RegExp(`^/reels?/${ID}/?$`),url:m=>'https://www.instagram.com/reel/'+m[1]+'/'},
 {label:'인스타 게시물',hosts:['instagram.com'],path:new RegExp(`^/p/${ID}/?$`),url:m=>'https://www.instagram.com/p/'+m[1]+'/'},
 {label:'유튜브 쇼츠',hosts:['youtube.com'],path:new RegExp(`^/shorts/${ID}/?$`),url:m=>'https://www.youtube.com/shorts/'+m[1]},
 {label:'유튜브 영상',hosts:['youtube.com'],path:new RegExp(`^/watch\\?(?:.*&)?v=${ID}(?:&.*)?$`),url:m=>'https://www.youtube.com/watch?v='+m[1]},
 {label:'유튜브 영상',hosts:['youtu.be'],path:new RegExp(`^/${ID}/?$`),url:m=>'https://youtu.be/'+m[1]},
 {label:'틱톡',hosts:['tiktok.com'],path:new RegExp(`^/${USER}/video/([0-9]{1,32})/?$`),url:m=>'https://www.tiktok.com/@'+m[1]+'/video/'+m[2]},
 {label:'틱톡',hosts:['vm.tiktok.com','vt.tiktok.com'],path:/^\/([A-Za-z0-9]{1,32})\/?$/,url:m=>'https://vm.tiktok.com/'+m[1]+'/'},
 {label:'스레드',hosts:['threads.net','threads.com'],path:new RegExp(`^/${USER}/post/${ID}/?$`),url:m=>'https://www.threads.com/@'+m[1]+'/post/'+m[2]},
];
/** Reads a pasted link. Tracking after ? or # is dropped, except YouTube's v=, which is the video itself. */
export function parseRefLink(raw:unknown):{label:string;url:string}|null{
 if(typeof raw!=='string'||raw.trim().length>300)return null;
 const m=/^(?:https?:\/\/)?(?:www\.|m\.)?([a-z0-9.-]+)(\/[^\s#]*)(?:#\S*)?$/i.exec(raw.trim());
 if(!m)return null;
 const host=m[1].toLowerCase(),full=m[2],path=full.split('?')[0];
 for(const k of REF_KINDS){
  if(!k.hosts.includes(host))continue;
  const hit=k.path.exec(k.path.source.includes('watch')?full:path);
  if(hit)return {label:k.label,url:k.url(hit)};
 }
 return null;
}
/** Only an https address that reads back as itself is opened. */
export const openableRef=(url:string)=>url.startsWith('https://')&&parseRefLink(url)?.url===url;
const cleanRefs=(refs:unknown)=>{
 if(!Array.isArray(refs))return undefined;
 const out=[...new Set(refs.map(r=>parseRefLink(r)?.url).filter((u):u is string=>!!u))].slice(0,IDEA_REFS_MAX);
 return out.length?out:undefined;
};
const cleanWhy=(why:unknown)=>{
 if(typeof why!=='string')return undefined;
 const line=why.replace(/\s+/g,' ').trim().slice(0,IDEA_WHY_CHARS);
 return line||undefined;
};
/** The idea with its optional fields kept only when they are sound. */
function cleanIdea(full:ContentIdea):ContentIdea{
 if(!('refs' in full)&&!('why' in full))return full;
 const {refs,why,...idea}=full,r=cleanRefs(refs),w=cleanWhy(why);
 return {...idea,...(r?{refs:r}:{}),...(w?{why:w}:{})};
}

/** Host and path are read strictly, so a look-alike address or a link tucked inside another cannot pass. Each way of writing a post comes down to one key. */
export function parseContentLink(raw:string){
 const m=/^(?:https?:\/\/)?(?:www\.|m\.)?([a-z0-9.-]+)\/(?:([a-z]+)\/)?([A-Za-z0-9_-]{1,64})\/?(?:[?#]\S*)?$/i.exec(raw.trim());
 if(!m)return null;
 const host=m[1].toLowerCase(),path=m[2]?.toLowerCase(),platform=CONTENT_PLATFORMS.find(p=>p.links.some(l=>l.host===host&&l.path===path));
 if(!platform)return null;
 return {platform:platform.id,linkId:m[3],key:platform.id+':'+m[3],url:platform.home+m[3]};
}
/** Saved values are never trusted: a broken row is skipped and never blocks loading. */
const validUpload=(u:ContentUpload|null|undefined):u is ContentUpload=>!!u&&typeof u==='object'&&typeof u.id==='string'&&typeof u.key==='string'&&typeof u.day==='string'&&typeof u.url==='string'&&CONTENT_PLATFORMS.some(p=>p.id===u.platform);
const validIdea=(i:ContentIdea|null|undefined):i is ContentIdea=>!!i&&typeof i==='object'&&typeof i.id==='string'&&typeof i.text==='string'&&['idea','making','posted'].includes(i.stage);
export const contentUploads=(data:RoutineData):ContentUpload[]=>Array.isArray(data.contentUploads)?data.contentUploads.filter(validUpload):[];
export const contentIdeas=(data:RoutineData):ContentIdea[]=>Array.isArray(data.contentIdeas)?data.contentIdeas.filter(validIdea).map(cleanIdea):[];
const seenLinks=(data:RoutineData)=>Array.isArray(data.contentSeenLinks)?data.contentSeenLinks.filter((k):k is string=>typeof k==='string'):[];

/**
 * Records a link and pays it if it is the platform's first today. Keys stay in their own list for good, so clearing records
 * can never make an old link count again. Pressing twice with one id changes nothing.
 */
export function submitContentLink(data:RoutineData,id:string,raw:string,now=Date.now(),ideaId?:string):RoutineData{
 const uploads=contentUploads(data);if(uploads.some(u=>u.id===id))return data;
 const link=parseContentLink(raw);if(!link)throw new Error('인스타 릴스나 유튜브 쇼츠 링크만 받아요. 예: instagram.com/reel/…, youtube.com/shorts/…, youtu.be/…');
 const seen=seenLinks(data);if(seen.includes(link.key)||uploads.some(u=>u.key===link.key))throw new Error('이미 인증한 링크예요. 새로 올린 영상의 링크를 넣어 주세요.');
 const platform=CONTENT_PLATFORMS.find(p=>p.id===link.platform)!,date=new Date(now),day=routineDay(date),rewarded=!uploads.some(u=>u.platform===link.platform&&u.day===day&&u.rewarded);
 const idea=ideaId?contentIdeas(data).find(i=>i.id===ideaId&&i.stage!=='posted'):undefined;
 const upload:ContentUpload={id,key:link.key,platform:link.platform,linkId:link.linkId,url:link.url,at:date.toISOString(),day,rewarded,minutes:rewarded?platform.minutes:0,won:rewarded?platform.won:0,...(idea?{ideaId:idea.id}:{})};
 const next:RoutineData={...data,contentUploads:[...uploads,upload],contentSeenLinks:[...seen,link.key],...(idea?{contentIdeas:contentIdeas(data).map(i=>i.id===idea.id?{...i,stage:'posted' as const,uploadId:id}:i)}:{})};
 return rewarded?withDay(next,day,d=>({...d,bonus:{...d.bonus,content:contentBonus(d)+platform.minutes}})):next;
}
export function contentToday(data:RoutineData,key:string){
 const today=contentUploads(data).filter(u=>u.day===key);
 return CONTENT_PLATFORMS.map(p=>{const rows=today.filter(u=>u.platform===p.id);return {...p,count:rows.length,rewarded:rows.some(u=>u.rewarded)}});
}
/** Monday to Sunday, around a routine day. */
export function contentWeek(data:RoutineData,key:string){
 const [y,m,d]=key.split('-').map(Number),weekday=new Date(y,m-1,d).getDay(),monday=addDays(key,-((weekday+6)%7)),active=new Set(contentUploads(data).map(u=>u.day));
 const days=Array.from({length:7},(_,i)=>{const day=addDays(monday,i);return {key:day,uploaded:active.has(day)}});
 return {days,count:days.filter(x=>x.uploaded).length};
}
export function contentMonth(data:RoutineData,month:string){
 const uploads=contentUploads(data).filter(u=>u.day.startsWith(month+'-')).reverse(),days:Record<string,ContentPlatformId[]>={};
 for(const u of [...uploads].reverse())days[u.day]=[...new Set([...(days[u.day]??[]),u.platform])];
 return {uploads,days};
}
export const contentUploadsOn=(data:RoutineData,day:string)=>contentUploads(data).filter(u=>u.day===day);

/** One line. When the list is full the oldest ideas not yet started go first. */
export function addContentIdea(data:RoutineData,id:string,text:string,now=Date.now()):RoutineData{
 const ideas=contentIdeas(data);if(ideas.some(i=>i.id===id))return data;
 const line=text.replace(/\s+/g,' ').trim().slice(0,CONTENT_IDEA_CHARS);if(!line)throw new Error('아이디어를 한 줄 적어 주세요.');
 const all=[...ideas,{id,text:line,at:new Date(now).toISOString(),stage:'idea' as const}];
 let extra=all.length-MAX_IDEAS;
 return {...data,contentIdeas:extra>0?all.filter(i=>i.stage!=='idea'||extra--<=0):all};
}
const changeIdea=(data:RoutineData,id:string,change:(i:ContentIdea)=>ContentIdea|null):RoutineData=>{
 const ideas=contentIdeas(data),idea=ideas.find(i=>i.id===id);if(!idea||idea.stage==='posted')return data;
 const next=change(idea);
 return {...data,contentIdeas:next?ideas.map(i=>i===idea?next:i):ideas.filter(i=>i!==idea)};
};
export const pickContentIdea=(data:RoutineData,id:string,day:string)=>changeIdea(data,id,i=>({...i,stage:'making',pickedDay:day}));
export const unpickContentIdea=(data:RoutineData,id:string)=>changeIdea(data,id,({pickedDay:_gone,...i})=>({...i,stage:'idea'}));
export const removeContentIdea=(data:RoutineData,id:string)=>changeIdea(data,id,()=>null);
/** Adds a reference link to an idea not yet posted. A bad, repeated or sixth link throws with a sentence to show. */
export function addIdeaRef(data:RoutineData,id:string,raw:string):RoutineData{
 const ref=parseRefLink(raw);if(!ref)throw new Error('인스타·유튜브·틱톡·스레드 영상 링크만 붙일 수 있어요.');
 const idea=contentIdeas(data).find(i=>i.id===id),refs=idea?.refs??[];
 if(refs.includes(ref.url))throw new Error('이미 붙인 링크예요.');
 if(refs.length>=IDEA_REFS_MAX)throw new Error('참고 링크는 '+IDEA_REFS_MAX+'개까지예요.');
 return changeIdea(data,id,i=>({...i,refs:[...refs,ref.url]}));
}
export const removeIdeaRef=(data:RoutineData,id:string,url:string)=>changeIdea(data,id,({refs,...i})=>{const r=(refs??[]).filter(u=>u!==url);return r.length?{...i,refs:r}:i});
/** One short line on why the idea is good. Empty clears it. */
export const setIdeaWhy=(data:RoutineData,id:string,text:string)=>changeIdea(data,id,({why:_old,...i})=>{const w=cleanWhy(text);return w?{...i,why:w}:i});
