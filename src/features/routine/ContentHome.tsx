import React,{useRef,useState} from 'react';
import {Linking,Pressable,View} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MicButton} from '../../components/MicButton';
import {addContentIdea,addIdeaRef,CONTENT_IDEA_CHARS,IDEA_REFS_MAX,IDEA_WHY_CHARS,openableRef,parseRefLink,removeIdeaRef,setIdeaWhy,CONTENT_PLATFORMS,contentIdeas,contentMonth,contentToday,contentWeek,parseContentLink,pickContentIdea,removeContentIdea,submitContentLink,unpickContentIdea,type ContentIdea,type ContentUpload} from '../../lib/content';
import {rewardChange} from '../../lib/rewardChange';
import type {RoutineData} from '../../lib/routineModel';
import {RootStackParamList} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeContext';
import {control,radii,space} from '../../theme/tokens';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,CharacterPeek,Choice,Copy,Field,Icon,Link,Notice} from './ui';

const WEEK=['월','화','수','목','금','토','일'];
const STAGES:{id:ContentIdea['stage'];label:string}[]=[{id:'idea',label:'아이디어'},{id:'making',label:'만드는 중'},{id:'posted',label:'올림'}];
const won=(n:number)=>n.toLocaleString('ko-KR')+'원';
const titleOf=(id:string)=>CONTENT_PLATFORMS.find(p=>p.id===id)?.title??'';
const dateLabel=(key:string)=>Number(key.slice(5,7))+'월 '+Number(key.slice(8,10))+'일';

