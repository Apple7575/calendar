import React from 'react';
import {Pressable,View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {canStartSpeaking,speakingToday,unsettledSpeaking} from '../../lib/speaking';
import {SPEAKING_TOPICS,type SpeakingTopic} from '../../lib/speakingTopics';
import {RootStackParamList} from '../../navigation/types';
import {control,space} from '../../theme/tokens';
import {useTheme} from '../../theme/ThemeContext';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,CharacterPeek,Copy,Icon,Notice,Progress} from './ui';

/** How far today's characters are toward the next +5 minutes. Shared by the home and the session. */
export function SpeakingProgress({data,dayKey,saying=0}:{data:Parameters<typeof speakingToday>[0];dayKey:string;saying?:number}){
 const next=speakingToday(data,dayKey,saying),done=next.required-next.moreChars;
 return <View style={{gap:space.xs}}>
  <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'baseline',gap:space.sm}}>
   <Copy variant="label">{next.moreChars.toLocaleString('ko-KR')+'자 더 말하면 +5분'}</Copy>
   <Copy variant="caption" muted style={{fontVariant:['tabular-nums']}}>{done.toLocaleString('ko-KR')+' / '+next.required.toLocaleString('ko-KR')}</Copy>
  </View>
  <Progress value={next.required?done/next.required:0} label={'다음 +5분까지 '+next.moreChars+'자 남음'}/>
 </View>;
}

/** One topic in the list. The whole row opens it. */
function TopicRow({topic,disabled,onPress}:{topic:SpeakingTopic;disabled:boolean;onPress:()=>void}){
 const {colors:c}=useTheme();
 return <Pressable accessibilityRole="button" accessibilityLabel={topic.title} accessibilityState={{disabled}} aria-disabled={disabled} disabled={disabled} onPress={onPress}
  style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:space.sm,minHeight:control.large,paddingVertical:space.sm,opacity:disabled?.5:pressed?.6:1})}>
  <View style={{width:36,height:36,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:c.primarySoft}}><Icon name="mic-outline" size={18} color={c.primary}/></View>
  <View style={{flex:1,minWidth:0,gap:2}}><Copy variant="label">{topic.title}</Copy><Copy variant="caption" muted>{topic.description}</Copy></View>
  <Icon name="chevron-forward" size={18} color={c.textMuted}/>
 </Pressable>;
}

/** The speaking section of the study tab: today's progress, then one thing to do — agree, finish, or pick a topic. */
export function SpeakingHome(){
 const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),{data,dayKey,ready,update}=useRoutine();
 const today=speakingToday(data,dayKey),open=unsettledSpeaking(data),canStart=canStartSpeaking(data),agreed=!!data.speakingConsentAt;
 return <View style={{gap:space.md}}>
  <View><CharacterPeek interactive={false} character="C03" action="A31" maxSize={300}/>
   <CardView>
    <Copy variant="heading">배운 것을 말로 설명해요</Copy>
    <Copy>{'오늘 '+today.minutes+'분 · '+today.won.toLocaleString('ko-KR')+'원 받았어요'}</Copy>
    <SpeakingProgress data={data} dayKey={dayKey}/>
    <Copy variant="caption" muted>말한 글자를 쌓아서 500자 → 1,000자 → 1,500자… 채울 때마다 5분·500원을 받아요. 되묻는 질문 답변은 2배로 인정해요. 정답 여부로 깎지 않아요.</Copy>
   </CardView>
  </View>
  {!agreed?<CardView>
   <Copy variant="section">시작 전에 알려 드려요</Copy>
   <Copy>음성은 아이폰 음성 인식이 글자로 바꾸고, 음성 파일은 앱에 저장하지 않아요. 글자로 바뀐 내용만 서버를 거쳐 OpenAI로 보내 답변을 받아요.</Copy>
   <Copy variant="caption" muted>말한 내용, AI 답변, 보상 내역은 앱에 저장되고 하루 기록에서 다시 볼 수 있어요.</Copy>
   <Action label="확인했어요" disabled={!ready} onPress={()=>void update(s=>({...s,speakingConsentAt:new Date().toISOString()}))}/>
  </CardView>
  :<>
  {!canStart?<Notice tone="warning">공부 타이머가 진행 중이에요. 쉬는 시간이나 공부를 마친 뒤 시작할 수 있어요.</Notice>:null}
  {open?<CardView>
   <Copy variant="section">마치지 않은 말하기가 있어요</Copy>
   <Copy numberOfLines={3}>{open.question}</Copy>
   <Action label="이어서 마치기" onPress={()=>nav.navigate('SpeakingSession',{recordId:open.id})}/>
  </CardView>
  :canStart?<CardView>
   <Copy variant="section">무엇을 말해 볼까요?</Copy>
   <View>{SPEAKING_TOPICS.map(t=><TopicRow key={t.id} topic={t} disabled={!ready} onPress={()=>nav.navigate('SpeakingSession',{topicId:t.id})}/>)}</View>
  </CardView>:null}
  </>}
 </View>;
}
