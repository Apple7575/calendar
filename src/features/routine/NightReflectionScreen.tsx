import React,{useState} from 'react';
import {View} from 'react-native';
import {addDays} from '../../lib/dateUtils';
import {dailyTimeline,durationLabel} from '../../lib/dailyTimeline';
import {activeGoals,goalWeek,readGoals} from '../../lib/routineGoals';
import {dayPromise,setTomorrowPromise} from '../../lib/weeklyCommitments';
import {RootScreenProps} from '../../navigation/types';
import {space} from '../../theme/tokens';
import {Segments} from './experience';
import {StartTimeMap} from './StartTimeMap';
import {celebrate} from './Celebration';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Choice,Copy,Link,LoadingState,Notice,Page,Progress,u} from './ui';

const HOURS=Array.from({length:18},(_,i)=>i+5);
const MINUTES=['00','15','30','45'] as const;
const hourLabel=(h:number)=>`${h<12?'오전':'오후'} ${h%12||12}시`;

function Row({label,value}:{label:string;value:string}){
 return <View style={[u.between,{gap:space.sm,minHeight:28}]}><Copy muted>{label}</Copy><Copy variant="label">{value}</Copy></View>;
}

function Today(){
 const {data,dayKey,native,now}=useRoutine(),t=dailyTimeline(data,dayKey,native,now.getTime()).totals,promise=dayPromise(data,dayKey);
 const goals=activeGoals(readGoals(data).goals);
 return <>
  <CardView>
   <Copy variant="section">오늘 하루</Copy>
   <View testID="reflect-today" style={{gap:space.xxs}}>
    <Row label="공부 시간" value={durationLabel(t.studySeconds)}/>
    <Row label="노는 시간(켠 시간)" value={t.playSeconds===null?'기록 없음':durationLabel(t.playSeconds)}/>
    <Row label="받은 시간" value={`${t.earnedMinutes}분`}/>
   </View>
   {promise.status==='kept'?<Notice tone="success">{`${promise.startAt} 약속을 지켰어요.`}</Notice>
   :promise.status==='missed'?<Notice tone="warning">{`${promise.startAt} 약속을 놓쳤어요. 내일 다시 정해요.`}</Notice>:null}
  </CardView>
  {goals.length?<CardView>
   <Copy variant="section">목표 진행</Copy>
   {goals.map(goal=>{const week=goalWeek(data,goal,dayKey);return <View key={goal.id} style={{gap:space.xxs}}>
    <View style={[u.between,{gap:space.sm}]}><View style={{flex:1}}><Copy variant="label">{goal.title}</Copy></View><Copy variant="caption" muted>{`${week.count}일 / 주 ${week.target}일`}</Copy></View>
    <Progress value={week.count/week.target} label={`${goal.title} 이번 주 ${week.count}일, 목표 ${week.target}일`}/>
   </View>;})}
  </CardView>:null}
 </>;
}

export function NightReflectionScreen({navigation}:RootScreenProps<'NightReflection'>){
 const {data,dayKey,ready,error,update}=useRoutine(),tomorrow=dayPromise(data,addDays(dayKey,1));
 const [hh,mm]=(tomorrow.startAt??'').split(':');
 const [hour,setHour]=useState<number|null>(hh?Number(hh):null),[minute,setMinute]=useState<typeof MINUTES[number]>((MINUTES as readonly string[]).includes(mm)?mm as typeof MINUTES[number]:'00');
 const [editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[saveError,setSaveError]=useState('');
 const close=()=>navigation.canGoBack()?navigation.goBack():navigation.navigate('Main');
 const promised=tomorrow.status!=='none'&&!editing;
 const save=async()=>{
  if(hour===null)return;
  setBusy(true);setSaveError('');
  try{await update(current=>setTomorrowPromise(current,dayKey,`${String(hour).padStart(2,'0')}:${minute}`));celebrate({kind:'planSaved'});setEditing(false);}
  catch(e){setSaveError(e instanceof Error?e.message:'약속을 저장하지 못했어요. 다시 시도해 주세요.');}
  finally{setBusy(false);}
 };
 return <Page title="밤 1분 돌아보기" right={<Link label="닫기" onPress={close}/>} footer={ready&&!promised?<Action label={hour===null?'내일 시작 시각을 골라 주세요':`내일 ${hour}:${minute}에 시작하기`} disabled={hour===null} loading={busy} onPress={()=>void save()}/>:undefined}>
  {!ready?error?<Notice tone="error">{`저장된 기록을 불러오지 못했어요. ${error}`}</Notice>:<LoadingState label="오늘 기록을 모으는 중…"/>:<>
   <Today/>
   <CardView>
    <Copy variant="section">내일 첫 공부 약속</Copy>
    {promised?<View testID="reflect-promised" style={{gap:space.xs}}>
     <Copy variant="lead">{`내일 ${tomorrow.startAt}에 첫 공부를 시작해요.`}</Copy>
     <Copy muted>약속 시각 앞뒤 15분 안에 집중을 시작하면 +10분·1,000원, 놓치면 −10분·1,000원이에요. 놓쳐도 시간 사용은 막지 않아요.</Copy>
     <StartTimeMap data={data} day={addDays(dayKey,1)} compact/>
     <Link label="시각 바꾸기" onPress={()=>setEditing(true)}/>
    </View>:<View testID="reflect-pick" style={{gap:space.sm}}>
     <Copy muted>약속 시각 앞뒤 15분 안에 집중을 시작하면 +10분·1,000원, 놓치면 −10분·1,000원이에요. 놓쳐도 시간 사용은 막지 않아요.</Copy>
     <StartTimeMap data={data} day={addDays(dayKey,1)}/>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:space.xs}}>{HOURS.map(h=><View key={h} style={{flexBasis:'30%',flexGrow:1}}><Choice fill label={hourLabel(h)} selected={hour===h} onPress={()=>setHour(h)}/></View>)}</View>
     <Segments value={minute} onChange={setMinute} items={MINUTES.map(id=>({id,label:`${id}분`}))}/>
    </View>}
   </CardView>
   {saveError?<Notice tone="error">{saveError}</Notice>:null}
  </>}
 </Page>;
}