function TodayCard(p:ReturnType<typeof contentToday>[number]){
 const {colors:c}=useTheme();
 return <View style={{flex:1,minWidth:0,gap:space.xxs,padding:space.sm,borderRadius:radii.control,backgroundColor:p.rewarded?c.primarySoft:c.inputBg}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:space.xxs}}>{p.rewarded?<Icon name="checkmark-circle" size={18} color={c.primary}/>:null}<Copy variant="label" numberOfLines={1}>{p.title}</Copy></View>
  <Copy variant="caption" muted>{p.rewarded?'오늘 받았어요':'아직이에요'}</Copy>
  <Copy variant="caption">{p.minutes/60+'시간 · '+won(p.won)}</Copy>
 </View>;
}
const SHORT:Record<string,string>={'인스타 릴스':'릴스','인스타 게시물':'인스타','유튜브 쇼츠':'쇼츠','유튜브 영상':'유튜브'};
/** A reference video, named by its kind instead of a thumbnail. Only an address that reads back as itself is opened. */
function RefChip({url,index,onRemove}:{url:string;index:number;onRemove?:()=>void}){
 const {colors:c}=useTheme(),full=parseRefLink(url)?.label??'링크',label=full+' '+(index+1),short=(SHORT[full]??full)+' '+(index+1);
 return <View style={{flexDirection:'row',alignItems:'center',borderRadius:radii.chip,borderWidth:1,borderColor:c.border,backgroundColor:c.card}}>
  <Pressable accessibilityRole="link" accessibilityLabel={label+' 열기'} onPress={()=>{if(openableRef(url))void Linking.openURL(url).catch(()=>{})}} style={{flexDirection:'row',alignItems:'center',gap:space.xxs,minHeight:control.touch,paddingLeft:space.sm,paddingRight:onRemove?space.xxs:space.sm}}>
   <Icon name="play-circle-outline" size={17} color={c.text}/><Copy variant="caption">{short}</Copy>
  </Pressable>
  {onRemove?<Pressable accessibilityRole="button" accessibilityLabel={label+' 빼기'} onPress={onRemove} style={{width:control.touch,height:control.touch,alignItems:'center',justifyContent:'center'}}><Icon name="close" size={16}/></Pressable>:null}
 </View>;
}
function Refs({idea,onRemove}:{idea:ContentIdea;onRemove?:(url:string)=>void}){
 if(!idea.refs?.length)return null;
 return <View testID={'idea-refs-'+idea.id} style={{flexDirection:'row',flexWrap:'wrap',gap:space.xs}}>{idea.refs.map((u,n)=><RefChip key={u} url={u} index={n} onRemove={onRemove?()=>onRemove(u):undefined}/>)}</View>;
}
type Save=(fn:(s:RoutineData)=>RoutineData)=>Promise<boolean>;
const oneLine=(t:string)=>t.replace(/\s+/g,' ').trim();
/** Reference links and the why line, opened under one idea at a time. */
function RefEditor({idea,change}:{idea:ContentIdea;change:Save}){
 const {colors:c}=useTheme(),[link,setLink]=useState(''),[why,setWhy]=useState(idea.why??''),[error,setError]=useState(''),prefix=useRef('');
 const full=(idea.refs?.length??0)>=IDEA_REFS_MAX,parsed=parseRefLink(link),whyChanged=(idea.why??'')!==oneLine(why);
 const spoken=(t:string)=>setWhy((prefix.current+(prefix.current?' ':'')+t).slice(0,IDEA_WHY_CHARS));
 const add=async(raw:string)=>{
  setError('');
  if(!parseRefLink(raw)){setError('인스타·유튜브·틱톡·스레드 영상 링크만 붙일 수 있어요.');return}
  if(await change(s=>addIdeaRef(s,idea.id,raw)))setLink('');
 };
 const paste=async()=>{
  try{const text=(await Clipboard.getStringAsync()).trim();if(!text){setError('복사한 링크가 없어요.');return}setLink(text);await add(text)}
  catch{setError('복사한 내용을 읽지 못했어요. 링크 칸에 직접 붙여 넣어 주세요.')}
 };
 return <View testID={'idea-editor-'+idea.id} style={{gap:space.xs,padding:space.sm,borderRadius:radii.control,backgroundColor:c.inputBg}}>
  <View style={{flexDirection:'row',alignItems:'flex-end',gap:space.xs}}>
   <View style={{flex:1,minWidth:0}}><Field label="왜 좋았나 (선택)" value={why} onChangeText={setWhy} maxLength={IDEA_WHY_CHARS} placeholder="예: 첫 3초에 질문을 던져서"/></View>
   <View style={{paddingBottom:2}}><MicButton size={control.touch} onText={spoken} onPartial={spoken} onListeningChange={on=>{if(on)prefix.current=why}}/></View>
  </View>
  {whyChanged?<Action secondary compact label="메모 저장" onPress={()=>void change(s=>setIdeaWhy(s,idea.id,why))}/>:null}
  <Refs idea={idea} onRemove={url=>void change(s=>removeIdeaRef(s,idea.id,url))}/>
  {full?<Copy variant="caption" muted>{'참고 링크는 '+IDEA_REFS_MAX+'개까지예요. 하나를 빼면 더 붙일 수 있어요.'}</Copy>:<>
   <Action compact icon="clipboard-outline" label="복사한 링크 붙이기" accessibilityLabel="복사한 링크 붙이기" onPress={()=>void paste()}/>
   <Field label="참고 링크" value={link} onChangeText={v=>{setLink(v);setError('')}} maxLength={300} placeholder="인스타·유튜브·틱톡·스레드 링크" helper={parsed?parsed.label+' 링크예요':undefined}/>
   {link.trim()?<Action secondary compact label="링크 넣기" onPress={()=>void add(link)}/>:null}
  </>}
  {error?<Notice tone="error">{error}</Notice>:null}
 </View>;
}
/** The idea's place in 아이디어 → 만드는 중 → 올림. While making, its references sit right under the title so they are at hand. */
function IdeaRow({idea,today,open,onToggle,change,onPick,onUnpick,onRemove}:{idea:ContentIdea;today:string;open:boolean;onToggle:()=>void;change:Save;onPick:()=>void;onUnpick:()=>void;onRemove:()=>void}){
 const at=STAGES.findIndex(s=>s.id===idea.stage),{colors:c}=useTheme(),making=idea.stage==='making',count=idea.refs?.length??0;
 const edit=<Link label={open?'닫기':count?'참고 '+count+'개 · 고치기':'참고 링크·메모'} onPress={onToggle}/>;
 return <View testID={'idea-'+idea.id} style={{gap:space.xs,paddingVertical:space.xs}}>
  <Copy>{idea.text}</Copy>
  {making&&!open?<Refs idea={idea}/>:null}
  {idea.why&&!open?<Copy variant="caption" muted>{'왜 좋았나 · '+idea.why}</Copy>:null}
  {!making&&!open?<Refs idea={idea}/>:null}
  <View style={{flexDirection:'row',gap:space.xxs,flexWrap:'wrap',alignItems:'center'}}>{STAGES.map((s,i)=><React.Fragment key={s.id}>{i?<Icon name="chevron-forward" size={12} color={c.textMuted}/>:null}<Copy variant="caption" muted={i!==at} weight={i===at?'700':undefined}>{s.label}</Copy></React.Fragment>)}</View>
  {open?<RefEditor idea={idea} change={change}/>:null}
  {idea.stage==='idea'?<View style={{flexDirection:'row',gap:space.md,alignItems:'center',flexWrap:'wrap'}}><Link label="오늘 만들기" onPress={onPick}/>{edit}<View style={{marginLeft:'auto'}}><Link muted label="지우기" onPress={onRemove}/></View></View>:null}
  {making?<View style={{flexDirection:'row',gap:space.md,alignItems:'center',flexWrap:'wrap'}}><Link label="아이디어로 되돌리기" onPress={onUnpick}/>{edit}{idea.pickedDay&&idea.pickedDay!==today?<Copy variant="caption" muted>{dateLabel(idea.pickedDay)}에 골랐어요</Copy>:null}</View>:null}
 </View>;
}
function Calendar({month,days,today}:{month:string;days:Record<string,string[]>;today:string}){
 const {colors:c}=useTheme(),[y,m]=month.split('-').map(Number),first=(new Date(y,m-1,1).getDay()+6)%7,count=new Date(y,m,0).getDate();
 const cells=[...Array(first).fill(null),...Array.from({length:count},(_,i)=>i+1)];
 return <View style={{flexDirection:'row',flexWrap:'wrap'}}>
  {WEEK.map(w=><View key={w} style={{width:'14.28%',alignItems:'center',paddingBottom:space.xxs}}><Copy variant="caption" muted>{w}</Copy></View>)}
  {cells.map((n,i)=>{
   if(!n)return <View key={'e'+i} style={{width:'14.28%'}}/>;
   const key=month+'-'+String(n).padStart(2,'0'),done=days[key]??[];
   return <View key={key} accessibilityLabel={dateLabel(key)+(done.length?' '+done.map(titleOf).join(', ')+' 업로드':'')} style={{width:'14.28%',alignItems:'center',paddingVertical:space.xxs,gap:2}}>
    <Copy variant="caption" muted={key!==today} weight={key===today?'700':undefined}>{String(n)}</Copy>
    <View style={{flexDirection:'row',gap:2,height:6}}>{done.map(id=><View key={id} style={{width:6,height:6,borderRadius:3,backgroundColor:id==='reels'?c.primary:c.text}}/>)}</View>
   </View>;
  })}
 </View>;
}
function LinkRow({upload}:{upload:ContentUpload}){
 return <Pressable accessibilityRole="link" accessibilityLabel={titleOf(upload.platform)+' 링크 열기'} onPress={()=>void Linking.openURL(upload.url).catch(()=>{})} style={{minHeight:control.touch,justifyContent:'center',paddingVertical:space.xxs}}>
  <Copy variant="label">{dateLabel(upload.day)+' · '+titleOf(upload.platform)}</Copy>
  <Copy variant="caption" muted numberOfLines={1}>{upload.url.replace('https://www.','')}</Copy>
  <Copy variant="caption" muted>{upload.rewarded?'+'+upload.minutes/60+'시간 · '+won(upload.won):'기록만 남겼어요'}</Copy>
 </Pressable>;
}

