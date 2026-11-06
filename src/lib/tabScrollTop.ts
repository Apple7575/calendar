/**
 * 지금 보고 있는 탭을 한 번 더 누르면 그 탭 화면을 맨 위로 올린다 (팀장 요청 2026-11-06).
 * 탭 바는 선택된 탭을 다시 눌러도 tabPress를 보낸다. 누르는 순간 이미 보던 탭이면(isFocused) 올리고,
 * 다른 탭에서 넘어오는 누름은 스크롤을 그대로 둔다. 이미 맨 위면 아무것도 하지 않는다.
 * 동작 줄이기를 켰으면 애니메이션 없이 바로 옮긴다.
 */
type TabPressSource={isFocused:()=>boolean;addListener:(type:'tabPress',listener:()=>void)=>()=>void};
type Scroller={scrollTo:(options:{y:number;animated:boolean})=>void};

export function scrollTopOnTabPress(nav:TabPressSource,scroller:()=>Scroller|null|undefined,offset:()=>number,reduced:()=>boolean):()=>void{
 return nav.addListener('tabPress',()=>{
  if(!nav.isFocused()||offset()<=0)return;
  scroller()?.scrollTo({y:0,animated:!reduced()});
 });
}
