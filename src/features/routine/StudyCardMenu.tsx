import React,{useEffect,useRef,useState} from 'react';
import {KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,Switch,TextInput,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {favoriteWord,flagWord,setWordStudyStatus,STUDY_ISSUES,StudyIssue,Word} from '../../lib/routineModel';
import {useTheme} from '../../theme/ThemeContext';
import {useRoutine} from './RoutineProvider';
import {Action,Copy,Icon,Link,u} from './ui';
import {useReducedMotion} from './motion';
import {STUDY_RATES,StudyRate} from '../../lib/studyPlayback';
import * as Clipboard from 'expo-clipboard';
import {studyIssueText} from '../../lib/studyIssueExport';

type Props={word:Word;visible:boolean;onClose:()=>void;auto:boolean;sentenceAuto:boolean;toggleAuto:()=>Promise<void>;toggleSentenceAuto:()=>Promise<void>;rates:Record<'word'|'sentence',StudyRate>;setRate:(kind:'word'|'sentence',rate:StudyRate)=>Promise<void>};
const reportRows=[['wordAudio','volume-medium-outline','단어 음성','발음·반복·소리 문제'],['sentenceAudio','headset-outline','예문 음성','예문 발음·소리 문제'],['example','chatbox-outline','예문 내용·번역','문장이나 번역이 어색해요'],['meaning','book-outline','단어 뜻·읽기','뜻이나 읽기가 맞지 않아요']] as const;
export function StudyCardMenu({word,visible,onClose,auto,sentenceAuto,toggleAuto,toggleSentenceAuto,rates,setRate}:Props){
 const {colors:c}=useTheme(),{update,data,dayKey}=useRoutine(),insets=useSafeAreaInsets(),reduced=useReducedMotion();
 const [note,setNote]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[report,setReport]=useState(false),[custom,setCustom]=useState(false),inFlight=useRef(false);
 useEffect(()=>{if(visible){setNote(word.issue?.note??'');setError('');setReport(false);setCustom(false);}},[visible,word.id]);
 const close=()=>{if(!inFlight.current)onClose()};
 const run=async(transform:Parameters<typeof update>[0],dismiss=true)=>{if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');try{await update(transform);if(dismiss)onClose()}catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요. 다시 눌러 주세요.')}finally{inFlight.current=false;setBusy(false)}};
 const save=(category:StudyIssue)=>{if(category==='other'&&!note.trim()){setError('문제를 한 줄로 남겨 주세요.');return;}void run(s=>{const previous=s.words.find(w=>w.id===word.id)?.issue;return flagWord(s,word.id,[...new Set([...(previous?.categories??[]),category])],note,new Date(),dayKey)});};
 const changeAudio=(operation:()=>Promise<void>)=>{void operation().catch(()=>setError('음성 설정을 저장하지 못했어요. 다시 시도해 주세요.'))};
 return <Modal visible={visible} transparent animationType={reduced?'none':'fade'} onRequestClose={close}>
  <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,justifyContent:'flex-end',alignItems:'center',backgroundColor:'rgba(20,30,25,0.35)'}}>
   <Pressable accessibilityRole="button" accessibilityLabel="카드 옵션 닫기" onPress={close} style={{position:'absolute',inset:0}}/>
   <View style={{width:'100%',maxWidth:480,maxHeight:'90%',borderTopLeftRadius:30,borderTopRightRadius:30,backgroundColor:c.card,paddingHorizontal:22,paddingTop:12,paddingBottom:Math.max(insets.bottom,16),gap:10}}>
    <View accessibilityElementsHidden style={{alignSelf:'center',width:36,height:4,borderRadius:2,backgroundColor:c.border}}/>
    <View style={u.between}><Copy size={22} weight="800">{report?'어떤 부분이 이상했나요?':'카드 옵션'}</Copy><Link label="닫기" onPress={close}/></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:16,paddingBottom:8}}>
     {report?<>
      <View style={{borderRadius:20,padding:16,backgroundColor:c.primarySoft,gap:3}}><Copy size={23} weight="800">{word.front}</Copy>{word.fields?.Word_Reading?<Copy muted size={13}>{word.fields.Word_Reading}</Copy>:null}<Copy size={13}>유형을 누르면 바로 저장하고 학습에서 제외해요.</Copy></View>
      <View>{reportRows.map(([category,icon,title,description])=><Pressable key={category} accessibilityRole="button" accessibilityLabel={`${title} 신고`} accessibilityState={{disabled:busy}} disabled={busy} onPress={()=>save(category)} style={({pressed})=>({flexDirection:'row',gap:13,alignItems:'center',paddingVertical:13,paddingHorizontal:6,minHeight:64,borderBottomWidth:1,borderColor:c.border,backgroundColor:pressed?c.primarySoft:'transparent',opacity:busy?0.5:1})}><View style={{width:38,height:38,borderRadius:13,backgroundColor:c.inputBg,alignItems:'center',justifyContent:'center'}}><Icon name={icon} size={20}/></View><View style={{flex:1}}><Copy weight="700">{title}</Copy><Copy muted size={12}>{description}</Copy></View><Icon name="arrow-forward" size={18}/></Pressable>)}</View>
      <Link label={custom?'직접 입력 접기':'다른 문제 · 직접 설명하기'} onPress={()=>{setCustom(!custom);setError('')}}/>
      {custom?<View style={{gap:10}}><TextInput accessibilityLabel="오류 메모" placeholder="어떤 문제가 있었나요?" placeholderTextColor={c.textMuted} multiline maxLength={500} value={note} onChangeText={setNote} style={{minHeight:90,borderRadius:18,padding:14,color:c.text,backgroundColor:c.inputBg,textAlignVertical:'top'}}/><Action label={busy?'저장 중…':'설명 보내고 카드 제외'} disabled={busy||!note.trim()} onPress={()=>save('other')}/></View>:null}
      <Copy muted size={12}>‘모아둔 단어 → 확인 필요’에서 복사·수정하거나 다시 학습에 넣을 수 있어요.</Copy>
     </>:<>
      <Pressable accessibilityRole="button" accessibilityLabel={word.favorite?'즐겨찾기 해제':'즐겨찾기 추가'} disabled={busy} onPress={()=>void run(s=>favoriteWord(s,word.id),false)} style={{flexDirection:'row',alignItems:'center',gap:12,minHeight:48}}><Icon name={word.favorite?'star':'star-outline'}/><Copy weight="700">{word.favorite?'즐겨찾기에 저장됨':'즐겨찾기에 저장'}</Copy></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="문제 신고" onPress={()=>{setReport(true);setError('')}} style={{minHeight:56,flexDirection:'row',gap:12,alignItems:'center'}}><Icon name="flag-outline"/><View style={{flex:1}}><Copy weight="700">문제 신고</Copy><Copy muted size={12}>유형 한 번으로 저장·학습 제외</Copy></View><Icon name="chevron-forward" size={18}/></Pressable>
      <View style={{borderTopWidth:1,borderColor:c.border,paddingTop:10,gap:2}}><Link label="오늘만 숨기기 · 새벽 4시에 다시" onPress={()=>void run(s=>setWordStudyStatus(s,word.id,'bury',dayKey))}/><Link label="계속 학습에서 제외" onPress={()=>void run(s=>setWordStudyStatus(s,word.id,'suspend',dayKey))}/>{word.suspended||word.buriedOn===dayKey?<Link label="숨김·제외 해제" onPress={()=>void run(s=>setWordStudyStatus(s,word.id,'restore',dayKey))}/>:null}<Copy muted size={12}>숨기거나 제외해도 단어와 복습 진도는 보관해요.</Copy></View>
      <View style={{borderTopWidth:1,borderColor:c.border,paddingTop:14,gap:12}}>{([['정답 뒤 단어 자동 재생',auto,toggleAuto],['이어서 예문 자동 재생',sentenceAuto,toggleSentenceAuto]] as const).map(([title,value,operation])=><View key={title} style={[u.between,{gap:12}]}><View style={{flex:1}}><Copy>{title}</Copy></View><Switch trackColor={{false:c.border,true:c.primary}} thumbColor={c.white} ios_backgroundColor={c.border} accessibilityLabel={title} value={value} onValueChange={()=>changeAudio(operation)}/></View>)}<Copy muted size={12}>단어가 끝나면 0.5초 뒤에 예문을 들어요. 재생 속도를 바꿔도 간격은 같아요.</Copy></View>
      <View style={{gap:12}}><Copy weight="700">음성 속도</Copy>{(['word','sentence'] as const).map(kind=><View key={kind} style={{gap:6}}><Copy muted size={12}>{kind==='word'?'단어':'예문'}</Copy><View style={{flexDirection:'row',gap:5}}>{STUDY_RATES.map(rate=><Pressable key={rate} accessibilityRole="radio" accessibilityState={{checked:rates[kind]===rate}} aria-checked={rates[kind]===rate} accessibilityLabel={`${kind==='word'?'단어':'예문'} ${rate}배`} onPress={()=>changeAudio(()=>setRate(kind,rate))} style={{flex:1,minHeight:44,borderRadius:13,justifyContent:'center',alignItems:'center',backgroundColor:rates[kind]===rate?c.primarySoft:c.inputBg,borderWidth:1,borderColor:rates[kind]===rate?c.primary:c.border}}><Copy size={12}>{rate}×</Copy></Pressable>)}</View></View>)}</View>
      {word.issue?<View style={{gap:4}}><Copy muted size={12}>신고됨 · {word.issue.categories.map(v=>STUDY_ISSUES[v]).join(' · ')}</Copy><Link label="저장된 신고 복사" onPress={()=>{void Clipboard.setStringAsync(studyIssueText([word],data.decks)).then(()=>setError('복사했어요. 카카오톡이나 ChatGPT에 붙여넣어 주세요.')).catch(()=>setError('복사하지 못했어요. 다시 시도해 주세요.'))}}/><Link label="신고 해제하고 다시 학습" onPress={()=>void run(s=>flagWord(s,word.id,[],'',new Date(),dayKey))}/></View>:null}
     </>}
     {busy?<Copy muted size={12}>저장하고 있어요…</Copy>:null}{error?<Copy size={13}>{error}</Copy>:null}
    </ScrollView>
   </View>
  </KeyboardAvoidingView>
 </Modal>;
}

