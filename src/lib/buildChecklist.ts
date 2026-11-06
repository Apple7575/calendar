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
  {id:'break-reward',title:'2분 채우고 휴식 → 바로 보상',how:'2분 뒤 "휴식 · +N분"을 누르면 잔액이 바로 늘어 휴식 중에 앱을 쓸 수 있나요?'},
  {id:'rounds',title:'25분 바퀴 반복',how:'2·5·10·15·25분마다 1·1·2·2·4분이 들어오고, 25분 뒤에는 다시 2분부터 시작하나요?'},
  {id:'skip-break',title:'휴식을 건너뛰어도 보상 유지',how:'10분에 처음 휴식을 누르면 +4분이 한 번에 들어오나요?'},
  {id:'photo-rule',title:'사진은 25분과 마칠 때만',how:'25분 전에는 사진 버튼이 없고, "다 했어요"로 마칠 때는 사진을 찍을 수 있나요?'},
  {id:'morning-words',title:'아침 단어 10장(작게는 5장)',how:'단어를 다 끝내야 아침 루틴이 끝나고, 끝나자마자 제한 앱이 풀리나요? 학습 탭에서 끝내도 되나요?'},
  {id:'week-check',title:'주간 점검',how:'그 주에 처음 앱을 열 때 한 번 열리나요? 숫자 3개(최근 4주·첫 공부 시작·남긴 날)가 보이나요?'},
  {id:'week-note',title:'지난주 메모',how:'"지난주는 어떤 주였나요?" 칸이 키보드에 가려지지 않나요?'},
  {id:'stake',title:'예치금 걸기',how:'월요일에 금액을 고르면 지갑에서 빠지나요? 공부한 날은 집중 25분 이상인 날로 세나요?'},
  {id:'reflect-alarm',title:'밤 돌아보기 알림(20:40)',how:'20:40에 알림이 오고, 누르면 밤 1분 돌아보기가 열리나요?'},
  {id:'promise',title:'내일 첫 공부 약속',how:'약속 시각 앞뒤 15분 안에 집중을 시작하면 +10분이 바로 잔액에 들어오나요? 놓치면 하루 기록에 나오나요?'},
  {id:'interest',title:'안 쓴 시간 이자',how:'04시가 지나 앱을 열면 남긴 시간만큼 돈이 들어오고 정산 소식이 뜨나요?'},
  {id:'celebrate',title:'축하 화면',how:'연속 실천·오늘 전부·주간 점검·단어 구간에서 축하가 한 번씩만 뜨고, 다른 화면에 겹치지 않나요?'},
  {id:'silent',title:'무음 모드에서는 진동만',how:'무음 스위치를 켜면 축하음 없이 진동만 나고, 그 뒤 단어 발음은 들리나요? 진동이 두 번 울리지 않나요?'},
  {id:'otter',title:'친구가 먼저 말 걸기',how:'오늘 공부 전이면 18시와 20시 30분에 오늘 탭 친구가 말을 거나요?'},
  {id:'stickers',title:'기록 달력 친구 스티커'},
  {id:'icon',title:'앱 아이콘 동물 얼굴',how:'12시 전후로 아이콘이 바뀌나요(바꿀 때 iOS 알림창이 뜨는 것은 정상)?'},
  {id:'audio',title:'단어·예문 음성과 0.2초 간격',how:'끝에 "측" 튀는 소리가 없어졌나요?'},
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
