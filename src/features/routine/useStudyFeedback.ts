import {useIsFocused} from '@react-navigation/native';
import {Audio} from 'expo-av';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {claimStudyAudio,registerStudyAudio} from '../../lib/studyAudioFocus';
import {untilFinished,withCelebrationAudio} from '../../lib/celebrationAudio';
import {useExperiencePreferences,loadExperiencePreferences,experiencePreferences} from '../../lib/experiencePreferences';

export type StudyFeedback={kind:'milestone'|'complete'|'timer';id:string};
const sources={milestone:require('../../../assets/sounds/study/milestone.mp3'),complete:require('../../../assets/sounds/study/complete.mp3'),timer:require('../../../assets/sounds/study/milestone.mp3')};

/** One short cue per achievement; rerenders and returning to the screen do not replay it. */
export function useStudyFeedback(event:StudyFeedback|null){
  const preferences=useExperiencePreferences();
  const focused=useIsFocused(),[foreground,setForeground]=useState(AppState.currentState==='active');
  const owner=useRef(Symbol('study-feedback')).current,sequence=useRef(0),seen=useRef(new Set<string>());
  const prepared=useRef(new Map<StudyFeedback['kind'],Promise<Audio.Sound|null>>());
  const playing=useRef<Audio.Sound|null>(null);
  const stop=useCallback(async()=>{sequence.current++;const player=playing.current;playing.current=null;if(player)await player.pauseAsync().catch(()=>{});},[]);
  useEffect(()=>registerStudyAudio(owner,stop),[owner,stop]);
  useEffect(()=>{const listener=AppState.addEventListener('change',state=>setForeground(state==='active'));return()=>listener.remove();},[]);
  useEffect(()=>{
    if(!focused||!foreground||!preferences.sound)return;
    let active=true;const players=new Set<Audio.Sound>(),pending=new Map<StudyFeedback['kind'],Promise<Audio.Sound|null>>();
    const mode=Audio.setAudioModeAsync({allowsRecordingIOS:false,playsInSilentModeIOS:true,staysActiveInBackground:false,shouldDuckAndroid:true});
    for(const kind of ['milestone','complete','timer'] as const){
      pending.set(kind,mode.then(()=>Audio.Sound.createAsync(sources[kind],{shouldPlay:false,volume:0.65})).then(async({sound})=>{
        if(!active){await sound.unloadAsync();return null;}players.add(sound);return sound;
      }).catch(()=>null));
    }
    prepared.current=pending;
    return()=>{active=false;void stop();if(prepared.current===pending)prepared.current=new Map();for(const sound of players)void sound.unloadAsync().catch(()=>{});};
  },[focused,foreground,stop,preferences.sound]);
  useEffect(()=>{
    if(!event||!focused||!foreground||!preferences.sound||seen.current.has(event.id))return;
    seen.current.add(event.id);const ticket=++sequence.current;
    void (async()=>{
      await loadExperiencePreferences();if(!experiencePreferences().sound)return;
      await claimStudyAudio(owner);
      const sound=await prepared.current.get(event.kind);
      if(!sound||ticket!==sequence.current)return;
      // 축하음은 무음 스위치를 따른다(팀장 결정 B안). 학습 음성 모드는 끝난 뒤 되돌린다.
      playing.current=sound;await withCelebrationAudio(async()=>{await sound.replayAsync({rate:1,volume:0.65});await untilFinished(sound,1500);});
    })().catch(()=>{});
    return()=>{void stop();};
  },[event?.id,event?.kind,focused,foreground,owner,stop,preferences.sound]);
}
