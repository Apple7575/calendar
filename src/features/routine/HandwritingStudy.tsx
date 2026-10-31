import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Image,Linking,Modal,Platform,ScrollView,View} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import {recognizeHandwriting} from '../../lib/handwritingApi';
import {acceptHandwriting,outputCarry,outputPreview,outputUnitsOnDay,OUTPUT_POLICY} from '../../lib/handwriting';
import {getDay} from '../../lib/routineModel';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Copy,Link} from './ui';
import {BoriScene} from './experience';
import {useStudyFeedback} from './useStudyFeedback';
import {CelebrationSurface} from './CelebrationSurface';

export function HandwritingStudy(){
 const {data,dayKey,update,accountId,native}=useRoutine(),draft=data.outputDraft,pending=data.handwritingPending;
 const [photo,setPhoto]=useState<{uri:string;base64:string;hash:string}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[permission,setPermission]=useState(false),[saved,setSaved]=useState<{id:string;units:number;minutes:number}|null>(null);
 const controller=useRef<AbortController|null>(null),live=useRef(true),identity=useRef(accountId);identity.current=accountId;
 useEffect(()=>{live.current=true;return()=>{live.current=false;controller.current?.abort()}},[]);
 useStudyFeedback(saved?{kind:'complete',id:saved.id}:null);
 const subject=pending?.subject??draft?.subject??'공부',today=outputUnitsOnDay(data,dayKey,subject),preview=useMemo(()=>pending?outputPreview(data,pending.imageHash,pending.analysis):undefined,[data.handwritingReceipts,pending]);
 const pick=async(camera:boolean)=>{
  setBusy(true);setError('');setSaved(null);setPermission(false);
  try{
   if(camera&&Platform.OS!=='web'){const result=await ImagePicker.requestCameraPermissionsAsync();if(!result.granted){setPermission(true);throw new Error('노트를 찍으려면 카메라 권한이 필요해요. 앨범에서 고를 수도 있어요.');}}
   const picked=await(camera?ImagePicker.launchCameraAsync({mediaTypes:['images'],quality:1}):ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:1,selectionLimit:1}));
   if(picked.canceled)return;
   const asset=picked.assets[0],longest=Math.max(asset.width,asset.height),actions:ImageManipulator.Action[]=longest>2200?[{resize:asset.width>=asset.height?{width:2200}:{height:2200}}]:[];
   const image=await ImageManipulator.manipulateAsync(asset.uri,actions,{compress:0.9,format:ImageManipulator.SaveFormat.JPEG,base64:true});
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
   const candidate={id:Crypto.randomUUID(),imageHash:photo.hash,subject,analysis};await update(s=>({...s,handwritingPending:candidate}));
  }catch(e){if(live.current&&!abort.signal.aborted)setError(e instanceof Error?e.message:'사진을 읽지 못했어요.');}finally{if(live.current)setBusy(false);}
 };
 const save=async()=>{
  if(!pending||busy)return;setBusy(true);setError('');
  try{let result:{id:string;units:number;minutes:number}|null=null;await update(s=>{const next=acceptHandwriting(s,pending.id,pending.imageHash,pending.subject,pending.analysis);const receipt=next.handwritingReceipts?.find(r=>r.id===pending.id);if(receipt)result={id:receipt.id,units:receipt.units,minutes:receipt.minutes};return next});if(live.current){setSaved(result);setPhoto(null);}}
  catch(e){if(live.current)setError(e instanceof Error?e.message:'기록을 저장하지 못했어요.');}finally{if(live.current)setBusy(false);}
 };
 return <View style={{gap:16}}>
  <CardView><Copy weight="800" size={21}>{subject} · 손으로 남긴 공부</Copy><Copy>오늘 {today}자 / 기본 목표 {OUTPUT_POLICY.goalUnits}자</Copy><Copy muted size={13}>목표를 넘어도 계속 적립돼요. 타이머 없이 공부하고 사진만 찍어도 돼요.</Copy></CardView>
  {saved?<Modal visible presentationStyle="fullScreen" animationType="fade" onRequestClose={()=>setSaved(null)}><CelebrationSurface title={`${saved.units}자,\n내 힘으로 남겼어요!`} subtitle="손글씨 공부 기록 완료" onClose={()=>setSaved(null)} footer={<Action label="좋아요, 계속 공부할게요" onPress={()=>setSaved(null)}/>}><CardView style={{alignSelf:'stretch',alignItems:'center',gap:5}}><Copy muted size={12}>이번 손글씨 공부로 받은 시간</Copy><Copy size={44} weight="800">+{saved.minutes}분</Copy><Copy size={13}>{saved.minutes?!getDay(data,dayKey).paid.morning?'아침 루틴 후 사용할 수 있어요.':'시간 보관함에 적립했어요.':`${outputCarry(data)}자가 모였어요. ${100-outputCarry(data)}자 더 쓰면 +5분이에요.`}</Copy><Copy muted size={12}>손글씨 보상에는 하루 상한이 없어요.</Copy></CardView></CelebrationSurface></Modal>:null}
  {pending&&preview?<CardView><Copy size={21} weight="800">이렇게 읽었어요</Copy><Copy muted size={13}>{pending.analysis.languages.map(l=>({ko:'한글',en:'영어',ja:'일본어',math:'수식'}[l])).join(' · ')} · 새 분량 {preview.units}자{preview.duplicateUnits?` · 중복 제외 ${preview.duplicateUnits}자`:''}</Copy><ScrollView style={{maxHeight:240}} nestedScrollEnabled><Copy>{pending.analysis.lines.join('\n')}</Copy></ScrollView><Copy muted size={12}>틀리게 읽은 부분이 많으면 다시 찍어 주세요. 글자 수는 공백·문장부호를 뺀 문자와 숫자 기준이에요.</Copy><Action label={preview.units?`기록 저장 · ${preview.minutes?`+${preview.minutes}분`:`${preview.remainder}자 이어 모으기`}`:'이미 기록한 내용이에요'} disabled={busy||!preview.units} onPress={()=>void save()}/><Link label="이 결과 버리고 다시 찍기" disabled={busy} onPress={()=>{void update(s=>({...s,handwritingPending:undefined})).then(()=>setPhoto(null)).catch(e=>setError(e.message))}}/></CardView>:<CardView>
   {photo?<><Image source={{uri:photo.uri}} accessibilityLabel="선택한 공부 노트" style={{width:'100%',height:260,borderRadius:18}} resizeMode="contain"/><Action label={busy?'손글씨를 읽고 있어요…':'AI로 읽기'} disabled={busy} onPress={()=>void analyze()}/></>:null}
   <Action label={photo?'다른 노트 찍기':'노트 사진 찍기'} disabled={busy} onPress={()=>void pick(true)}/><Link label="앨범에서 노트 선택" disabled={busy} onPress={()=>void pick(false)}/>
   <Copy muted size={12}>선택한 사진을 AI 인식을 위해 OpenAI로 전송해요. 앱에는 인식된 글과 적립 내역만 저장해요. 한 쪽씩, 그림자 없이 선명하게 찍어 주세요.</Copy>
  </CardView>}
  {error?<CardView><Copy>{error}</Copy>{permission&&Platform.OS!=='web'?<Link label="카메라 권한 설정 열기" onPress={()=>void Linking.openSettings()}/>:null}</CardView>:null}
  <CardView><Copy weight="800">100자마다 +5분 · 하루 상한 없음</Copy><Copy muted size={13}>한글·영어·일본어를 섞어 써도 돼요. 숫자 풀이도 세고, 인쇄된 문제·낙서·공백은 세지 않아요. 정답 여부로 보상을 깎지 않아요.</Copy><Copy muted size={13}>남은 {outputCarry(data)}자는 다음 사진과 다음 날에도 이어져요. 이미 올린 사진과 겹치는 문장은 제외해요. 같은 내용을 새 종이에 다시 쓰면 중복으로 판단될 수 있어요.</Copy>{native?.supported&&!native.supportsHandwritingRewards?<Copy muted size={12}>이 버전은 손글씨 적립을 기기 제한 시간에 반영할 수 없어요. 새 아이폰 빌드가 필요해요.</Copy>:null}</CardView>
  {!pending?<Link label="이 과목 공부 마치기 · 기록은 유지" disabled={busy} onPress={()=>{void update(s=>({...s,outputDraft:undefined,bookTimer:s.bookTimer?{...s.bookTimer,phase:'idle',running:false,remaining:0}:undefined})).catch(e=>setError(e.message))}}/>:null}
  {(data.handwritingReceipts??[]).slice(-8).reverse().map(r=><CardView key={r.id}><Copy weight="700">{r.subject} · {r.units}자 · +{r.minutes}분</Copy><Copy muted size={12}>{new Date(r.at).toLocaleString('ko-KR')}</Copy><Copy numberOfLines={3}>{r.lines.join('\n')}</Copy></CardView>)}
 </View>;
}
