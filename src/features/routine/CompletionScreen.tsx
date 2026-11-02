import React,{useState} from 'react';
import {View,useWindowDimensions} from 'react-native';
import {RootScreenProps} from '../../navigation/types';
import {getDay,withDay} from '../../lib/routineModel';
import {canUndoStudy} from '../../lib/studyHistory';
import {goalReceipt} from '../../lib/rewardReceipt';
import {timeWallet} from '../../lib/timeWallet';
import {tapSuccess} from '../../lib/haptics';
import {useTheme} from '../../theme/ThemeContext';
import {useRoutine} from './RoutineProvider';
import {Action,Copy,Link} from './ui';
import {CelebrationSurface,CelebrationLink} from './CelebrationSurface';
import {RewardBalanceDetails} from './RewardBalanceDetails';
import {CountUp} from './motion';
import {useStudyFeedback} from './useStudyFeedback';
import {WordRewardProgress} from './WordRewardProgress';
export function CompletionScreen({route,navigation}:RootScreenProps<'RoutineReward'>){
 const {unit,level,added}=route.params,{data,dayKey,native,update,undoStudy}=useRoutine(),day=getDay(data,dayKey),receipt=goalReceipt(data,dayKey,unit,level,added),wallet=timeWallet(day,dayKey,native),{height}=useWindowDimensions(),{colors:c}=useTheme();
 const [error,setError]=useState(''),[details,setDetails]=useState(false),names={morning:'아침 루틴',words:'단어 학습',gym:level==='full'?'헬스장 운동':'짧은 집 운동'};
 useStudyFeedback({kind:'complete',id:route.key});React.useEffect(()=>{tapSuccess()},[]);
 const close=()=>navigation.popTo('Main',{screen:'Today'});
 const continueFull=()=>{if(unit==='words')navigation.replace('RoutineStudySession',{level:'full'});else if(unit==='morning')void update(s=>withDay(s,dayKey,d=>({...d,guidedLevels:{...d.guidedLevels,morning:'full'}}))).then(()=>navigation.replace('GuidedRoutine',{slot:'morning'})).catch(e=>setError(e.message));else navigation.replace('RoutineWorkout');};
 return <CelebrationSurface character={unit==='morning'?'C01':unit==='words'?'C02':'C03'} action={level==='min'?'A24':unit==='words'?'A26':unit==='gym'?'A29':receipt.granted>0&&receipt.granted<receipt.target?'A28':'A25'} title={level==='min'?'작게 해도,\n해냈어요!':`${names[unit]}\n완료!`} subtitle={level==='min'?`${names[unit]} · 작은 목표 완료`:'친구들도 함께 기뻐하고 있어요'} onClose={close} footer={<>{unit==='words'?<Action label={level==='min'?'전체 학습 이어하기':'더 공부하기'} onPress={()=>navigation.replace('RoutineStudySession',{level:'full'})}/>:<><Action label={level==='min'?'전체 목표 이어하기':'오늘로 돌아가기'} onPress={level==='min'?continueFull:close}/>{level==='min'?<CelebrationLink label="오늘은 여기까지" onPress={close}/>:null}</>}</>}>
  <View style={{alignSelf:'stretch',backgroundColor:c.card,borderRadius:28,padding:height<740?13:17,gap:5}}>
   <View style={{alignItems:'center'}}><Copy muted size={12}>이번 완료로 받은 사용 시간</Copy><Copy size={height<740?37:46} weight="800"><CountUp value={receipt.granted} prefix="+" suffix="분" animateInitial/></Copy><Copy size={14} weight="700">지금 사용 가능 {wallet.available}분</Copy></View>
   {receipt.wordBudget?<Copy size={13}>오늘 단어 합계 +{receipt.wordBudget.earned}분</Copy>:<Copy size={13}>오늘 이 목표에서 받은 합계 {receipt.goalTotal}분 / {receipt.target}분</Copy>}
   {unit==='words'?<WordRewardProgress excluded={day.excludedStudyIds?.length??0}/>:null}
   <Copy muted size={12}>{receipt.granted===0?receipt.reason:!day.paid.morning?'아침 루틴을 마치면 모은 시간을 쓸 수 있어요.':wallet.reason}</Copy>
   <Link label={details?'보상 안내 접기':'적립 내역과 보상 안내 보기'} onPress={()=>setDetails(!details)}/>
   {details?<><Copy size={13}>{receipt.reason}</Copy>{receipt.wordBudget?<Copy muted size={12}>기본·추가 학습을 합쳐 10장 → 15장 → 20장마다 5분씩 적립해요. 하루 상한은 없어요.</Copy>:null}<RewardBalanceDetails/><Copy muted size={12}>실천 기록은 캘린더에 자동 저장했어요.</Copy>{unit==='words'&&canUndoStudy(data,dayKey)?<Link label="마지막 채점 취소" onPress={()=>{const event=data.reviewHistory?.find(e=>e.id===data.studyUndo?.eventId);void undoStudy().then(()=>navigation.replace('RoutineStudySession',{level:event?.level??'full',deckId:event?.deckId,mode:event?.mode==='additional'?'additional':undefined})).catch(e=>setError(e.message));}}/>:null}</>:null}
   {error?<Copy>{error}</Copy>:null}
  </View>
 </CelebrationSurface>;
}
