import React,{useEffect,useMemo,useRef,useState} from 'react';
import {View} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import {BUILD_CHECKS,buildCheckReport,latestBuild,loadBuildCheck,saveBuildCheck,type BuildCheckState} from '../../lib/buildChecklist';
import {evaluateSelfCheck,selfCheckLines,type SelfCheckState} from '../../lib/selfCheck';
import {collectSelfCheckProbe} from '../../lib/selfCheckProbe';
import {RootScreenProps} from '../../navigation/types';
import {space} from '../../theme/tokens';
import {Segments} from './experience';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Choice,Copy,Field,LoadingState,Notice,Page} from './ui';

const MARK:Record<SelfCheckState,string>={ok:'✓ 됨',fail:'✗ 안 됨',wait:'… 확인 중',skip:'– 건너뜀'};

export function BuildCheckScreen(_:RootScreenProps<'BuildCheck'>){
 const [build,setBuild]=useState(latestBuild()),[state,setState]=useState<BuildCheckState|null>(null),[message,setMessage]=useState<{tone:'success'|'error';text:string}|null>(null);
 const list=BUILD_CHECKS.find(b=>b.build===build)!,loaded=useRef(0);
 const {native,ready,error}=useRoutine();
 // 앱이 스스로 확인한 칸: 설치된 바이너리를 보므로 고른 빌드와 상관없이 최신 확인표 번호와 비교한다. 읽기만 한다.
 const auto=useMemo(()=>evaluateSelfCheck(collectSelfCheckProbe({checklistBuild:latestBuild(),native,ready,error})),[native,ready,error]);
 useEffect(()=>{let live=true;setState(null);void loadBuildCheck(build).then(value=>{if(live){loaded.current=build;setState(value);}});return()=>{live=false;};},[build]);
 const change=(id:string,patch:{ok?:boolean;note?:string})=>setState(current=>{
  const before=current?.[id]??{note:''},next={...current,[id]:{...before,...patch}};
  if(loaded.current===build)void saveBuildCheck(build,next).catch(()=>setMessage({tone:'error',text:'이 기기에 저장하지 못했어요. 다시 눌러 주세요.'}));
  return next;
 });
 const copy=async()=>{
  if(!state)return;
  try{await Clipboard.setStringAsync(buildCheckReport(list,state,new Date(),selfCheckLines(auto)));setMessage({tone:'success',text:'복사했어요. PM에게 붙여 넣어 보내 주세요.'});}
  catch{setMessage({tone:'error',text:'복사하지 못했어요. 다시 눌러 주세요.'});}
 };
 return <Page title="이번 빌드 확인" footer={state?<Action label="PM에게 보낼 글 복사" icon="copy-outline" onPress={()=>void copy()}/>:undefined}>
  <Copy muted>설치한 빌드에서 하나씩 해 보고 표시해 주세요. 표시와 메모는 이 기기에만 남아요.</Copy>
  {BUILD_CHECKS.length>1?<Segments value={String(build)} onChange={value=>setBuild(Number(value))} items={BUILD_CHECKS.map(b=>({id:String(b.build),label:`빌드 ${b.build}`}))}/>:<Copy variant="section">{`빌드 ${build}`}</Copy>}
  {message?<Notice tone={message.tone}>{message.text}</Notice>:null}
  <CardView>
   <Copy variant="label">앱이 스스로 확인한 칸</Copy>
   <Copy muted>설치된 앱에 필요한 부품이 들어 있는지 앱이 직접 봤어요. 권한을 묻거나 잠금을 바꾸지 않아요.</Copy>
   {auto.some(r=>r.state==='fail')?<Notice tone="error">안 된 칸이 있어요. 아래 복사 버튼으로 PM에게 바로 보내 주세요.</Notice>:null}
   {auto.map(r=><View key={r.id} accessible accessibilityLabel={`${r.title} ${MARK[r.state]}. ${r.detail}`} style={{gap:space.xxs}}>
    <Copy weight="700">{`${MARK[r.state]} · ${r.title}`}</Copy><Copy muted>{r.detail}</Copy>
   </View>)}
  </CardView>
  {!state?<LoadingState label="확인표를 여는 중…"/>:list.items.map(item=>{const mark=state[item.id];return <CardView key={item.id}>
   <View style={{gap:space.xxs}}><Copy variant="label">{item.title}</Copy>{item.how?<Copy muted>{item.how}</Copy>:null}</View>
   <View style={{flexDirection:'row',gap:space.xs}}>
    <View style={{flex:1}}><Choice fill label="됨" accessibilityLabel={`${item.title} 됨`} selected={mark?.ok===true} onPress={()=>change(item.id,{ok:mark?.ok===true?undefined:true})}/></View>
    <View style={{flex:1}}><Choice fill label="안 됨" accessibilityLabel={`${item.title} 안 됨`} selected={mark?.ok===false} onPress={()=>change(item.id,{ok:mark?.ok===false?undefined:false})}/></View>
   </View>
   <Field accessibilityLabel={`${item.title} 메모`} label="메모 (선택)" value={mark?.note??''} onChangeText={note=>change(item.id,{note})} maxLength={120}/>
  </CardView>;})}
 </Page>;
}
