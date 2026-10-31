import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import manifest from '../../assets/decks/remoteStudyAudio.json';
import { JapaneseNote } from './japaneseDeck';
import { supabase } from './supabase';
import { StudyAudioKind } from './studyAudio';
type Entry={Word:string;Word_Reading:string;Sentence:string;word:string;sentence:string;wordAliases?:string[];sentenceAliases?:string[]};
const entries=manifest as Record<string,Entry>;
const requests=new Map<string,{expires:number;promise:Promise<{uri:string}>}>();
export function remoteAudioName(note:JapaneseNote|undefined,kind:StudyAudioKind):string|null{
 if(!note)return null;const entry=entries[note.ID];if(!entry||note.Word!==entry.Word||note.Word_Reading!==entry.Word_Reading||kind==='sentence'&&note.Sentence!==entry.Sentence)return null;
 const name=entry[kind],field=kind==='word'?note.Word_Audio:note.Sentence_Audio;
 const aliases=kind==='word'?entry.wordAliases:entry.sentenceAliases;
 if(!/^[a-zA-Z0-9_-]+\.(mp3|wav)$/.test(name)||field&&field!==`[sound:${name}]`&&!aliases?.some(alias=>field===`[sound:${alias}]`))return null;return name;
}
export async function cachedRemoteAudio(note:JapaneseNote|undefined,kind:StudyAudioKind):Promise<{uri:string}|null>{
 const name=remoteAudioName(note,kind);if(!name)return null;
 const {data}=await supabase.auth.getSession();const userId=data.session?.user.id;if(!userId)throw new Error('단어 음성을 받으려면 같은 구글 계정으로 로그인해 주세요.');
 const key=`${userId}:${name}`,cached=requests.get(key);if(cached&&cached.expires>Date.now())return cached.promise;
 const promise=(async()=>{
  const cacheDir=FileSystem.cacheDirectory?`${FileSystem.cacheDirectory}study-audio-${userId}/`:null,cachePath=cacheDir?cacheDir+name:null;
  if(Platform.OS!=='web'&&cachePath){const info=await FileSystem.getInfoAsync(cachePath);if(info.exists&&(info.size??0)>100)return {uri:cachePath};}
  const {data,error}=await supabase.storage.from('diary-photos').createSignedUrl(`${userId}/study-audio/${name}`,3600);
  if(error||!data?.signedUrl)throw new Error('음성을 받지 못했어요. 컴퓨터에서 음성 전송이 끝났는지 확인해 주세요.');
  if(Platform.OS==='web'||!cachePath||!cacheDir)return {uri:data.signedUrl};
  await FileSystem.makeDirectoryAsync(cacheDir,{intermediates:true}).catch(()=>{});
  const partial=cachePath+'.partial';
  try{
   const downloaded=await FileSystem.downloadAsync(data.signedUrl,partial),info=await FileSystem.getInfoAsync(partial);
   if(downloaded.status!==200||!info.exists||(info.size??0)<=100)throw new Error('음성 다운로드를 완료하지 못했어요.');
   await FileSystem.moveAsync({from:partial,to:cachePath});return {uri:cachePath};
  }catch(e){await FileSystem.deleteAsync(partial,{idempotent:true}).catch(()=>{});throw e;}
 })();requests.set(key,{expires:Date.now()+50*60000,promise});try{return await promise;}catch(e){requests.delete(key);throw e;}
}
