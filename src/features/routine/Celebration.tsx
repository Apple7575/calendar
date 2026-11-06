import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AppState,Modal,Platform,Text,View,useWindowDimensions} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Audio} from 'expo-av';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {planCelebration,rewardParts,streakFriends,type CelebrationLog,type CelebrationRequest,type PlannedCelebration} from '../../lib/celebration';
import {settlementNews} from '../../lib/settlementNews';
import {achievements,newAchievements,type AchievedShown} from '../../lib/celebrationTriggers';
import {stickerFor} from '../../lib/calendarSticker';
import {useIsFocused} from '@react-navigation/native';
import {experiencePreferences,loadExperiencePreferences} from '../../lib/experiencePreferences';
import {tapLight,tapSuccess} from '../../lib/haptics';
import {untilFinished,withCelebrationAudio} from '../../lib/celebrationAudio';
import {radii,space,type} from '../../theme/tokens';
import {useTheme} from '../../theme/ThemeContext';
import {colorRoles} from '../../theme/roles';
import {useRoutine} from './RoutineProvider';
import {CelebrationSurface} from './CelebrationSurface';
import type {AnimalActionId,AnimalCharacterId} from './animalAssets';
import {Action,Mascot} from './ui';

/*
 * 축하 부품. 어디서든 celebrate({kind,...})를 부르면 CelebrationHost가 단계(큰·중간·작은)를 정하고 보여 준다.
 * 규칙은 src/lib/celebration.ts, 기준은 routine-portfolio/celebration-audit/design-plan.md.
 * 화면 표시 전용이다. 보상을 만들거나 바꾸지 않는다. 표시 기록은 아래 두 키에만 둔다.
 */
const LOG_KEY='celebration.log.v1',SEEN_KEY='celebration.settlementSeen.v1',ACHIEVED_KEY='celebration.achieved.v1';
type Listener=(request:CelebrationRequest)=>void;
let listener:Listener|null=null;const early:CelebrationRequest[]=[];
/** 축하를 요청한다. 보여 줄지·어떤 단계일지는 하루 한도와 순환 규칙이 정한다. */
export function celebrate(request:CelebrationRequest){if(listener)listener(request);else early.push(request);}
// 웹 미리보기 검사(scripts/check-celebrations-web.cjs)에서만 부른다. 앱(iOS)에는 붙지 않는다.
if(Platform.OS==='web'&&typeof window!=='undefined')(window as unknown as {__celebrate?:typeof celebrate}).__celebrate=celebrate;

const SOUNDS={complete:require('../../../assets/sounds/study/complete.mp3'),milestone:require('../../../assets/sounds/study/milestone.mp3')};
async function playSound(kind:'complete'|'milestone'){
 await loadExperiencePreferences();if(!experiencePreferences().sound)return;
 try{
  // 무음 모드면 소리 없이 진동만(팀장 결정 B안). 끝나면 학습 음성 모드로 되돌린다.
  await withCelebrationAudio(async()=>{
   const {sound}=await Audio.Sound.createAsync(SOUNDS[kind],{shouldPlay:true,volume:0.65});
   await untilFinished(sound);
   void sound.unloadAsync().catch(()=>{});
  });
 }catch{}
}
const CAST:AnimalCharacterId[]=['C03','C04','C01','C02'];

