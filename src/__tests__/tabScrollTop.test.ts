import {scrollTopOnTabPress} from '../lib/tabScrollTop';

// 팀장 요청(2026-11-06): 지금 있는 탭을 한 번 더 누르면 그 탭 맨 위로.
function fakeTab(focused:boolean){
 const listeners:(()=>void)[]=[];
 return {focused,press:()=>listeners.forEach(l=>l()),nav:{isFocused:()=>fakeFocused.value,addListener:(_:'tabPress',cb:()=>void)=>{listeners.push(cb);return ()=>{listeners.splice(listeners.indexOf(cb),1)}}}};
}
const fakeFocused={value:true};
const scroller=()=>{const calls:{y:number;animated:boolean}[]=[];return {calls,ref:{scrollTo:(o:{y:number;animated:boolean})=>{calls.push(o)}}};};

describe('탭을 다시 누르면 맨 위로',()=>{
 test('보고 있는 탭을 다시 누르면 맨 위로 부드럽게 올린다',()=>{
  fakeFocused.value=true;const tab=fakeTab(true),s=scroller();
  scrollTopOnTabPress(tab.nav,()=>s.ref,()=>480,()=>false);
  tab.press();
  expect(s.calls).toEqual([{y:0,animated:true}]);
 });
 test('다른 탭에서 넘어올 때는 스크롤을 건드리지 않는다',()=>{
  fakeFocused.value=false;const tab=fakeTab(false),s=scroller();
  scrollTopOnTabPress(tab.nav,()=>s.ref,()=>480,()=>false);
  tab.press();
  expect(s.calls).toEqual([]);
 });
 test('이미 맨 위면 아무 일도 없다',()=>{
  fakeFocused.value=true;const tab=fakeTab(true),s=scroller();
  scrollTopOnTabPress(tab.nav,()=>s.ref,()=>0,()=>false);
  tab.press();
  expect(s.calls).toEqual([]);
 });
 test('동작 줄이기를 켜면 애니메이션 없이 바로 올린다',()=>{
  fakeFocused.value=true;const tab=fakeTab(true),s=scroller();
  scrollTopOnTabPress(tab.nav,()=>s.ref,()=>300,()=>true);
  tab.press();
  expect(s.calls).toEqual([{y:0,animated:false}]);
 });
 test('화면이 사라지면 더 듣지 않는다',()=>{
  fakeFocused.value=true;const tab=fakeTab(true),s=scroller();
  const off=scrollTopOnTabPress(tab.nav,()=>s.ref,()=>300,()=>false);off();
  tab.press();
  expect(s.calls).toEqual([]);
 });
});
