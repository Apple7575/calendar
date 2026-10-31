import React from 'react';
import {View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {getDay} from '../../lib/routineModel';
import {timeWallet} from '../../lib/timeWallet';
import {useRoutine} from './RoutineProvider';
import {Copy,Link,u} from './ui';
export function RewardBalanceDetails(){const {data,dayKey,native}=useRoutine(),wallet=timeWallet(getDay(data,dayKey),dayKey,native),nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();return <View testID="reward-balance-details" style={{paddingHorizontal:8,gap:5}}><View style={u.between}><Copy size={13}>오늘 전체 적립</Copy><Copy weight="700">{wallet.localEarned}분</Copy></View><View style={u.between}><Copy size={13}>지금 사용 가능</Copy><Copy weight="800">{wallet.available}분</Copy></View>{wallet.held>0?<Copy muted size={12}>보관 중 {wallet.held}분 · {wallet.reason}</Copy>:null}{wallet.pending>0?<Copy muted size={12}>{wallet.connected?'기기 반영 대기':'스크린타임 연결 전 적립'} {wallet.pending}분</Copy>:null}<Copy muted size={12}>{wallet.reason}{wallet.paused?' · 홈의 ‘시간 사용’을 켜면 사용할 수 있어요.':''}</Copy><Link label="사용 시간과 적립 내역 자세히 보기" onPress={()=>nav.navigate('TimeWallet')}/></View>}
