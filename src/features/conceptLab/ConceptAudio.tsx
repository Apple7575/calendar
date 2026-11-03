import React,{useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {Audio} from 'expo-av';
import {useIsFocused} from '@react-navigation/native';
import {n3Deck} from '../../lib/n3Deck';
import {resolveStudyAudio} from '../../lib/studyAudio';
import {claimStudyAudio,registerStudyAudio} from '../../lib/studyAudioFocus';
import {Action,Copy} from '../routine/ui';
import {conceptAudioAssets} from '../../../assets/concept-lab/audioAssets';
import {corpusAudioAssets} from '../../../assets/concept-lab/corpusAudioAssets';

export function ConceptAudio({noteId,assetId,kind='word'}:{noteId?:string;assetId?:string;kind?:'word'|'sentence'}){
 const focused=useIsFocused(),owner=useRef(Symbol('concept-audio')).current,sound=useRef<Audio.Sound|null>(null),version=useRef(0),alive=useRef(true);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function stop(){version.current++;const old=sound.current;sound.current=null;if(old)await old.unloadAsync().catch(()=>{});}
 useEffect(()=>{alive.current=true;const unregister=registerStudyAudio(owner,stop),listener=AppState.addEventListener('change',state=>{if(state!=='active')void stop();});return()=>{alive.current=false;unregister();listener.remove();void stop();};},[]);
 useEffect(()=>{if(!focused)void stop();},[focused]);
 async function play(){setBusy(true);setError('');try{
  await stop();const ticket=version.current;await claimStudyAudio(owner);
  const source=assetId?(conceptAudioAssets[assetId]??corpusAudioAssets[assetId]):resolveStudyAudio(n3Deck.notes.find(n=>n.ID===noteId),kind);if(source===null||source===undefined)throw new Error('검수된 저장 음성을 찾지 못했어요.');
  await Audio.setAudioModeAsync({allowsRecordingIOS:false,playsInSilentModeIOS:true,staysActiveInBackground:false});
  const {sound:player}=await Audio.Sound.createAsync(source,{shouldPlay:false});
  if(!alive.current||ticket!==version.current){await player.unloadAsync();return;}sound.current=player;await player.playAsync();
 }catch(e){if(alive.current)setError(e instanceof Error?e.message:'음성을 재생하지 못했어요. 다시 시도해 주세요.');}finally{if(alive.current)setBusy(false);}}
 return <><Action label={busy?'음성 준비 중…':'문제 음성 듣기'} secondary disabled={busy} onPress={()=>void play()}/>{error?<Copy>{error}</Copy>:null}</>;
}
