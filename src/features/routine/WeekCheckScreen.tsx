import React,{useState} from 'react';
import {View} from 'react-native';
import {addDays,parseDateKey} from '../../lib/dateUtils';
import {durationLabel} from '../../lib/dailyTimeline';
import {COMMITMENT_POLICY,activeWeeklyRules,placeWeeklyStake,saveWeeklyReview,weekKeyOf,weeklyStake,type StakeAmount,type WeeklyRule} from '../../lib/weeklyCommitments';
import {RULE_OPTIONS,ruleLabel,weeklyReviews,weeklySummary,wonLabel} from '../../lib/weeklyReview';
import {clockLabel,weekTrends} from '../../lib/weeklyTrends';
import {RootScreenProps} from '../../navigation/types';
import {space} from '../../theme/tokens';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Choice,Copy,Link,LoadingState,Notice,Page,u} from './ui';

const shortDate=(key:string)=>{const d=parseDateKey(key);return `${d.getMonth()+1}월 ${d.getDate()}일`;};

function Row({label,value,testID}:{label:string;value:string;testID?:string}){
 return <View testID={testID} style={[u.between,{gap:space.sm,minHeight:28}]}><Copy muted>{label}</Copy><View style={{flexShrink:1}}><Copy variant="label">{value}</Copy></View></View>;
}

/** 4주 공부한 날. 오래된 주부터 쓰고 지난주만 굵게 한다. */
function Trend({values}:{values:number[]}){
 return <View testID="week-trend" accessible accessibilityLabel={`최근 4주 공부한 날 ${values.join(', ')}일, 지난주 ${values[values.length-1]}일`} style={{flexDirection:'row',alignItems:'baseline'}}>
  {values.map((n,i)=><Copy key={i} variant={i===values.length-1?'label':'body'} muted={i!==values.length-1}>{`${n}${i<values.length-1?' · ':'일'}`}</Copy>)}
 </View>;
}

function LastWeek({weekKey}:{weekKey:string}){
 const {data}=useRoutine(),s=weeklySummary(data,weekKey),t=weekTrends(data,weekKey);
 const stake=!s.stake?'걸지 않음':s.stake.status==='won'?`${s.stake.studyDays}/${s.stake.targetDays}일 · ${wonLabel(s.stake.payoutWon??0)} 돌려받음`:s.stake.status==='lost'?`${s.stake.studyDays}/${s.stake.targetDays}일 · ${wonLabel(s.stake.amount)} 잃음`:'정산 전';
 return <CardView>
  <Copy variant="section">{`지난주 · ${shortDate(weekKey)}~${shortDate(addDays(weekKey,6))}`}</Copy>
  {s.empty?<Copy muted>지난주에는 남은 기록이 없어요. 이번 주부터 쌓아 봐요.</Copy>:<View testID="week-summary" style={{gap:space.xxs}}>
   <Row label="공부 시간" value={durationLabel(s.studySeconds)}/>
   <Row label="공부한 날" value={`${s.studyDays}일 / 7일`}/>
   <View style={[u.between,{gap:space.sm,minHeight:28}]}><Copy muted>최근 4주</Copy><Trend values={t.studyDays4w}/></View>
   <Row testID="week-first-start" label="첫 공부 시작" value={t.firstStartMedian===null?'—':`보통 ${clockLabel(t.firstStartMedian)}에 시작했어요 (${t.firstStartDays}일)`}/>
   <Row testID="week-saved-ten" label="10분 이상 남긴 날" value={t.savedKnownDays?`남긴 날 ${t.savedTenDays} / ${t.savedKnownDays}일`:'—'}/>
   <Row label="받은 시간" value={`${s.earnedMinutes}분`}/>
   <Row label="받은 돈" value={wonLabel(s.earnedWon)}/>
   <Row label="벌점" value={s.penaltyMinutes||s.penaltyWon?`${s.penaltyMinutes}분 · ${wonLabel(s.penaltyWon)}`:'없음'}/>
   <Row label="긴급 해제" value={s.emergencies.length?`${s.emergencies.length}번`:'없음'}/>
   {s.emergencies.map((e,i)=><Copy key={i} variant="caption" muted>{`${shortDate(e.day)} · ${e.reason}`}</Copy>)}
   <Row label="안 쓴 시간 이자" value={wonLabel(s.interestWon)}/>
   <Row label="예치금" value={stake}/>
  </View>}
 </CardView>;
}

