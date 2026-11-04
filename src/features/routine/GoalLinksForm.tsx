import React,{useState} from 'react';
import {View} from 'react-native';
import {Goal,goalBrokenLinks,goalLinkOptions,setGoalLinks} from '../../lib/routineGoals';
import {space} from '../../theme/tokens';
import {useRoutine} from './RoutineProvider';
import {Action,Choice,Copy,Link,Notice} from './ui';

const toggle=(list:string[],item:string)=>list.includes(item)?list.filter(value=>value!==item):[...list,item];

export function GoalLinksForm({goal,onDone}:{goal:Goal;onDone:()=>void}){
 const {data,update}=useRoutine(),options=goalLinkOptions(data,goal.id),broken=goalBrokenLinks(data,goal);
 const [subjects,setSubjects]=useState(goal.links.subjects),[deckIds,setDeckIds]=useState(goal.links.deckIds);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const save=async()=>{
  setBusy(true);setError('');
  try{await update(current=>setGoalLinks(current,goal.id,{subjects,deckIds}));onDone();}
  catch(e){setError(e instanceof Error?e.message:'연결을 저장하지 못했어요. 다시 시도해 주세요.');setBusy(false);}
 };
 return <View style={{gap:space.md}}>
  <Copy variant="heading">공부 연결하기</Copy>
  <Copy muted>이 목표를 위해 하는 공부를 골라 주세요. 고른 공부를 끝낸 날만 이 목표의 공부한 날로 세요.</Copy>
  <View style={{gap:space.xs}}>
   <Copy variant="caption" weight="700" muted>과목</Copy>
   {options.subjects.map(({subject,takenBy})=><Choice key={subject} label={subject} description={takenBy?`'${takenBy}' 목표에 연결됨`:broken.subjects.includes(subject)?'기록에서 찾지 못한 과목':undefined} disabled={!!takenBy} selected={subjects.includes(subject)} onPress={()=>setSubjects(list=>toggle(list,subject))}/>)}
  </View>
  <View style={{gap:space.xs}}>
   <Copy variant="caption" weight="700" muted>단어장</Copy>
   {!options.decks.length&&!broken.deckIds.length?<Copy variant="caption" muted>아직 단어장이 없어요.</Copy>:null}
   {options.decks.map(({id,name,takenBy})=><Choice key={id} label={name} description={takenBy?`'${takenBy}' 목표에 연결됨`:undefined} disabled={!!takenBy} selected={deckIds.includes(id)} onPress={()=>setDeckIds(list=>toggle(list,id))}/>)}
   {broken.deckIds.map(id=><Choice key={id} label="없어진 단어장" accessibilityLabel={`없어진 단어장 ${id}`} description="눌러서 연결을 뺄 수 있어요" selected={deckIds.includes(id)} onPress={()=>setDeckIds(list=>toggle(list,id))}/>)}
  </View>
  {error?<Notice tone="error">{error}</Notice>:null}
  <Action label="연결 저장" loading={busy} onPress={()=>void save()}/>
  <Link muted label="취소" onPress={onDone}/>
 </View>;
}
