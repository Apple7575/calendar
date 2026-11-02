import React from 'react';
import {Image,Pressable,View} from 'react-native';
import {RootScreenProps} from '../../navigation/types';
import {useDayData} from '../../hooks/useDayData';
import {toViewerPhoto} from '../../lib/diary';
import {DiaryTranslationCard} from '../../components/DiaryTranslationCard';
import {getDiaryTranslations} from '../../lib/diaryLang';
import {Action,Copy,Link,Page,CardView,u} from './ui';
import {BoriScene} from './experience';
export function DiaryDetailScreen({route,navigation}:RootScreenProps<'DiaryDetail'>){
 const {date}=route.params,day=useDayData(date),diary=day.diary.diary;
 const [listening,setListening]=React.useState(false),[listenError,setListenError]=React.useState('');
 return <Page title={date.replace(/-/g,'.')} right={<Link label="수정하기" onPress={()=>navigation.navigate('DiaryEdit',{date})}/>}>
  {day.loading?<Copy muted>하루를 펼치고 있어요…</Copy>:null}
  {route.params.saved?<BoriScene action="A52" size={72} mood="celebrate" title="오늘을 남겨줘서 고마워요" description="한 페이지가 우리의 기억에 더해졌어요."/>:null}
  {day.error?<CardView><Copy muted>기록을 불러오지 못했어요. 연결을 확인한 뒤 다시 열어 주세요.</Copy><Link label="다시 불러오기" onPress={()=>void day.reload()}/></CardView>:null}
  {!diary&&!day.loading?<BoriScene action="A51" size={130} title="이날의 한 장을 남겨볼까요?" description="사진, 한 줄, 목소리. 어떤 방식도 좋아요."><Action label="일기 쓰기" onPress={()=>navigation.navigate('DiaryEdit',{date})}/></BoriScene>:diary?<>
   {day.diary.photos.map((photo,index)=><Pressable key={photo.id} accessibilityRole="button" accessibilityLabel={`${index+1}번째 사진 크게 보기`} onPress={()=>navigation.navigate('PhotoViewer',{photos:day.diary.photos.map(toViewerPhoto),index})}><Image source={{uri:photo.url}} resizeMode="cover" style={{width:'100%',aspectRatio:1.2,borderRadius:28}}/></Pressable>)}
   <View style={{padding:6,gap:16}}><Copy size={27} weight="800">{diary.highlight||'나의 하루'}</Copy>{diary.mood?<Copy size={24}>{diary.mood}</Copy>:null}<Copy size={17}>{diary.content||'사진으로 기억하는 하루'}</Copy>{diary.gratitude?<View><Copy muted size={12}>감사한 순간</Copy><Copy>{diary.gratitude}</Copy></View>:null}<View style={[u.row,{flexWrap:'wrap'}]}>{diary.sleep_hours!==null?<Copy muted size={12}>수면 {diary.sleep_hours}시간</Copy>:null}{diary.energy?<Copy muted size={12}>컨디션 {diary.energy}/5</Copy>:null}{diary.people?.length?<Copy muted size={12}>함께 {diary.people.join(', ')}</Copy>:null}</View></View>
   {diary.content.trim()?<><Action label={listening?'일본어를 준비하고 있어요…':'일본어로 듣기'} disabled={listening} onPress={()=>{setListening(true);setListenError('');void getDiaryTranslations(diary).then(result=>navigation.navigate('DiaryListen',{text:result.byLang.ja,original:diary.content})).catch(()=>setListenError('일본어 음성을 준비하지 못했어요. 연결을 확인하고 다시 시도해 주세요.')).finally(()=>setListening(false));}}/>{listenError?<Copy muted>{listenError}</Copy>:null}<DiaryTranslationCard diary={diary}/></>:null}
   <Action secondary label="일기 수정하기" onPress={()=>navigation.navigate('DiaryEdit',{date})}/>
  </>:null}
  <Link label="이날 일정·생활 기록 함께 보기" onPress={()=>navigation.navigate('DayDetail',{date})}/>
 </Page>;
}
