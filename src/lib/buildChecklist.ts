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
 {build:53,items:[
  {id:'self-check',title:'앱이 스스로 확인한 칸',how:'이 화면 맨 위 자동 확인 5칸이 모두 "됨"인가요? 캐릭터가 움직이는데 애니메이션 칸만 안 됨이면 오탐이니 알려 주세요.'},
  {id:'close-53',title:'큰 타이머 닫기',how:'가로·세로 큰 타이머에서 "닫기"와 "공부 마치기"를 누르면 멈추지 않고 바로 메인으로 가나요? 루틴 타이머 닫기도요.'},
  {id:'rest-alarm',title:'휴식 끝 알람',how:'화면을 켜 둔 채 휴식이 끝나면 무음 스위치를 켜도 소리가 반복되고 진동하나요? 링 안 "알람 끄기"나 집중 시작으로 멈추나요?'},
  {id:'rest-alarm-closed',title:'앱 닫았을 때 휴식 끝 알림',how:'앱을 닫고 휴식이 끝나면 우리 알람 소리로 알림이 오나요(무음이면 진동만)? 종을 끄면 소리 없는 알림만 오나요?'},
  {id:'rest-screen',title:'휴식 화면은 연두색',how:'휴식 중에는 연두 반전 화면이고, 휴식이 끝난 화면과 구분되나요?'},
  {id:'noise',title:'공부 소리',how:'소리 버튼에서 빗소리·백색소음·카페를 고르면 집중 중에만 나오고, 화면을 잠가도 이어지나요? 휴식이 되면 멈추나요? 반복될 때 "툭" 소리가 없나요? 단어 발음보다 작나요?'},
  {id:'landscape-row',title:'가로 타이머 버튼',how:'가로에서 오른쪽 위 [소리][종][돌리기] 세 버튼이 노치에 가리지 않나요?'},
  {id:'next-study',title:'다음 공부 예약',how:'공부를 마치면 "다음 공부는 언제?"가 뜨고, 30분 뒤를 고르면 알림이 오나요? 알림을 누르면 같은 과목 2분부터 시작하나요? 먼저 시작하면 알림이 안 오나요?'},
  {id:'night',title:'밤 9시 밤 화면',how:'앱을 켜 둔 채 21시가 되면 따뜻한 밤 색으로 바뀌나요? 밤 축하는 소리 없이 진동만 나나요? 04:30 뒤에는 원래대로인가요?'},
  {id:'emergency-goal',title:'긴급 해제 화면의 내 목표',how:'긴급 해제를 열면 위에 목표·이유·이번 주 n일이 보이고, 키보드가 이유 칸을 가리지 않나요?'},
  {id:'goal-time',title:'목표에 공부 시간',how:'목표 상세에 이번 주·지난주 공부 시간 막대가 보이나요?'},
  {id:'start-map',title:'시작 시각 지도',how:'밤 돌아보기에서 내일 약속을 정할 때 요일별 평소 시작 시각 줄이 보이나요?'},
  {id:'lapse-words',title:'자꾸 잊는 단어',how:'모아둔 단어에 "자꾸 잊는" 탭이 있고(지금은 비어 있을 수 있어요), 카드 메뉴에서 메모를 쓰면 다음 복습 때 뒷면에 보이나요?'},
  {id:'content-refs',title:'콘텐츠 참고 링크',how:'아이디어에 인스타 링크를 붙이고 누르면 인스타 앱에서 열리나요? "복사한 링크 붙이기"를 처음 누를 때 붙여넣기 허용을 묻나요?'},
  {id:'tab-top',title:'탭 다시 누르면 맨 위로',how:'보던 탭을 한 번 더 누르면 맨 위로 올라가나요?'},
  {id:'polish-53',title:'작은 다듬기',how:'일기를 쓰다 밀어서 나가면 물어보나요? 오늘 탭·기록 일기를 당기면 새로고침되나요? 글자 버튼을 누르면 살짝 진동하나요? 단어 검색칸에 X가 있나요? 시간 사용 스위치 옆을 눌러도 켜지나요?'},
 ]},
 {build:52,items:[
  {id:'speaking-live',title:'말하기 음성 인식',how:'"말로 답하기"를 누르면 오류 없이 말한 내용이 글자로 나오고, 1분 넘게 말해도 계속 받아 적나요?'},
  {id:'diary-voice-52',title:'일기 음성 입력',how:'일기 마이크 버튼으로 말하면 글자로 바뀌나요?'},
  {id:'restart-zero',title:'새로 시작하면 00:00부터',how:'중간에 나가거나 마친 뒤 다시 시작하면 00:00, 2분 단계로 시작하나요? 받을 단계가 있었으면 시작 전에 적립이 보이나요?'},
  {id:'break-resume',title:'휴식 뒤에는 이어서',how:'휴식하고 돌아오면 같은 바퀴가 이어지나요?'},
  {id:'under-100',title:'100자 미만 사진 뒤',how:'마칠 때 100자가 안 되면 "다 했어요 · 사진 이어서"와 "공부 마치기"가 보이고, 한 장 더 찍어 제출되나요?'},
 ]},
 {build:51,items:[
  {id:'records-open',title:'기록이 다시 열림',how:'목표 탭이 열리고 연속 실천·지갑·단어 진도가 예전대로 보이나요?'},
  {id:'backup-resume',title:'자동 백업 다시 올라감',how:'설정 → 백업에서 마지막 백업 시각이 오늘 지금 시각으로 바뀌나요?'},
  {id:'speaking',title:'말하기 음성 인식',how:'"말하기는 새 아이폰 빌드에서…" 대신 마이크·음성 인식 권한을 묻고, 말한 내용이 글자로 나오나요?'},
  {id:'diary-voice',title:'일기 음성 입력',how:'일기에서 음성으로 입력하면 글자로 바뀌나요?'},
  {id:'multi-page',title:'필기 여러 장 찍기',how:'"한 장 더 찍기"로 2~3장을 찍고 제출하면 글자 수와 분이 모든 장의 합인가요? 5장째 뒤에는 더 찍기 버튼이 사라지나요?'},
  {id:'interest-ok',title:'이자·약속 정산 뒤에도 앱이 열림',how:'다음 날 04시 뒤 앱을 열어 이자가 들어온 뒤, 앱을 껐다 켜도 정상으로 열리나요?'},
 ]},
 {build:50,items:[
  {id:'break-reward',title:'2분 채우고 휴식 → 바로 보상',how:'2분 뒤 "휴식 · +N분"을 누르면 잔액이 바로 늘어 휴식 중에 앱을 쓸 수 있나요?'},
  {id:'rounds',title:'25분 바퀴 반복',how:'2·5·10·15·25분마다 1·1·2·2·4분이 들어오고, 25분 뒤에는 다시 2분부터 시작하나요?'},
  {id:'skip-break',title:'휴식을 건너뛰어도 보상 유지',how:'10분에 처음 휴식을 누르면 +4분이 한 번에 들어오나요?'},
  {id:'photo-rule',title:'사진은 25분과 마칠 때만',how:'25분 전에는 사진 버튼이 없고, "다 했어요"로 마칠 때는 사진을 찍을 수 있나요?'},
  {id:'morning-words',title:'아침 단어 10장(작게는 5장)',how:'단어를 다 끝내야 아침 루틴이 끝나고, 끝나자마자 제한 앱이 풀리나요? 학습 탭에서 끝내도 되나요?'},
  {id:'week-check',title:'주간 점검',how:'그 주에 처음 앱을 열 때 한 번 열리나요? 숫자 3개(최근 4주·첫 공부 시작·남긴 날)가 보이나요?'},
  {id:'week-note',title:'지난주 메모',how:'"지난주는 어떤 주였나요?" 칸이 키보드에 가려지지 않나요?'},
  {id:'stake',title:'예치금 걸기',how:'월요일에 금액을 고르면 지갑에서 빠지나요? 공부한 날은 집중 25분 이상인 날로 세나요?'},
  {id:'reflect-alarm',title:'밤 돌아보기 알림',how:'20:40에 알림이 오고, 누르면 밤 1분 돌아보기가 열리나요?'},
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

/** PM에게 붙여 넣을 글. 확인하지 않은 항목도 빠짐없이 적는다.
 * auto: 앱이 스스로 확인한 줄(selfCheckLines). 사람이 확인한 항목보다 앞에 둔다. */
export function buildCheckReport(list:BuildChecklist,state:BuildCheckState,now=new Date(),auto:string[]=[]){
 const date=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 const marks=list.items.map(item=>({item,mark:state[item.id]}));
 const count=(ok:boolean|undefined)=>marks.filter(m=>m.mark?.ok===ok).length;
 const line=({item,mark}:{item:BuildCheckItem;mark?:BuildCheckMark})=>`${mark?.ok===true?'✓':mark?.ok===false?'✗':'·'} ${item.title}${mark?.note.trim()?` — ${mark.note.trim()}`:''}`;
 return [`[빌드 ${list.build} 확인] ${date}`,...auto,`됨 ${count(true)} · 안 됨 ${count(false)} · 미확인 ${count(undefined)}`,...marks.map(line)].join('\n');
}
