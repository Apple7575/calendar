import {emptyData,routineDay} from '../../lib/routineModel';
import {savePriorityDay,setPriorityPolicy} from '../../lib/priorityPlan';
export function priorityDemoData(){
 const key=routineDay();
 return setPriorityPolicy(savePriorityDay(emptyData(),key,[{id:'demo-electric',subject:'전기기사 실기',action:'32쪽 1번 조건에 밑줄 긋고 풀이 첫 줄 쓰기',preparation:'기출 32쪽 · 노트 · 펜 펼쳐두기',target:'문제 3개와 오답 정리',minimum:120},{id:'demo-exam',subject:'수능',action:'기출 2번 문제의 도형부터 그리기',preparation:'문제집과 연습장',target:'기출 2문제',minimum:120}]),true,key);
}
