import React,{useState} from 'react';
import {Pressable,View} from 'react-native';
import {RootScreenProps} from '../../navigation/types';
import {useDayData} from '../../hooks/useDayData';
import {todayKey,formatTime} from '../../lib/dateUtils';
import {earn,getDay} from '../../lib/routineModel';
import {useTheme} from '../../theme/ThemeContext';
import {useRoutine} from './RoutineProvider';
import {Action,Copy,Icon,Link,Page,u} from './ui';
import {BoriScene,MenuRow} from './experience';
export function WorkoutDetailScreen({navigation}:RootScreenProps<'RoutineWorkout'>){
 const {data,dayKey,update,ready}=useRoutine(),{colors:c}=useTheme(),schedule=useDayData(todayKey()),day=getDay(data,dayKey);
 const [level,setLevel]=useState<'full'|'min'>('full'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const target=level==='full'?30:10,related=schedule.localEvents.filter(e=>/운동|헬스|러닝|gym/i.test(e.title));
 const finish=async()=>{if(busy)return;setBusy(true);try{let added=0;await update(s=>{const before=getDay(s,dayKey).paid.gym,next=earn(s,dayKey,'gym',level);added=getDay(next,dayKey).paid.gym-before;return next});navigation.replace('RoutineReward',{unit:'gym',level,added})}catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요.')}finally{setBusy(false)}};
 return <Page title="몸을 깨우는 시간" right={<Link label="닫기" onPress={()=>navigation.goBack()}/>} footer={<Action label={busy?'기록하고 있어요…':`운동 마쳤어요 · 추가 ${Math.max(0,target-day.paid.gym)}분`} disabled={!ready||busy} onPress={()=>void finish()}/>}>
  <BoriScene size={120} mood="cheer" title="어떤 움직임도 나를 위한 선물" description="예정이 없는 날은 실패가 아니에요. 운동한 날, 직접 완료를 남겨요."/>
  {related.length?<View style={{gap:7}}><Copy weight="700">연결된 오늘 일정</Copy>{related.map(e=><Copy key={e.id} muted size={13}>{e.allDay?'종일':formatTime(e.startAt)} · {e.title}</Copy>)}</View>:<Copy muted size={13}>등록된 운동 일정이 없어요. 준비 시각과 소요 시간은 일정에 따로 정할 수 있어요.</Copy>}
  {([['full','헬스장 운동',30,'헬스장에서 운동을 마쳤어요.'],['min','짧은 집 운동',10,'정해둔 간단한 움직임을 마쳤어요.']]as const).map(([value,title,reward,description])=><Pressable key={value} accessibilityRole="radio" aria-checked={level===value} accessibilityState={{checked:level===value}} accessibilityLabel={title} onPress={()=>setLevel(value)} style={{borderRadius:24,padding:20,gap:6,borderWidth:2,borderColor:level===value?c.primary:c.border,backgroundColor:level===value?c.primarySoft:c.card}}><View style={u.between}><Copy size={20} weight="800">{title}</Copy><Icon name={level===value?'radio-button-on':'radio-button-off'} size={22}/></View><Copy muted size={13}>{description}</Copy><Copy weight="700">앱 이용 시간 보상 +{reward}분</Copy></Pressable>)}
  <Copy muted size={12}>위 숫자는 운동 소요 시간이 아닌 앱 이용 보상이에요. 사진·위치 인증 없이 직접 체크해요. 오늘 운동에서 받은 합계 {day.paid.gym}분.</Copy><MenuRow title="운동 기록 보기" icon="barbell-outline" onPress={()=>navigation.navigate('Workout')}/><Link label="운동 일정·준비 시각 추가" onPress={()=>navigation.navigate('EventEdit',{date:todayKey()})}/>{error?<Copy>{error}</Copy>:null}
 </Page>;
}
