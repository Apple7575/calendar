import React,{useEffect,useRef,useState} from 'react';
import {Platform,Pressable,Text,View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {animalCharacters,animalClip,AnimalActionId,AnimalCharacterId} from './animalAssets';
import {BoriMascot} from './AnimalMascot';
import {AnimalSharedScene} from './AnimalSharedScene';
import {useAnimalCharacter,setAnimalCharacter} from '../../lib/animalPreference';
import {useReducedMotion} from './motion';
import {Action,CardView,Copy,Link,Page} from './ui';
import {useTheme} from '../../theme/ThemeContext';

export function AnimalPreviewScreen(){
 const selected=useAnimalCharacter(),navigation=useNavigation(),{colors:c}=useTheme(),reduced=useReducedMotion();
 const [character,setCharacter]=useState<AnimalCharacterId>(selected),[action,setAction]=useState<AnimalActionId>('A01'),[replay,setReplay]=useState(0),[frame,setFrame]=useState<number|undefined>(),[night,setNight]=useState(false),[error,setError]=useState(''),[measuring,setMeasuring]=useState(false),[measurement,setMeasurement]=useState('');
 const raf=useRef<number|null>(null),clip=animalClip(character,action);
 useEffect(()=>()=>{if(raf.current!==null)cancelAnimationFrame(raf.current)},[]);
 const measure=()=>{if(measuring)return;setMeasuring(true);setMeasurement('10초 동안 JS 프레임 간격을 측정해요.');let first=0,last=0;const samples:number[]=[];
  const tick=(now:number)=>{if(!first){first=last=now;}else{samples.push(now-last);last=now;}if(now-first<10000){raf.current=requestAnimationFrame(tick);return;}samples.sort((a,b)=>a-b);setMeasuring(false);raf.current=null;setMeasurement(Platform.OS+' · JS 프레임 간격 중앙 '+(samples[Math.floor(samples.length*.5)]??0).toFixed(1)+'ms · 95% '+(samples[Math.floor(samples.length*.95)]??0).toFixed(1)+'ms · 50ms 초과 '+samples.filter(n=>n>50).length+'회');};
  raf.current=requestAnimationFrame(tick);
 };
 const choose=(id:AnimalActionId)=>{setAction(id);setFrame(undefined);setReplay(n=>n+1)};
 return <Page title="동물 친구 동작 검수" right={<Link label="닫기" onPress={()=>{if(navigation.canGoBack())navigation.goBack();else if(Platform.OS==='web'&&typeof window!=='undefined')window.location.href='/'}}/>}>
  <Copy muted size={12}>제공된 manifest 기준 · 4캐릭터 × 60동작 · 공통 자산 30개</Copy>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{animalCharacters.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.name+' 미리보기'} accessibilityState={{selected:character===item.id}} onPress={()=>{setCharacter(item.id);setReplay(n=>n+1)}} style={{padding:12,borderRadius:14,backgroundColor:character===item.id?c.primarySoft:c.card,borderWidth:1,borderColor:c.border}}><Copy>{item.name}</Copy></Pressable>)}</View>
  <View style={{backgroundColor:night?'#272C48':'#FFF4DF',borderRadius:26,overflow:'hidden',alignItems:'center',padding:12}}>
   <AnimalSharedScene tone={night?'evening':'garden'}/>
   <BoriMascot key={character+action+replay} character={character} action={action} frame={frame} size={280}/>
  </View>
  <Copy size={22} weight="800">{character} · {action} {clip.name}</Copy>
  <Copy>{clip.duration_seconds}초 · {clip.frames}프레임 · {clip.loop?'반복':'1회 재생'} · 대표 {clip.poster_frame}프레임</Copy>
  <Copy muted size={12}>{reduced?'현재 모션 줄이기: 대표 프레임 정지':'현재 모션: 켜짐'} · {(clip.bytes/1024).toFixed(1)}KB · 외부 이미지 0개</Copy>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}><Link label="대표 프레임 정지" onPress={()=>setFrame(clip.poster_frame)}/><Link label="다시 재생" onPress={()=>{setFrame(undefined);setReplay(n=>n+1)}}/><Link label={night?'밝은 배경':'어두운 배경'} onPress={()=>setNight(v=>!v)}/></View>
  {frame!==undefined?<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Link label="이전 프레임" onPress={()=>setFrame(n=>Math.max(0,(n??0)-1))}/><Copy>{frame} / {clip.frames-1}</Copy><Link label="다음 프레임" onPress={()=>setFrame(n=>Math.min(clip.frames-1,(n??0)+1))}/></View>:null}
  <Action secondary label="이 친구를 앱에 적용" onPress={()=>{void setAnimalCharacter(character).catch(()=>setError('선택을 저장하지 못했어요.'))}}/>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{Object.entries(animalCharacters[0].actions).map(([id,item])=><Pressable key={id} accessibilityRole="button" accessibilityLabel={id+' '+item.name} accessibilityState={{selected:action===id}} onPress={()=>choose(id as AnimalActionId)} style={{padding:10,borderRadius:12,backgroundColor:action===id?c.primarySoft:c.card,borderWidth:1,borderColor:c.border}}><Text style={{fontSize:13,color:c.text}}>{id} {item.name}</Text></Pressable>)}</View>
  <CardView><Copy weight="800">기기 검수</Copy><Copy muted size={12}>재생 중 화면 전환·앱 복귀·캐릭터 변경을 확인해 주세요. 완료 축하는 자동 반복하거나 누른다고 다시 재생하지 않아요. 여기의 ‘다시 재생’은 검수용이에요.</Copy><Action secondary label={measuring?'측정 중…':'JS 프레임 간격 10초 측정'} disabled={measuring} onPress={measure}/>{measurement?<Copy size={12}>{measurement}</Copy>:null}<Copy muted size={12}>이 수치는 현재 실행 환경의 JS 스레드 간격이며, 네이티브 Lottie FPS·GPU·메모리 측정값이 아니에요. iOS 성능 확정에는 실기 Instruments 검수가 필요해요.</Copy></CardView>
  {error?<Copy>{error}</Copy>:null}
 </Page>;
}