function Big({plan,onClose}:{plan:PlannedCelebration;onClose:()=>void}){
 const friends=plan.kind==='streak'?streakFriends(Number(plan.title.match(/\d+/)?.[0]??0)):1;
 const character=(plan.character as AnimalCharacterId|undefined)??'C03';
 return <Modal visible animationType={Platform.OS==='web'?'none':'fade'} onRequestClose={onClose} statusBarTranslucent>
  <View style={{flex:1}}>
   <CelebrationSurface hero={friends>1?<Friends lead={character} count={friends} action={plan.action as AnimalActionId}/>:undefined} effect={plan.effect} testID={'celebration-big-'+plan.kind} title={plan.title} subtitle={plan.detail} onClose={onClose} action={plan.action as AnimalActionId} character={character}
    footer={<Action label="계속하기" onPress={onClose}/>}>
    {rewardParts(plan).length?<Money plan={plan}/>:null}
   </CelebrationSurface>
  </View>
 </Modal>;
}
/** 연속 기념일에 함께 나오는 친구들. 2마리는 나란히, 4마리는 2×2. 그날의 동물이 맨 앞이다. */
function Friends({lead,count,action}:{lead:AnimalCharacterId;count:number;action:AnimalActionId}){
 const {width}=useWindowDimensions(),list=[lead,...CAST.filter(c=>c!==lead)].slice(0,count),size=Math.min(count===2?260:220,(width-24)/2*1.35),overlap=-size*.16;
 return <View testID="celebration-friends" style={{flexDirection:'row',flexWrap:count>2?'wrap':'nowrap',justifyContent:'center',width:(size+overlap*2)*2+2,rowGap:-size*.3}}>{list.map(c=><View key={c} style={{marginHorizontal:overlap}}><Mascot character={c} size={size} action={action}/></View>)}</View>;
}
function Money({plan}:{plan:PlannedCelebration}){
 const {colors:c}=useTheme(),parts=rewardParts(plan);
 return <View style={{paddingHorizontal:space.lg,paddingVertical:space.sm,borderRadius:radii.card,backgroundColor:c.card}}><Text style={[type.heading,{color:c.text,fontVariant:['tabular-nums']}]}>{parts.join(' · ')}</Text></View>;
}
function Toast({plan}:{plan:PlannedCelebration}){
 const theme=useTheme(),c=theme.colors,role=colorRoles(theme),insets=useSafeAreaInsets();
 const parts=rewardParts(plan).join(' · ');
 return <View pointerEvents="none" testID={'celebration-toast-'+plan.kind} accessibilityLiveRegion="polite" accessibilityLabel={plan.title+(parts?' '+parts:'')}
  style={{position:'absolute',left:space.md,right:space.md,top:insets.top+space.xs,flexDirection:'row',alignItems:'center',gap:space.sm,padding:space.sm,borderRadius:radii.card,backgroundColor:c.card,borderWidth:1,borderColor:role.primary.soft,overflow:'hidden'}}>
  <View style={{width:56,height:56,alignItems:'center',justifyContent:'center'}}><Mascot character={(plan.character as AnimalCharacterId|undefined)??'C03'} size={56} action={plan.action as AnimalActionId}/></View>
  <View style={{flex:1,minWidth:0}}><Text style={[type.label,{color:c.text}]}>{plan.title}</Text>{parts?<Text style={[type.body,{color:role.primary.ink,fontVariant:['tabular-nums']}]}>{parts}</Text>:null}</View>
 </View>;
}

/** 작은 축하: 위쪽에 1.3초 뜨는 짧은 말. 화면을 막지 않는다. */
function Pill({text}:{text:string}){
 const theme=useTheme(),role=colorRoles(theme),insets=useSafeAreaInsets();
 return <View pointerEvents="none" testID="celebration-pill" accessibilityLiveRegion="polite" style={{position:'absolute',alignSelf:'center',top:insets.top+space.xs,paddingHorizontal:space.md,paddingVertical:space.xs,borderRadius:radii.chip,backgroundColor:role.primary.fill}}><Text style={[type.label,{color:role.primary.on}]}>{text}</Text></View>;
}