/** The content section of the study tab: today's two uploads and the link to prove one, ideas, then the month. */
export function ContentHome(){
 const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),{data,dayKey,ready,update}=useRoutine(),{colors:c}=useTheme();
 const [link,setLink]=useState(''),[idea,setIdea]=useState(''),[editing,setEditing]=useState<string>(),[chosen,setChosen]=useState<string>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[note,setNote]=useState(''),[month,setMonth]=useState(dayKey.slice(0,7)),prefix=useRef('');
 const today=contentToday(data,dayKey),week=contentWeek(data,dayKey),ideas=contentIdeas(data),making=ideas.filter(i=>i.stage==='making'),waiting=ideas.filter(i=>i.stage==='idea'),posted=ideas.filter(i=>i.stage==='posted').slice(-3).reverse(),record=contentMonth(data,month),parsed=parseContentLink(link);
 const change=(fn:Parameters<typeof update>[0])=>{setError('');void update(fn).catch(e=>setError(e instanceof Error?e.message:'저장하지 못했어요.'))};
 const save=(fn:Parameters<typeof update>[0])=>update(fn).then(()=>{setError('');return true},e=>{setError(e instanceof Error?e.message:'저장하지 못했어요.');return false});
 const pickedIdea=making.some(i=>i.id===chosen)?chosen:making.length===1?making[0].id:undefined;
 const submit=async()=>{
  if(busy)return;setBusy(true);setError('');setNote('');
  const id=Crypto.randomUUID();
  try{
   let reward:ReturnType<typeof rewardChange>|undefined;
   await update(s=>{const next=submitContentLink(s,id,link,Date.now(),pickedIdea);reward=rewardChange(s,next,dayKey);return next});
   setLink('');setChosen(undefined);
   if(reward&&reward.minutes>0)nav.navigate('EarnedReward',{id,kind:'content',quantity:1,...reward});
   else setNote('기록했어요. 이 플랫폼은 오늘 이미 보상을 받았어요.');
  }catch(e){setError(e instanceof Error?e.message:'인증하지 못했어요.')}finally{setBusy(false)}
 };
 const addIdea=()=>{if(!idea.trim())return;const id=Crypto.randomUUID(),text=idea;setIdea('');change(s=>addContentIdea(s,id,text))};
 const shift=(delta:number)=>{const [y,m]=month.split('-').map(Number),d=new Date(y,m-1+delta,1);setMonth(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'))};
 return <View style={{gap:space.md}}>
  <View><CharacterPeek interactive={false} character="C03" action="A31" maxSize={300}/>
   <CardView>
    <Copy variant="heading">오늘의 업로드</Copy>
    <View testID="content-today" style={{flexDirection:'row',gap:space.xs}}>{today.map(p=><TodayCard key={p.id} {...p}/>)}</View>
    <Field label="링크 붙여넣기" value={link} onChangeText={v=>{setLink(v);setError('');setNote('')}} maxLength={500} placeholder="릴스나 쇼츠 링크" helper={parsed?titleOf(parsed.platform)+' 링크예요':undefined}/>
    {making.length>1?<View style={{gap:space.xs}}><Copy variant="caption" muted>어떤 아이디어를 올렸나요?</Copy><View style={{flexDirection:'row',gap:space.xs,flexWrap:'wrap'}}>{making.map(i=><Choice key={i.id} label={i.text.length>14?i.text.slice(0,14)+'…':i.text} selected={pickedIdea===i.id} onPress={()=>setChosen(i.id)}/>)}</View></View>:null}
    {error?<Notice tone="error">{error}</Notice>:null}{note?<Notice>{note}</Notice>:null}
    <Action label={busy?'인증하고 있어요':'인증하기'} disabled={!ready||busy||!link.trim()} onPress={()=>void submit()}/>
    <Copy variant="caption" muted>플랫폼마다 하루 1번 보상을 받아요. 못 올린 날에도 벌점은 없어요.</Copy>
   </CardView>
  </View>
  <CardView>
   <Copy variant="section">아이디어 창고</Copy>
   <View style={{flexDirection:'row',alignItems:'flex-end',gap:space.xs}}>
    <View style={{flex:1,minWidth:0}}><Field label="한 줄 아이디어" value={idea} onChangeText={setIdea} maxLength={CONTENT_IDEA_CHARS} placeholder="예: 회로 쉽게 외우는 법"/></View>
    <View style={{paddingBottom:2}}><MicButton size={control.touch} onText={t=>setIdea(prefix.current+(prefix.current?' ':'')+t)} onPartial={t=>setIdea(prefix.current+(prefix.current?' ':'')+t)} onListeningChange={on=>{if(on)prefix.current=idea}}/></View>
   </View>
   <Action secondary compact label="창고에 넣기" disabled={!ready||!idea.trim()} onPress={addIdea}/>
   {[...making,...waiting.slice().reverse(),...posted].map(i=><IdeaRow key={i.id} idea={i} today={dayKey} open={editing===i.id&&i.stage!=='posted'} onToggle={()=>setEditing(editing===i.id?undefined:i.id)} change={save} onPick={()=>change(s=>pickContentIdea(s,i.id,dayKey))} onUnpick={()=>change(s=>unpickContentIdea(s,i.id))} onRemove={()=>change(s=>removeContentIdea(s,i.id))}/>)}
   {!ideas.length?<Copy variant="caption" muted>떠오를 때 한 줄씩 적어 두고, 오늘 만들 것을 골라요.</Copy>:null}
  </CardView>
  <CardView>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
    <Pressable accessibilityRole="button" accessibilityLabel="이전 달" onPress={()=>shift(-1)} style={{width:control.touch,height:control.touch,alignItems:'center',justifyContent:'center'}}><Icon name="chevron-back" size={20} color={c.textMuted}/></Pressable>
    <Copy variant="section">{Number(month.slice(0,4))+'년 '+Number(month.slice(5,7))+'월'}</Copy>
    <Pressable accessibilityRole="button" accessibilityLabel="다음 달" accessibilityState={{disabled:month>=dayKey.slice(0,7)}} disabled={month>=dayKey.slice(0,7)} onPress={()=>shift(1)} style={{width:control.touch,height:control.touch,alignItems:'center',justifyContent:'center',opacity:month>=dayKey.slice(0,7)?.3:1}}><Icon name="chevron-forward" size={20} color={c.textMuted}/></Pressable>
   </View>
   <Copy variant="label">{'이번 주 '+week.count+'일 올렸어요'}</Copy>
   <Calendar month={month} days={record.days} today={dayKey}/>
   <View style={{flexDirection:'row',gap:space.md}}>{CONTENT_PLATFORMS.map(p=><View key={p.id} style={{flexDirection:'row',alignItems:'center',gap:space.xxs}}><View style={{width:6,height:6,borderRadius:3,backgroundColor:p.id==='reels'?c.primary:c.text}}/><Copy variant="caption" muted>{p.title}</Copy></View>)}</View>
   {record.uploads.length?record.uploads.map(u=><LinkRow key={u.id} upload={u}/>):<Copy variant="caption" muted>이 달에 올린 영상이 아직 없어요.</Copy>}
  </CardView>
 </View>;
}
