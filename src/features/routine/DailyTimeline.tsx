import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {addDays} from '../../lib/dateUtils';
import {dailyTimeline,durationLabel,type DailyTimeline as Timeline,type TimelineItem} from '../../lib/dailyTimeline';
import {readPlayLog} from '../../lib/playLog';
import {activityDays} from '../../lib/routineActivity';
import {routineDay} from '../../lib/routineModel';
import {RootScreenProps,RootStackParamList} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeContext';
import {control,space} from '../../theme/tokens';
import {useRoutine} from './RoutineProvider';
import {CardView,Copy,Icon,Link,Page} from './ui';

const clock=(n:number)=>new Date(n).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit',hour12:false});
const dateLabel=(key:string)=>Number(key.slice(5,7))+'월 '+Number(key.slice(8,10))+'일';

function useDayRange(selected:string){
 const {data,dayKey}=useRoutine();
 const first=[...activityDays(data),...readPlayLog(data).rows.map(r=>routineDay(new Date(r.start))),dayKey].sort()[0];
 return {canBack:selected>first,canForward:selected<dayKey};
}
function DateNav({selected,onChange}:{selected:string;onChange:(key:string)=>void}){
 const {canBack,canForward}=useDayRange(selected),{colors:c}=useTheme();
 const arrow=(label:string,name:'chevron-back'|'chevron-forward',enabled:boolean,step:number)=><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:!enabled}} disabled={!enabled} onPress={()=>onChange(addDays(selected,step))} style={{width:control.touch,height:control.touch,alignItems:'center',justifyContent:'center',opacity:enabled?1:.3}}><Icon name={name} size={20} color={c.text}/></Pressable>;
 return <View style={{flexDirection:'row',alignItems:'center'}}>{arrow('이전 날','chevron-back',canBack,-1)}<Copy variant="label">{dateLabel(selected)}</Copy>{arrow('다음 날','chevron-forward',canForward,1)}</View>;
}
function Total({label,value,detail}:{label:string;value:string;detail?:string}){
 return <View style={{flexGrow:1,flexBasis:'45%',gap:space.xxs}}><Copy variant="caption" muted>{label}</Copy><Copy variant="section">{value}</Copy>{detail?<Copy variant="caption" muted>{detail}</Copy>:null}</View>;
}
const playValue=(t:Timeline)=>t.totals.playSeconds===null?'기록 없음':durationLabel(t.totals.playSeconds);
function Row({item,full=false}:{item:TimelineItem;full?:boolean}){
 const {colors:c}=useTheme();
 const time=item.kind==='deck'?clock(item.start):clock(item.start)+'~'+('live' in item&&item.live?'':clock(item.end));
 const title=item.kind==='study'?item.subject:item.kind==='deck'?item.deckName:'노는 시간';
 const detail=item.kind==='study'?'공부 · '+durationLabel(item.seconds)+(item.live?' · 진행 중':''):item.kind==='deck'?'단어장 · '+item.cards+'장 · '+durationLabel(item.seconds):durationLabel(item.seconds)+(item.live?' · 켜져 있음':'');
 const icon=item.kind==='study'?'book-outline':item.kind==='deck'?'albums-outline':'game-controller-outline';
 return <View accessible accessibilityLabel={time+' '+title+' '+detail} style={{flexDirection:'row',gap:space.sm,alignItems:'flex-start'}}>
  <Icon name={icon} size={18} color={item.kind==='play'?c.textMuted:c.primary}/>
  <View style={{flex:1,minWidth:0}}><Copy variant="label" numberOfLines={full?undefined:1}>{title}</Copy><Copy variant="caption" muted>{detail}</Copy></View>
  <Copy variant="caption" muted style={{fontVariant:['tabular-nums']}}>{time}</Copy>
 </View>;
}
function playNote(t:Timeline){
 if(t.totals.playSeconds===null)return '노는 시간은 이 기능이 들어간 빌드부터, 앱 제한을 연결한 날만 기록돼요.';
 if(t.play.state==='partial')return t.play.since?clock(t.play.since)+'부터 기록했어요. 그 전의 노는 시간은 알 수 없어요.':'이날은 노는 시간이 일부만 기록됐어요.';
 return '';
}

/** 달력 위의 오늘 요약 한 줄. 날짜 이동과 항목 목록은 누르면 나오는 하루 기록 화면에 있다. */
export function DailyTimelineRow(){
 const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),{data,dayKey,native}=useRoutine(),{colors:c}=useTheme();
 const t=dailyTimeline(data,dayKey,native),summary='공부 '+durationLabel(t.totals.studySeconds)+' · 노는 시간 '+playValue(t);
 return <Pressable accessibilityRole="button" accessibilityLabel={'오늘 하루 전체 보기, '+summary} onPress={()=>nav.navigate('DailyTimeline',{date:dayKey})} style={({pressed})=>({opacity:pressed?.6:1})}>
  <CardView style={{flexDirection:'row',alignItems:'center',gap:space.sm,paddingVertical:space.sm}}>
   <View style={{flex:1,minWidth:0}}><Copy variant="label">오늘 하루</Copy><Copy variant="caption" muted numberOfLines={1}>{summary}</Copy></View>
   <Icon name="chevron-forward" size={18} color={c.textMuted}/>
  </CardView>
 </Pressable>;
}

export function DailyTimelineScreen({route,navigation}:RootScreenProps<'DailyTimeline'>){
 const {data,dayKey,native}=useRoutine(),[selected,setSelected]=useState(route.params?.date??dayKey);
 const t=dailyTimeline(data,selected,native),note=playNote(t);
 const penalty=[t.totals.penaltyMinutes?t.totals.penaltyMinutes+'분':'',t.totals.penaltyWon?t.totals.penaltyWon.toLocaleString('ko-KR')+'원':''].filter(Boolean).join(' · ')||'없음';
 return <Page title="하루 기록" right={<Link label="닫기" onPress={()=>navigation.goBack()}/>}>
  <CardView>
   <View style={{alignItems:'center'}}><DateNav selected={selected} onChange={setSelected}/></View>
   <View style={{flexDirection:'row',flexWrap:'wrap',rowGap:space.md,columnGap:space.sm}}>
    <Total label="공부" value={durationLabel(t.totals.studySeconds)}/><Total label="노는 시간" value={playValue(t)} detail={t.totals.consumedMinutes===null?undefined:'실제 사용 '+t.totals.consumedMinutes+'분'}/>
    <Total label="받은 유튜브 시간" value={t.totals.earnedMinutes+'분'}/><Total label="벌점" value={penalty}/>
   </View>
   <Copy variant="caption" muted>{note||'노는 시간은 앱 잠금을 풀어 둔 시간이에요. 실제로 쓴 시간과 다를 수 있어요.'}</Copy>
  </CardView>
  {t.items.length?<CardView>{t.items.map(item=><Row key={item.id} item={item} full/>)}</CardView>:<CardView><Copy muted>이날 시각이 남은 기록이 없어요.</Copy></CardView>}
  {t.totals.untimedResponses?<Copy variant="caption" muted>{'단어 응답 '+t.totals.untimedResponses+'회는 시각 기록이 없어 목록에 넣지 못했어요.'}</Copy>:null}
 </Page>;
}
