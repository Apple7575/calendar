import React from 'react';
import {View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {canStartSpeaking,speakingToday,unsettledSpeaking} from '../../lib/speaking';
import {SPEAKING_TOPICS} from '../../lib/speakingTopics';
import {RootStackParamList} from '../../navigation/types';
import {space} from '../../theme/tokens';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,CharacterPeek,Copy,NavCard,Notice} from './ui';

/** The speaking section of the study tab: how far today has come, then the topics. */
export function SpeakingHome(){
 const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),{data,dayKey,ready,update}=useRoutine();
 const today=speakingToday(data,dayKey),open=unsettledSpeaking(data),canStart=canStartSpeaking(data);
 return <View style={{gap:space.md}}>
  <View><CharacterPeek interactive={false} character="C03" action="A31" maxSize={300}/>
   <CardView>
    <Copy variant="heading">배운 것을 말로 설명해요</Copy>
    <Copy variant="label">{today.moreChars.toLocaleString('ko-KR')+'자 더 말하면 +5분'}</Copy>
    <Copy>{'오늘 '+today.minutes+'분 · '+today.won.toLocaleString('ko-KR')+'원 받았어요'}</Copy>
    <Copy variant="caption" muted>말한 글자를 쌓아서 500자 → 1,000자 → 1,500자… 채울 때마다 5분·500원을 받아요. 되묻는 질문 답변은 2배로 인정해요. 정답 여부로 깎지 않아요.</Copy>
   </CardView>
  </View>
  {!data.speakingConsentAt?<CardView><Copy variant="section">시작 전에 알려 드려요</Copy><Copy>음성은 아이폰 음성 인식이 글자로 바꾸고, 음성 파일은 앱에 저장하지 않아요. 글자로 바뀐 내용만 서버를 거쳐 OpenAI로 보내 답변을 받아요.</Copy><Copy variant="caption" muted>말한 내용, AI 답변, 보상 내역은 앱에 저장되고 하루 기록에서 다시 볼 수 있어요.</Copy><Action label="확인했어요" disabled={!ready} onPress={()=>void update(s=>({...s,speakingConsentAt:new Date().toISOString()}))}/></CardView>:<>
   {!canStart?<Notice tone="warning">공부 타이머가 진행 중이에요. 쉬는 시간이나 공부를 마친 뒤 시작할 수 있어요.</Notice>:null}
   {open?<CardView><Copy variant="label">마치지 않은 말하기가 있어요</Copy><Copy variant="caption" muted numberOfLines={2}>{open.question}</Copy><Action label="이어서 마치기" onPress={()=>nav.navigate('SpeakingSession',{recordId:open.id})}/></CardView>:null}
   {canStart&&!open?SPEAKING_TOPICS.map(t=><NavCard key={t.id} title={t.title} subtitle={t.description} icon="mic-outline" disabled={!ready} onPress={()=>nav.navigate('SpeakingSession',{topicId:t.id})}/>):null}
  </>}
 </View>;
}
