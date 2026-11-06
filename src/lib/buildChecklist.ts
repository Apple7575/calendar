import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 앱 안의 빌드 확인표. 항목은 코드 안에 두고, 결과는 이 기기에만 저장한다(서버·백업에 넣지 않는다).
 * 새 빌드를 올릴 때 PM이 맨 위에 그 빌드 번호의 항목을 더한다.
 */
export type BuildCheckItem={id:string;title:string;how?:string};
export type BuildChecklist={build:number;items:BuildCheckItem[]};
export type BuildCheckMark={ok?:boolean;note:string};
export type BuildCheckState=Record<string,BuildCheckMark>;

export const BUILD_CHECKS:BuildChecklist[]=[
 {build:50,items:[
  {id:'week-check',title:'월요일 주간 점검',how:'월요일 아침 루틴을 마치고 앱을 열면 주간 점검이 한 번 열리나요?'},
  {id:'stake',title:'예치금 걸기',how:'주간 점검에서 금액을 고르면 지갑에서 빠지나요?'},
  {id:'reflect-alarm',title:'밤 돌아보기 알림',how:'정한 시각에 알림이 오고, 누르면 밤 1분 돌아보기가 열리나요?'},
  {id:'promise',title:'내일 첫 공부 약속',how:'약속 시각 앞뒤 15분 안에 집중을 시작하면 보상이 들어오나요?'},
  {id:'interest',title:'안 쓴 시간 이자',how:'04시가 지나면 남긴 시간만큼 돈이 들어오나요?'},
  {id:'otter',title:'수달이 먼저 말 걸기',how:'18시와 21시 전에 오늘 탭에서 말을 거나요?'},
  {id:'stickers',title:'기록 달력 친구 스티커'},
  {id:'morning-words',title:'아침 단어 10장',how:'단어 10장을 끝내야 아침 루틴이 끝나나요?'},
  {id:'icon',title:'앱 아이콘 동물 얼굴'},
  {id:'audio',title:'단어·예문 음성과 0.2초 간격'},
  {id:'study-tab',title:'학습 탭 칸 전환 때 깜빡이지 않음'},
  {id:'theme',title:'다크·라이트 두 가지 화면 모드'},
 ]},
];

export const latestBuild=()=>Math.max(...BUILD_CHECKS.map(b=>b.build));
const storageKey=(build:number)=>`routine.buildCheck.v1.${build}`;

export async function loadBuildCheck(build:number):Promise<BuildCheckState>{
 try{const raw=await AsyncStorage.getItem(storageKey(build));const value=raw?JSON.parse(raw):{};return value&&typeof value==='object'?value:{};}
 catch{return {};}
}
export async function saveBuildCheck(build:number,state:BuildCheckState){await AsyncStorage.setItem(storageKey(build),JSON.stringify(state));}

/** PM에게 붙여 넣을 글. 확인하지 않은 항목도 빠짐없이 적는다. */
export function buildCheckReport(list:BuildChecklist,state:BuildCheckState,now=new Date()){
 const date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 const marks=list.items.map(item=>({item,mark:state[item.id]}));
 const count=(ok:boolean|undefined)=>marks.filter(m=>m.mark?.ok===ok).length;
 const line=({item,mark}:{item:BuildCheckItem;mark?:BuildCheckMark})=>`${mark?.ok===true?'✓':mark?.ok===false?'✗':'·'} ${item.title}${mark?.note.trim()?` — ${mark.note.trim()}`:''}`;
 return [`[빌드 ${list.build} 확인] ${date}`,`됨 ${count(true)} · 안 됨 ${count(false)} · 미확인 ${count(undefined)}`,...marks.map(line)].join('\n');
}