/** 앱 뿌리에 한 번 둔다(RootNavigator, App.web.tsx). 축하 줄을 하나씩 보여 주고, 앱을 열 때 정산 소식을 모아 보여 준다. */
export function CelebrationHost(){
 const [pill,setPill]=useState<string|null>(null),[queue,setQueue]=useState<PlannedCelebration[]>([]),log=useRef<CelebrationLog>(null),loaded=useRef<Promise<void>|null>(null);
 const load=()=>loaded.current??(loaded.current=AsyncStorage.getItem(LOG_KEY).then(raw=>{try{const v=raw?JSON.parse(raw):null;if(v&&typeof v.day==='string'&&Array.isArray(v.big)&&Array.isArray(v.lines)&&v.last&&typeof v.last==='object')log.current=v;}catch{}}).catch(()=>{}));
 const accept=useCallback((request:CelebrationRequest)=>{void load().then(()=>{
  const now=Date.now(),{plan,log:next}=planCelebration(request,log.current,localDay(now),now);
  log.current=next;AsyncStorage.setItem(LOG_KEY,JSON.stringify(next)).catch(()=>{});
  if(plan.haptic==='success')tapSuccess();else tapLight();
  if(plan.sound)void playSound(plan.sound);
  if(plan.tier!=='small')setQueue(q=>[...q,plan]);else setPill(plan.title);
 })},[]);
 useEffect(()=>{listener=accept;early.splice(0).forEach(accept);return()=>{if(listener===accept)listener=null}},[accept]);
 useEffect(()=>{if(!pill)return;const t=setTimeout(()=>setPill(null),1300);return()=>clearTimeout(t)},[pill]);
 const current=queue[0],next=useCallback(()=>setQueue(q=>q.slice(1)),[]);
 useEffect(()=>{if(current?.tier!=='medium')return;const t=setTimeout(next,2800);return()=>clearTimeout(t)},[current,next]);
 return <>
  <SettlementWatcher/>
  {current?.tier==='big'?<Big plan={current} onClose={next}/>:current?.tier==='medium'?<Toast plan={current}/>:pill?<Pill text={pill}/>:null}
 </>;
}
/** 04시 기준 날짜. routineDay와 같은 기준이다. */
function localDay(now:number){const d=new Date(now);if(d.getHours()<4)d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

/** 앱을 열 때(앞으로 올 때) 조용히 정산된 돈을 모아 한 번씩 축하한다. 본 소식 id는 표시용 키에만 남긴다. */
function SettlementWatcher(){
 const {data,dayKey,ready}=useRoutine(),[active,setActive]=useState(AppState.currentState==='active'),checked=useRef('');
 useEffect(()=>{const s=AppState.addEventListener('change',v=>setActive(v==='active'));return()=>s.remove()},[]);
 useEffect(()=>{
  if(!ready||!active)return;
  const stamp=dayKey+':'+JSON.stringify([data.weeklyStakes,data.dayPromises,data.interestDays]).length;
  if(checked.current===stamp)return;checked.current=stamp;
  void AsyncStorage.getItem(SEEN_KEY).then(raw=>{
   let seen:string[]=[];try{const v=raw?JSON.parse(raw):[];if(Array.isArray(v))seen=v.filter(x=>typeof x==='string')}catch{}
   const items=settlementNews(data,dayKey,seen);if(!items.length)return;
   for(const item of items)celebrate({kind:item.kind,won:item.won,minutes:item.minutes});
   AsyncStorage.setItem(SEEN_KEY,JSON.stringify([...seen,...items.flatMap(i=>i.ids)].slice(-200))).catch(()=>{});
  }).catch(()=>{});
 },[ready,active,dayKey,data]);
 return null;
}

/**
 * 연속 기념일·오늘 전부·다시 돌아온 날·우선 과제 전부·성장을 축하한다(design-plan.md G7·G12·G14·G15·G18).
 * 탭 화면이 보일 때만(다른 화면이나 보상 화면 위에 겹치지 않게) 판정하고, 같은 날 같은 축하는 1번이다.
 */
export function AchievementWatcher(){
 const {data,dayKey,ready}=useRoutine(),focused=useIsFocused(),busy=useRef(false);
 useEffect(()=>{
  if(!ready||!focused||busy.current)return;
  const now=achievements(data,dayKey);
  if(!now.streak&&!now.dayComplete&&!now.comeback&&!now.priorityAll&&now.stage==='sprout')return;
  busy.current=true;
  const timer=setTimeout(()=>{void AsyncStorage.getItem(ACHIEVED_KEY).then(raw=>{
   let shown:AchievedShown=null;try{const v=raw?JSON.parse(raw):null;if(v&&typeof v.day==='string'&&Array.isArray(v.kinds))shown=v}catch{}
   const result=newAchievements(now,shown,dayKey);
   AsyncStorage.setItem(ACHIEVED_KEY,JSON.stringify(result.shown)).catch(()=>{});
   const friend=FRIEND_OF[stickerFor(dayKey).animal];// 위젯·달력 스티커와 같은 그날의 동물
   for(const kind of result.kinds)celebrate(kind==='streak'?{kind,n:now.streak!,character:friend}:{kind,character:kind==='growth'?'C03':friend});
  }).catch(()=>{}).finally(()=>{busy.current=false})},700);
  return()=>{clearTimeout(timer);busy.current=false};
 },[ready,focused,data,dayKey]);
 return null;
}
const FRIEND_OF={otter:'C03',cat:'C04',bear:'C01',hedgehog:'C02'} as const;
