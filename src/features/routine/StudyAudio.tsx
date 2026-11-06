import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';
import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { cachedRemoteAudio,remoteAudioName } from '../../lib/remoteStudyAudio';
import { JapaneseNote } from '../../lib/japaneseDeck';
import { resolveStudyAudio, StudyAudioKind } from '../../lib/studyAudio';
import { Action, Copy, Link } from './ui';
import { useSession } from '../../hooks/useSession';
import { parseStudyRate,StudyRate,studyRateKey,WORD_SENTENCE_GAP_MS } from '../../lib/studyPlayback';
import {claimStudyAudio,registerStudyAudio} from '../../lib/studyAudioFocus';
import {playbackAudioMode} from '../../lib/focusNoise';
import {duckFocusNoise} from '../../lib/focusNoisePlayer';

const preference = 'routine.studyAudio.auto.v1';
const sentencePreference = 'routine.studyAudio.sentenceAuto.v1';
export function useStudyAudio(note: JapaneseNote | undefined, kind: StudyAudioKind = 'word', enabled = true) {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [auto, setAuto] = useState(false), [loaded, setLoaded] = useState(false);
  const [sentenceAuto,setSentenceAuto]=useState(false);
  const sentenceAutoRef=useRef(false);
  const sentenceDelay=useRef<ReturnType<typeof setTimeout>|null>(null);
  const audioOwner=useRef(Symbol('study-vocabulary')).current;
  const [rates,setRates]=useState<Record<StudyAudioKind,StudyRate>>({word:1,sentence:1});
  const ratesRef=useRef(rates);
  const [playing, setPlaying] = useState<StudyAudioKind | null>(null);
  const [loading, setLoading] = useState<StudyAudioKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sound = useRef<Audio.Sound | null>(null);
  const prepared=useRef(new Map<StudyAudioKind,Promise<Audio.Sound|null>>());
  const pauseTask=useRef<Promise<void>>(Promise.resolve());
  const sequence = useRef(0), alive = useRef(true), autoPlayed = useRef(false), saving = useRef(false);
  const {session,loading:sessionLoading}=useSession();
  const sourceKey=note?[session?.user.id??'signed-out',note.ID,note.Word,note.Word_Reading,note.Sentence,note.Word_Audio,note.Sentence_Audio].join('\u001f'):'';
  type Source=number|{uri:string}|null;
  const [remote,setRemote]=useState<{key:string;word:Source;sentence:Source}>({key:'',word:null,sentence:null});
  const [sourceLoading,setSourceLoading]=useState(false),[reload,setReload]=useState(0);
  const bundledWord=resolveStudyAudio(note,'word'),bundledSentence=resolveStudyAudio(note,'sentence');
  const wordSource=bundledWord??(remote.key===sourceKey?remote.word:null),sentenceSource=bundledSentence??(remote.key===sourceKey?remote.sentence:null);
  const stop = useCallback(() => {
    if(sentenceDelay.current!==null){clearTimeout(sentenceDelay.current);sentenceDelay.current=null;}
    sequence.current++;
    const previous = sound.current; sound.current = null;
    if (previous) { previous.setOnPlaybackStatusUpdate(null); pauseTask.current=previous.pauseAsync().then(()=>{}).catch(()=>{}); }
    if (alive.current) { setPlaying(null); setLoading(null); }
    return pauseTask.current;
  }, []);
  useEffect(()=>registerStudyAudio(audioOwner,stop),[audioOwner,stop]);
  // Focus noise steps back while a word or sentence is loading or playing.
  const speaking=playing!==null||loading!==null;
  useEffect(()=>speaking?duckFocusNoise():undefined,[speaking]);
  useEffect(()=>{
    if(!focused||!foreground)return;
    let active=true;const players=new Set<Audio.Sound>(),pending=new Map<StudyAudioKind,Promise<Audio.Sound|null>>();
    const mode=Audio.setAudioModeAsync(playbackAudioMode());
    for(const [target,source]of [['word',wordSource],['sentence',sentenceSource]]as const){
      if(source===null)continue;
      const task=mode.then(()=>Audio.Sound.createAsync(source,{shouldPlay:false,progressUpdateIntervalMillis:50})).then(async result=>{
        if(!active){await result.sound.unloadAsync();return null;}
        players.add(result.sound);return result.sound;
      }).catch(()=>{if(active&&alive.current)setError('음성을 준비하지 못했어요. 다시 시도해 주세요.');return null;});
      pending.set(target,task);
    }
    prepared.current=pending;
    return()=>{active=false;stop();if(prepared.current===pending)prepared.current=new Map();for(const player of players){player.setOnPlaybackStatusUpdate(null);void player.unloadAsync().catch(()=>{});}};
  },[sourceKey,wordSource,sentenceSource,focused,foreground,reload,stop]);
  useEffect(()=>{
    let live=true;const needWord=bundledWord===null&&!!remoteAudioName(note,'word'),needSentence=bundledSentence===null&&!!remoteAudioName(note,'sentence');
    if(!needWord&&!needSentence)return;
    setSourceLoading(true);setError(null);
    Promise.allSettled([needWord?cachedRemoteAudio(note,'word'):Promise.resolve(bundledWord),needSentence?cachedRemoteAudio(note,'sentence'):Promise.resolve(bundledSentence)]).then(([word,sentence])=>{if(!live)return;setRemote({key:sourceKey,word:word.status==='fulfilled'?word.value:null,sentence:sentence.status==='fulfilled'?sentence.value:null});const failure=word.status==='rejected'?word.reason:sentence.status==='rejected'?sentence.reason:null;if(failure)setError(failure instanceof Error?failure.message:'일부 음성을 준비하지 못했어요.');}).finally(()=>{if(live)setSourceLoading(false);});
    return()=>{live=false};
  },[sourceKey,reload]);
  useEffect(()=>{stop();},[sourceKey,stop]);
  useEffect(() => {
    alive.current = true;
    Promise.all([AsyncStorage.getItem(preference),AsyncStorage.getItem(sentencePreference),AsyncStorage.getItem(studyRateKey('word')),AsyncStorage.getItem(studyRateKey('sentence'))]).then(([value,sentence,wordRate,sentenceRate]) => {
      if (alive.current) { const next={word:parseStudyRate(wordRate),sentence:parseStudyRate(sentenceRate)};ratesRef.current=next;setRates(next);setAuto(value !== 'false');setSentenceAuto(sentence==='true');sentenceAutoRef.current=sentence==='true';setLoaded(true); }
    }).catch(() => { if (alive.current) { setAuto(false); setLoaded(true); } });
    const listener = AppState.addEventListener('change', state => {
      setForeground(state === 'active'); if (state !== 'active') stop();
    });
    return () => { alive.current = false; listener.remove(); stop(); };
  }, [stop]);
  useEffect(() => { if (!enabled || !focused || !foreground) stop(); }, [enabled, focused, foreground, stop]);
  const play = useCallback(async (target: StudyAudioKind, continueSentence = false) => {
    const source = target === 'word' ? wordSource : sentenceSource;
    if (source === null || !enabled || !focused || !foreground) return;
    stop();const ticket = sequence.current;
    setError(null);setLoading(target);
    let created: Audio.Sound | null = null;
    try {
      await pauseTask.current;
      await claimStudyAudio(audioOwner);
      created=await prepared.current.get(target)??null;
      if (!alive.current || ticket !== sequence.current) return;
      if(!created){setLoading(null);setError('음성을 준비하지 못했어요. 다시 시도해 주세요.');return;}
      sound.current = created;
      created.setOnPlaybackStatusUpdate(status => {
        if (!alive.current || ticket !== sequence.current) return;
        if (status.isLoaded && status.didJustFinish) {
          stop();
          if(continueSentence&&target==='word'&&sentenceAutoRef.current&&alive.current){const nextTicket=sequence.current;sentenceDelay.current=setTimeout(()=>{sentenceDelay.current=null;if(alive.current&&nextTicket===sequence.current&&sentenceAutoRef.current)void play('sentence');},WORD_SENTENCE_GAP_MS);}
        }
        else if (!status.isLoaded && status.error) { setError('음성을 재생하지 못했어요. 듣기 버튼을 다시 눌러 주세요.'); stop(); }
      });
      await created.replayAsync({rate:ratesRef.current[target],shouldCorrectPitch:true,pitchCorrectionQuality:Audio.PitchCorrectionQuality.Medium});
      if (alive.current && ticket === sequence.current) { setPlaying(target);setLoading(null); }
    } catch {
      if (alive.current && ticket === sequence.current) { stop();setError('음성을 재생하지 못했어요. 듣기 버튼을 다시 눌러 주세요.'); }
    }
  }, [wordSource, sentenceSource, enabled, focused, foreground, stop,audioOwner]);
  useEffect(() => {
    if (enabled && loaded && !sessionLoading && auto && focused && foreground && !autoPlayed.current && (kind === 'word' ? wordSource : sentenceSource) !== null) {
      autoPlayed.current = true;void play(kind,true);
    }
  }, [enabled, loaded, sessionLoading,auto, focused, foreground, kind, wordSource, sentenceSource, play]);
  const toggleAuto = async () => {
    if (saving.current) return;saving.current = true;
    const next = !auto;
    try {
      await AsyncStorage.setItem(preference, String(next));
      if (alive.current) { setAuto(next);if (!next) stop(); }
    } catch { if (alive.current) setError('자동 재생 설정을 저장하지 못했어요.'); }
    finally { saving.current = false; }
  };
  const toggleSentenceAuto=async()=>{
    if(saving.current)return;saving.current=true;const next=!sentenceAutoRef.current;
    try{await AsyncStorage.setItem(sentencePreference,String(next));if(alive.current){sentenceAutoRef.current=next;setSentenceAuto(next);if(!next)stop();}}
    catch{if(alive.current)setError('예문 재생 설정을 저장하지 못했어요.');}finally{saving.current=false;}
  };
  const setRate=async(target:StudyAudioKind,rate:StudyRate)=>{
    if(saving.current)return;saving.current=true;
    try{
      await AsyncStorage.setItem(studyRateKey(target),String(rate));
      if(!alive.current)return;
      ratesRef.current={...ratesRef.current,[target]:rate};setRates(ratesRef.current);
      const player=await prepared.current.get(target);
      if(player&&alive.current)await player.setRateAsync(rate,true,Audio.PitchCorrectionQuality.Medium);
    }catch{if(alive.current)setError('재생 속도를 적용하지 못했어요. 다시 선택해 주세요.');}
    finally{saving.current=false;}
  };
  return {wordSource,sentenceSource,auto,sentenceAuto,rates,setRate,loaded,sourceLoading,retrySources:()=>setReload(v=>v+1),playing,loading,error,toggleAuto,toggleSentenceAuto,play,stop};
}
export function StudyAudio({ note, kind = 'word' }: { note?: JapaneseNote; kind?: StudyAudioKind }) {
  const {wordSource,sentenceSource,auto,playing,loading,error,toggleAuto,play,stop}=useStudyAudio(note,kind);
  if (wordSource === null && sentenceSource === null) return null;
  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {(['word', 'sentence'] as const).filter(target => target === 'word' ? wordSource !== null : sentenceSource !== null).map(target =>
        <View style={{ flex: 1 }} key={target}><Action compact secondary
          label={loading === target ? '불러오는 중…' : playing === target ? '재생 멈추기' : target === 'word' ? '단어 듣기' : '예문 듣기'}
          onPress={() => { if (playing === target || loading === target) stop();else void play(target); }} /></View>)}
    </View>
    <Link label={`정답 뒤 자동 재생 · ${auto ? '켜짐' : '꺼짐'}`} onPress={() => void toggleAuto()} />
    <Copy muted size={11}>AI 음성 · cedar</Copy>
    {error ? <Copy muted size={12}>{error}</Copy> : null}
  </View>;
}