export function WeekCheckScreen({navigation}:RootScreenProps<'WeekCheck'>){
 const {data,dayKey,ready,error,update}=useRoutine(),week=weekKeyOf(dayKey),lastWeek=addDays(week,-7);
 const [amount,setAmount]=useState<StakeAmount|0>(0),[rule,setRule]=useState<WeeklyRule|null>(null),[busy,setBusy]=useState(false),[saveError,setSaveError]=useState('');
 const done=weeklyReviews(data)[week],stake=weeklyStake(data,dayKey),rules=activeWeeklyRules(data,dayKey),targetDays=rules.stakeDays;
 const close=()=>navigation.canGoBack()?navigation.goBack():navigation.navigate('Main');
 const save=async()=>{
  setBusy(true);setSaveError('');
  try{await update(current=>saveWeeklyReview(amount?placeWeeklyStake(current,dayKey,amount):current,week,rule??undefined));close();}
  catch(e){setSaveError(e instanceof Error?e.message:'저장하지 못했어요. 다시 시도해 주세요.');setBusy(false);}
 };
 return <Page title="주간 점검" right={<Link label="닫기" onPress={close}/>} footer={ready&&!done?<Action label="이번 주 시작하기" loading={busy} onPress={()=>void save()}/>:undefined}>
  {!ready?error?<Notice tone="error">{`저장된 기록을 불러오지 못했어요. ${error}`}</Notice>:<LoadingState label="지난주 기록을 모으는 중…"/>:<>
   <LastWeek weekKey={lastWeek}/>
   {done?<CardView>
    <Copy variant="section">이번 주 점검을 마쳤어요</Copy>
    <Copy>{stake.stake?`예치금 ${wonLabel(stake.stake.amount)}을 걸었어요. ${stake.stake.targetDays}일 중 ${stake.stake.studyDays}일 공부했어요.`:'이번 주에는 예치금을 걸지 않았어요.'}</Copy>
    <Copy muted>{done.rule?`다음 주부터 ${ruleLabel(done.rule)}로 바뀌어요.`:'다음 주 규칙은 그대로예요.'}</Copy>
   </CardView>:<>
    <CardView>
     <Copy variant="section">이번 주 예치금</Copy>
     <Copy>{`이번 주에 ${targetDays}일 공부하면 건 돈에 10%를 더해 돌려받아요. 못 채우면 건 돈을 잃어요.`}</Copy>
     {stake.canPlace?<View testID="stake-choices" style={{flexDirection:'row',flexWrap:'wrap',gap:space.xs}}>
      {[0,...COMMITMENT_POLICY.stake.amounts].map(value=><View key={value} style={{flexBasis:'45%',flexGrow:1}}><Choice fill label={value?wonLabel(value):'걸지 않기'} selected={amount===value} onPress={()=>setAmount(value as StakeAmount|0)}/></View>)}
     </View>:<Notice tone="info">{!stake.stake&&dayKey!==week?'예치금은 다음 월요일에 걸 수 있어요.':stake.reason??'지금은 걸 수 없어요.'}</Notice>}
    </CardView>
    <CardView>
     <Copy variant="section">다음 주에 바꿀 규칙 하나</Copy>
     <Copy muted>다음 월요일부터 적용돼요. 하나만 고를 수 있어요.</Copy>
     <Choice label="바꾸지 않기" selected={!rule} onPress={()=>setRule(null)}/>
     {RULE_OPTIONS.map(option=><View key={option.kind} style={{gap:space.xs}}>
      <Copy variant="caption" weight="700" muted>{`${option.title} · 지금 ${option.label(rules[option.kind])}`}</Copy>
      <View style={{flexDirection:'row',gap:space.xs}}>{option.values.filter(v=>v!==rules[option.kind]).map(value=><View key={value} style={{flex:1}}><Choice fill label={option.label(value)} accessibilityLabel={`${option.title} ${option.label(value)}로 바꾸기`} selected={rule?.kind===option.kind&&rule.value===value} onPress={()=>setRule({kind:option.kind,value})}/></View>)}</View>
     </View>)}
    </CardView>
    {saveError?<Notice tone="error">{saveError}</Notice>:null}
   </>}
  </>}
 </Page>;
}
