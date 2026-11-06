import AsyncStorage from '@react-native-async-storage/async-storage';
import React,{useState} from 'react';
import { Alert,Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { makeBackup,validateBackup } from '../../lib/routineBackup';
import { backupMessage,type BackupAction } from '../../lib/backupMessage';
import { RootScreenProps } from '../../navigation/types';
import { useRoutine } from './RoutineProvider';
import { Action,CardView,Copy,Link,Page } from './ui';
export function BackupScreen({navigation}:RootScreenProps<'RoutineBackup'>){
 const {data,backupState,backupNow,restoreBackup,update,accountId}=useRoutine();
 const [busy,setBusy]=useState<BackupAction|null>(null),[message,setMessage]=useState<{action:BackupAction;text:string}|null>(null);
 // 취소면 fn이 false를 돌려준다. 결과는 누른 버튼이 있는 카드 안에 보여 준다.
 const run=async(action:BackupAction,fn:()=>Promise<boolean|void>)=>{setBusy(action);setMessage(null);
  try{const done=await fn();setMessage({action,text:backupMessage(action,done===false?{ok:false,cancelled:true}:{ok:true},Date.now())});}
  catch(e){setMessage({action,text:backupMessage(action,{ok:false,error:e instanceof Error?e.message:undefined},Date.now())});}
  finally{setBusy(null);}};
 const said=(...actions:BackupAction[])=>message&&message.text&&actions.includes(message.action)?<Copy>{message.text}</Copy>:null;
 const exportFile=async()=>{
  const body=JSON.stringify(makeBackup(data,accountId??'signed-out'),null,2),name=`routine-backup-${new Date().toISOString().slice(0,10)}.json`;
  if(Platform.OS==='web'){const url=URL.createObjectURL(new Blob([body],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  else {const path=FileSystem.cacheDirectory+name;await FileSystem.writeAsStringAsync(path,body);await Sharing.shareAsync(path,{mimeType:'application/json'});}
 };
 const importFile=async()=>{
  const result=await DocumentPicker.getDocumentAsync({type:['application/json','text/*'],copyToCacheDirectory:true});if(result.canceled)return false;
  const a=result.assets[0];if((a.size??0)>20*1024*1024)throw new Error('20MB 이하의 파일을 선택해 주세요.');
  const body=Platform.OS==='web'?await(a.file?a.file.text():fetch(a.uri).then(r=>r.text())):await new File(a.uri).text();
  const backup=validateBackup(JSON.parse(body),accountId??'signed-out');
  // Keep a downloaded recovery point before explicitly replacing local state.
  await AsyncStorage.setItem(`routine.v1.${accountId??'signed-out'}.before-restore`,JSON.stringify(data));await update(()=>backup.data);
 };
 return <Page title="백업·복구" right={<Link label="닫기" onPress={()=>navigation.goBack()}/>}>
  <CardView><Copy weight="800">현재 보관 중인 기록</Copy><Copy>단어 {data.words.length}장 · 실천 기록 {Object.keys(data.days).length}일 · 집중 공부 {data.bookSessions?.length??0}세트</Copy><Copy muted size={12}>복구 대상은 현재 로그인한 같은 계정의 가장 최근 백업이에요. 복구 전 로컬 원본은 별도로 보존해요.</Copy></CardView>
  <CardView><Copy size={22} weight="800">쌓은 진도를 안전하게</Copy><Copy muted>단어·FSRS 진도·즐겨찾기·신고·루틴·공부 기록을 보관해요. 일기와 사진은 기존 서버 저장소에 따로 유지돼요.</Copy><Copy size={13}>제한 앱 선택과 iOS 권한은 재설치 후 다시 설정해야 해요.</Copy></CardView>
  <CardView><Copy weight="700">자동 클라우드 백업</Copy><Copy>{backupState.busy?'백업 처리 중':backupState.error?'백업에 실패했어요. 다시 시도해 주세요.':accountId&&!accountId.startsWith('web-')?'계정 연결 · 변경 후 자동 보관':'실제 계정 연결 후 자동 백업 가능'}</Copy><Copy muted>{backupState.lastAt?`마지막 성공 ${new Date(backupState.lastAt).toLocaleString('ko-KR')}`:'백업 성공 기록이 아직 없어요.'}</Copy><Copy muted size={13}>변경 후 잠시 멈추면 같은 계정의 비공개 저장소에 보관해요. 새 설치에서는 첫 실행에 백업을 찾아요.</Copy>
  <Action label={backupState.busy?'백업하고 있어요…':'지금 백업'} disabled={!!busy||backupState.busy} onPress={()=>void run('backup',backupNow)}/>
  <Action secondary label="최근 백업으로 복구" disabled={!!busy||backupState.busy} onPress={()=>{if(Platform.OS==='web'){if(window.confirm('최근 백업으로 현재 학습 기록을 복구할까요? 기존 로컬 기록은 별도 보존해요.'))void run('restore',restoreBackup);}else Alert.alert('백업으로 복구','현재 기록을 최근 백업으로 복구해요. 로컬 원본은 별도 보존해요.',[{text:'취소'},{text:'복구',onPress:()=>void run('restore',restoreBackup)}]);}}/>
  {backupState.error?<Copy size={13}>{backupState.error}</Copy>:null}{said('backup','restore')}</CardView>
  <CardView><Copy weight="700">파일로도 보관하기</Copy><Action secondary label="백업 파일 내보내기" disabled={!!busy} onPress={()=>void run('export',exportFile)}/><Action secondary label="백업 파일 가져오기" disabled={!!busy} onPress={()=>{if(Platform.OS==='web'){if(window.confirm('현재 기록을 먼저 파일로 보관하고 선택한 백업으로 복구할까요?'))void run('import',importFile);}else Alert.alert('파일 복구','현재 기록을 먼저 내보내고 같은 계정의 백업 파일로 복구해요.',[{text:'취소'},{text:'진행',onPress:()=>void run('import',importFile)}]);}}/>{said('export','import')}</CardView>
 </Page>;
}
