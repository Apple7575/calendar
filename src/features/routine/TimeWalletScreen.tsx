import React from 'react';
import {View} from 'react-native';
import {RootScreenProps} from '../../navigation/types';
import {getDay} from '../../lib/routineModel';
import {timeWallet} from '../../lib/timeWallet';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Copy,Link,Page,u} from './ui';
import {BoriScene,MenuRow} from './experience';
import {RewardUseToggle} from './RewardUseToggle';
import {RewardSourcesCard} from './RewardSourcesCard';
export function TimeWalletScreen({navigation}:RootScreenProps<'TimeWallet'>){
 const {data,dayKey,native}=useRoutine(),day=getDay(data,dayKey),wallet=timeWallet(day,dayKey,native);
 const rows=[['아침 루틴',day.paid.morning],['오늘 단어 목표',day.paid.words],['운동',day.paid.gym],['추가 단어',day.bonus?.words??0],['이전 집중 공부',day.bonus?.book??0],['짧은 복습',day.bonus?.quick??0],['하루 순서 보너스',day.bonus?.order??0],['이전 자유 공부',day.bonus?.freeStudy??0],['집중 공부·계획',day.bonus?.handwriting??0],['공부 중간에 마친 벌점',-(native?.penaltyMinutes??0)],['어제에서 넘어온 벌점',-(native?.debtMinutes??0)]] as const;
 const next=new Date();next.setHours(4,0,0,0);if(next.getTime()<=Date.now())next.setDate(next.getDate()+1);
 return <Page title="시간 보관함" right={<Link label="닫기" onPress={()=>navigation.goBack()}/>}>
  <BoriScene action={wallet.available?'A55':'A54'} size={100} mood={wallet.available?'celebrate':'cheer'} title={`남은 사용 시간 ${wallet.balance}분`} description={wallet.available?`지금 ${wallet.available}분 사용할 수 있어요`:wallet.balance?`${wallet.reason} · 잔액은 보관 중이에요`:wallet.reason}/>
  <RewardUseToggle onConnect={()=>navigation.navigate('RoutineScreenTime')}/>
  <MenuRow title="돈 보상 지갑" subtitle="실천으로 적립 · 쓴 금액 차감" icon="wallet-outline" onPress={()=>navigation.navigate('MoneyWallet')}/>
  <CardView><View style={u.between}><Copy>지금 사용 가능</Copy><Copy size={30} weight="800">{wallet.available}분</Copy></View><View style={u.between}><Copy muted>사용 조건 대기</Copy><Copy>{wallet.held}분</Copy></View><View style={u.between}><Copy muted>{wallet.connected?'기기 반영 대기':'연결 전 실천 적립'}</Copy><Copy>{wallet.pending}분</Copy></View>
  {!day.paid.morning?<Action label="아침 루틴 하러 가기" onPress={()=>navigation.navigate('GuidedRoutine',{slot:'morning'})}/>:null}</CardView>
  <CardView><Copy size={19} weight="800">오늘의 적립 내역</Copy>{rows.filter(([,amount])=>amount!==0).map(([title,amount])=><View key={title} style={u.between}><Copy>{title}</Copy><Copy weight="700">{amount>0?'+':''}{amount}분</Copy></View>)}{!wallet.localEarned?<Copy muted>아직 적립한 시간이 없어요. 기본 이용 시간은 0분이에요.</Copy>:null}<View style={u.between}><Copy weight="700">실천으로 모은 합계</Copy><Copy weight="800">{wallet.localEarned}분</Copy></View></CardView>
  <CardView><Copy weight="700">기기에 반영된 잔액</Copy><Copy muted>오늘 반영 {wallet.credited}분 − 실제 사용 {wallet.used}분 = 잔액 {wallet.balance}분</Copy><Copy muted size={12}>개별 앱별 사용 기록은 수집하지 않아요. 모든 제한 앱이 이 잔액을 함께 써요.</Copy><Copy size={13}>다음 초기화: {next.toLocaleString('ko-KR')} · 잔여 시간만 0분이 돼요. 학습 진도와 과거 기록은 남아요.</Copy></CardView>
  <CardView><MenuRow icon="shield-checkmark-outline" title="제한 앱·권한 확인" subtitle={native?.authorized?`앱 ${native.selectedApps} · 카테고리 ${native.selectedCategories} · 웹 ${native.selectedWebsites}`:'권한이 연결되지 않았어요. 실제 차단 상태가 아니에요.'} onPress={()=>navigation.navigate('RoutineScreenTime')}/></CardView>
 <RewardSourcesCard/></Page>;
}


