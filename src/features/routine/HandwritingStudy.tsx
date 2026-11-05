import {FOCUS_STAGE_MINUTES,focusPlanMinutesDue,focusRampStatus,focusRewardPreview,focusRunCredit} from '../../lib/focusRamp';
import {acceptDeclaredFinish} from '../../lib/bookStudy';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Image,Linking,Platform,ScrollView,View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {handwritingPhotoActions} from '../../lib/handwritingPhoto';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import {recognizeHandwriting} from '../../lib/handwritingApi';
import {acceptHandwriting,handwritingAccess,outputCarry,outputPreview,outputUnitsOnDay} from '../../lib/handwriting';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Copy,Link,Notice} from './ui';
import {FocusList,FocusListRow} from './FocusList';
import {rewardChange} from '../../lib/rewardChange';
import {canDeclareFinish,canTakeHandwritingPhoto} from '../../lib/focusFlow';

export function HandwritingStudy({declare=false,onPhotoChange,onSaving,moreRows,afterCard}:{declare?:boolean;onPhotoChange?:(hasPhoto:boolean)=>void;onSaving?:(saving:boolean)=>void;moreRows?:React.ReactNode;afterCard?:React.ReactNode}){
 const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
 const {data,dayKey,update,accountId,native}=useRoutine(),draft=data.outputDraft,pending=data.handwritingPending;
 const [photo,setPhoto]=useState<{uri:string;base64:string;hash:string}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[permission,setPermission]=useState(false),[details,setDetails]=useState(false),[history,setHistory]=useState(false);
 const [clock,setClock]=useState(Date.now());
 useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(id)},[]);
 const access=handwritingAccess(data,draft?.subject??'',clock),ramp=focusRampStatus(data,clock),requiredMinutes=ramp.required/60,met=canTakeHandwritingPhoto(data,clock),declaring=!met&&(declare&&canDeclareFinish(data,clock)||!!pending?.declared),canPhoto=met||declaring,reward=focusRewardPreview(data,draft?.subject??'',clock);
 const declaredStage=ramp.level&&ramp.required?Math.floor(FOCUS_STAGE_MINUTES[ramp.level]*Math.min(1,focusRunCredit(data,clock)/ramp.required))+focusPlanMinutesDue(data):0;
 useEffect(()=>{if(access.ready&&data.handwritingReceipts?.some(r=>r.subject===draft?.subject&&r.rewardStatus==='pending'))void update(s=>s).catch(e=>setError(e.message))},[access.ready,data.handwritingReceipts,draft?.subject,update]);
 const controller=useRef<AbortController|null>(null),live=useRef(true),identity=useRef(accountId);identity.current=accountId;
 useEffect(()=>{live.current=true;return()=>{live.current=false;controller.current?.abort()}},[]);

 const subject=pending?.subject??draft?.subject??'공부',today=outputUnitsOnDay(data,dayKey,subject),preview=useMemo(()=>pending?outputPreview(data,pending.imageHash,pending.analysis):undefined,[data.handwritingReceipts,pending]);
 useEffect(()=>{onPhotoChange?.(!!photo)},[photo,onPhotoChange]);
 const pick=async()=>{
  if(!canPhoto)return;
  setBusy(true);setError('');setPermission(false);
  try{
   if(Platform.OS!=='web'){const result=await ImagePicker.requestCameraPermissionsAsync();if(!result.granted){setPermission(true);throw new Error('노트를 찍으려면 카메라 권한이 필요해요. 설정에서 카메라를 켠 뒤 다시 시도해 주세요.');}}
   const picked=await ImagePicker.launchCameraAsync({mediaTypes:['images'],quality:1,exif:true});
   if(picked.canceled)return;
   const asset=picked.assets[0];
   const image=await ImageManipulator.manipulateAsync(asset.uri,handwritingPhotoActions(asset),{compress:0.9,format:ImageManipulator.SaveFormat.JPEG,base64:true});
   if(!image.base64||image.base64.length>6000000)throw new Error('사진이 너무 커요. 노트를 한 쪽씩 찍어 주세요.');
   const hash=await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256,image.base64);
   if(data.handwritingReceipts?.some(r=>r.imageHash===hash))throw new Error('이미 기록한 사진이에요. 새로 쓴 내용을 찍어 주세요.');
   if(live.current)setPhoto({uri:image.uri,base64:image.base64,hash});
  }catch(e){if(live.current)setError(e instanceof Error?e.message:'사진을 열지 못했어요.');}finally{if(live.current)setBusy(false);}
 };
 const analyze=async()=>{
  if(!photo||busy)return;setBusy(true);setError('');const owner=accountId,abort=new AbortController();controller.current=abort;
  try{const {analysis,ownerId}=await recognizeHandwriting(photo.base64,abort.signal);if(!live.current||identity.current!==owner)return;if(ownerId!==(owner?.startsWith('web-preview:')?owner.slice('web-preview:'.length):owner))throw new Error('공부 기록 계정이 달라졌어요. 다시 로그인해 주세요.');
   if(analysis.quality==='retake')throw new Error(analysis.message||'글씨가 잘 보이도록 다시 찍어 주세요.');
   if(!analysis.lines.length)throw new Error(analysis.message||'손으로 쓴 내용을 찾지 못했어요.');
   const candidate={id:Crypto.randomUUID(),imageHash:photo.hash,subject,analysis,...(declaring?{declared:true}:{})};await update(s=>({...s,handwritingPending:candidate}));
  }catch(e){if(live.current&&!abort.signal.aborted)setError(e instanceof Error?e.message:'사진을 읽지 못했어요.');}finally{if(live.current)setBusy(false);}
 };
 const save=async()=>{
  if(!pending||busy)return;setBusy(true);setError('');onSaving?.(true);
  try{let result:{id:string;units:number;minutes:number;waiting:boolean}|null=null,cash=0;await update(s=>{const next=pending.declared?acceptDeclaredFinish(s,pending.id,pending.imageHash,pending.subject,pending.analysis):acceptHandwriting(s,pending.id,pending.imageHash,pending.subject,pending.analysis,new Date(),'ramp-v2');cash=rewardChange(s,next,dayKey).cash;const receipt=next.handwritingReceipts?.find(r=>r.id===pending.id);if(receipt)result={id:receipt.id,units:receipt.units,minutes:receipt.minutes,waiting:receipt.rewardStatus==='pending'};return next});if(live.current){setPhoto(null);if(result){const r=result as {id:string;units:number;minutes:number;waiting:boolean};nav.navigate('EarnedReward',{id:r.id,kind:'handwriting',quantity:r.units,minutes:r.minutes,cash,cashEnabled:!!data.money,pending:r.waiting,cashBaseline:(data.money?.entries??[]).filter(e=>e.source==='output').reduce((n,e)=>n+e.amount,0)});}}}
  catch(e){onSaving?.(false);if(live.current)setError(e instanceof Error?e.message:'기록을 저장하지 못했어요.');}finally{if(live.current)setBusy(false);}
 };
 return <View style={{gap:16}}>
  <CardView>
   <View style={{gap:4}}><Copy weight="800" size={25}>{pending?'읽은 내용을 확인해 주세요':photo?'이 사진을 제출할까요?':'공부한 노트 한 쪽을 남겨요'}</Copy><Copy muted size={14}>{subject} · 오늘 인정 필기 {today}자</Copy><Copy muted size={14}>{ramp.needsPlan?'계획부터 시작해 주세요.':declaring?'여기서 끝내요 · 새 글자 100자부터 공부한 만큼 받아요'+(ramp.plan?.text?' · 계획: '+ramp.plan.text:''):met?'실제 공부 시간 충족 · 새 필기를 확인하면 +'+reward.due+'분':'타이머를 끝까지 채우면 사진을 찍을 수 있어요'}</Copy></View>
   {error?<View style={{gap:10}}><Notice tone="error">{error}</Notice>{permission?<><Action label="설정 열기" onPress={()=>void Linking.openSettings()}/><Link label="다시 시도" disabled={busy} onPress={()=>pick()}/></>:null}</View>:null}
   {pending&&preview?<><Copy muted size={13}>{pending.analysis.languages.map(l=>({ko:'한글',en:'영어',ja:'일본어',math:'수식'}[l])).join(' · ')} · 새 분량 {preview.units}자{preview.duplicateUnits?` · 중복 제외 ${preview.duplicateUnits}자`:''}</Copy><ScrollView style={{maxHeight:240}} nestedScrollEnabled><Copy>{pending.analysis.lines.join('\n')}</Copy></ScrollView><Action label={busy?'저장하고 있어요…':!preview.units?'이미 기록한 내용이에요':ramp.needsPlan?'사진 저장 · 계획부터 시작':access.ready?'이번 단계 완료 · +'+(reward.due+preview.minutes)+'분 받기':pending.declared?(preview.units<100?'새 글자 '+preview.units+'자 · 100자부터 끝낼 수 있어요':'내가 공부한 글 맞아요 · 다 했어요 +'+(declaredStage+preview.minutes)+'분'):'사진 저장 · '+requiredMinutes+'분 공부 후 보상'} disabled={busy||!preview.units||!!pending.declared&&!access.ready&&preview.units<100} onPress={()=>void save()}/><Link label="이 결과 버리고 다시 찍기" disabled={busy} onPress={()=>{void update(s=>({...s,handwritingPending:undefined})).then(()=>setPhoto(null)).catch(e=>setError(e.message))}}/><Copy muted size={12}>틀리게 읽은 부분이 많으면 다시 찍어 주세요. 돈 보상의 글자 수는 공백·문장부호를 뺀 문자와 숫자 기준이에요.</Copy></>:<>
    {photo?<><Image source={{uri:photo.uri}} accessibilityLabel="선택한 공부 노트" style={{width:'100%',height:260,borderRadius:18}} resizeMode="contain"/><Action label={busy?'손글씨를 읽고 있어요…':'AI로 읽기'} loading={busy} onPress={()=>void analyze()}/><Link label="다른 노트 찍기" disabled={busy} onPress={()=>pick()}/></>:permission||!canPhoto?null:<Action label="노트 사진 찍기" accessibilityLabel="노트 사진 찍기" icon="camera" disabled={busy} onPress={()=>pick()}/>}
    <Copy muted size={12}>선택한 사진을 AI 인식을 위해 OpenAI로 전송해요. 앱에는 인식된 글과 적립 내역만 저장해요. 한 쪽씩, 그림자 없이 선명하게 찍어 주세요.</Copy>
   </>}
  </CardView>
  {photo||pending?null:afterCard}
  <FocusList>
   <FocusListRow label="보상 기준·사진 안내" open={details} last={!!photo||!!pending} onPress={()=>setDetails(v=>!v)}/>
   {photo||pending?null:<FocusListRow label="이전 필기 기록" open={history} last={!moreRows} onPress={()=>setHistory(v=>!v)}/>}
   {photo||pending?null:moreRows}
  </FocusList>
  {details?<CardView><Copy weight="800">단계 시간 2분 1 · 5분 2 · 10분 4 · 15분 6 · 25분 10분, 계획 1분</Copy><Copy weight="800">돈 2분 100 · 5분 200 · 10분 400 · 15분 700 · 25분 1,500원, 계획 100원</Copy><Copy weight="800">필기 100자당 5분 · 500원</Copy><Copy muted size={13}>한글·영어·일본어를 섞어 써도 돼요. 숫자 풀이도 세고, 인쇄된 문제·낙서·공백은 세지 않아요. 정답 여부로 보상을 깎지 않아요.</Copy><Copy muted size={13}>남은 {outputCarry(data)}자는 다음 사진과 다음 날에도 이어져요. 이미 올린 사진과 겹치는 문장은 제외해요. 같은 내용을 새 종이에 다시 쓰면 중복으로 판단될 수 있어요.</Copy>{native?.supported&&!native.supportsHandwritingRewards?<Copy muted size={12}>이 버전은 손글씨 적립을 기기 제한 시간에 반영할 수 없어요. 새 아이폰 빌드가 필요해요.</Copy>:null}{!data.money?<><Copy muted size={13}>돈 보상을 켜면 다음에 정산하는 공부부터 돈도 함께 받아요.</Copy><Link label="돈 보상 시작·설정" onPress={()=>nav.navigate('MoneyWallet')}/></>:null}</CardView>:null}
  {history&&!photo&&!pending?(data.handwritingReceipts??[]).slice(-8).reverse().map(r=><CardView key={r.id}><Copy weight="700">{r.subject} · {r.units}자 · {r.rewardStatus==='pending'?'보상 대기':'+'+r.minutes+'분'}</Copy><Copy muted size={12}>{new Date(r.at).toLocaleString('ko-KR')}</Copy><Copy numberOfLines={3}>{r.lines.join('\n')}</Copy></CardView>):null}
 </View>;
}
