// 색의 의미. 화면은 "무슨 색"이 아니라 "무슨 역할"을 고른다. 값은 현재 테마에서 계산하므로 집중 테마에서도 그대로 동작한다.
import type {Theme} from './themes';

/** #RRGGBB 두 색을 섞는다. t=0이면 color, t=1이면 target. */
export function mixColor(color:string,target:string,t:number){
 const parse=(hex:string)=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 const a=parse(color),b=parse(target);
 return '#'+a.map((v,i)=>Math.round(v+(b[i]-v)*t).toString(16).padStart(2,'0')).join('').toUpperCase();
}

export function colorRoles(theme:Theme){
 const c=theme.colors,dark=theme.isDark,black='#000000';
 const onFill=dark?c.background:c.white;
 const danger=dark?c.danger:mixColor(c.danger,black,.14);
 return {
  /** 화면의 다음 행동. 한 영역에 하나만 쓴다. */
  primary:{fill:c.primary,edge:mixColor(c.primary,black,.24),on:onFill,ink:dark?c.primary:mixColor(c.primary,black,.1),soft:c.primarySoft},
  /** 함께 있어도 되는 다른 선택. 채우지 않는다. */
  secondary:{fill:c.card,edge:c.border,on:c.text},
  /** 삭제·초기화처럼 되돌리기 어려운 행동과 오류. */
  danger:{fill:danger,edge:mixColor(danger,black,.24),on:onFill,ink:danger,soft:mixColor(c.danger,c.card,.88)},
  /** 완료. */
  success:{ink:dark?c.success:mixColor(c.success,black,.1),soft:c.successSoft},
  /** 확인이 필요한 조건. */
  warning:dark?{ink:'#F5C26B',soft:'#3A2F1C'}:{ink:'#85570F',soft:'#FFF4DF'},
  /** 일반 안내. */
  info:{ink:c.textMuted,soft:c.inputBg},
 };
}
export type ColorRoles=ReturnType<typeof colorRoles>;
