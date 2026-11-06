import {emptyData,type RoutineData} from '../lib/routineModel';
import {addContentIdea,addIdeaRef,contentIdeas,IDEA_REFS_MAX,openableRef,parseRefLink,pickContentIdea,removeIdeaRef,setIdeaWhy,submitContentLink} from '../lib/content';

const at=new Date(2026,10,5,9).getTime();
const withIdea=()=>addContentIdea(emptyData(),'i1','회로 쉽게 외우는 법',at);

describe('reference links',()=>{
 test.each([
  ['https://www.instagram.com/reel/AbC_1-z/?igsh=x','인스타 릴스','https://www.instagram.com/reel/AbC_1-z/'],
  ['instagram.com/reels/AbC','인스타 릴스','https://www.instagram.com/reel/AbC/'],
  ['https://m.instagram.com/p/AbC/','인스타 게시물','https://www.instagram.com/p/AbC/'],
  ['https://youtube.com/shorts/xYz?feature=share','유튜브 쇼츠','https://www.youtube.com/shorts/xYz'],
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10','유튜브 영상','https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
  ['https://www.youtube.com/watch?list=x&v=abc','유튜브 영상','https://www.youtube.com/watch?v=abc'],
  ['youtu.be/abc?si=1','유튜브 영상','https://youtu.be/abc'],
  ['https://www.tiktok.com/@some.one/video/7301234567890?lang=ko','틱톡','https://www.tiktok.com/@some.one/video/7301234567890'],
  ['https://vm.tiktok.com/ZMabc123/','틱톡','https://vm.tiktok.com/ZMabc123/'],
  ['https://www.threads.net/@user_1/post/C1abc','스레드','https://www.threads.com/@user_1/post/C1abc'],
  ['threads.com/@user/post/C1abc?xmt=1','스레드','https://www.threads.com/@user/post/C1abc'],
 ])('%s is a %s',(raw,label,url)=>{
  expect(parseRefLink(raw)).toEqual({label,url});
  expect(openableRef(url)).toBe(true);
 });
 test.each([
  [''],['그냥 글자'],[42],[null],
  ['javascript:alert(1)'],['ftp://www.instagram.com/reel/AbC'],['intent://instagram.com/reel/AbC'],
  ['https://instagram.com.evil.example/reel/AbC'],['https://evil.example/instagram.com/reel/AbC'],['https://notinstagram.com/reel/AbC'],
  ['https://evil.example/?u=youtube.com/shorts/abc'],['https://www.instagram.com/someone/'],['https://www.youtube.com/watch'],
  ['https://www.youtube.com/watch?vv=abc'],['https://www.youtube.com/@channel'],['https://www.tiktok.com/@a/video/abc'],
  ['https://www.threads.net/@user'],['https://www.facebook.com/reel/123'],['https://www.instagram.com/reel/AbC/extra'],
  ['https://www.instagram.com/reel/AbC <script>'],['https://www.instagram.com/reel/'+'a'.repeat(300)],
 ])('%s is refused',raw=>{
  expect(parseRefLink(raw)).toBeNull();
 });
 test('a stored address that is not https or not rebuilt is never opened',()=>{
  expect(openableRef('http://www.instagram.com/reel/AbC/')).toBe(false);
  expect(openableRef('https://instagram.com/reel/AbC')).toBe(false);
  expect(openableRef('javascript:alert(1)')).toBe(false);
 });
});

describe('refs and why on an idea',()=>{
 test('adds up to five, refuses repeats and bad links, removes one',()=>{
  let d=withIdea();
  for(let n=0;n<IDEA_REFS_MAX;n++)d=addIdeaRef(d,'i1','https://www.instagram.com/reel/r'+n);
  expect(contentIdeas(d)[0].refs).toHaveLength(5);
  expect(()=>addIdeaRef(d,'i1','https://youtu.be/six')).toThrow('5개까지');
  expect(()=>addIdeaRef(withIdea(),'i1','https://evil.example/x')).toThrow('인스타·유튜브·틱톡·스레드');
  const one=addIdeaRef(withIdea(),'i1','instagram.com/reel/r0?igsh=1');
  expect(()=>addIdeaRef(one,'i1','https://m.instagram.com/reels/r0/')).toThrow('이미 붙인');
  const gone=removeIdeaRef(one,'i1','https://www.instagram.com/reel/r0/');
  expect(contentIdeas(gone)[0]).not.toHaveProperty('refs');
 });
 test('why is one short line, and an empty one clears it',()=>{
  const d=setIdeaWhy(withIdea(),'i1','  첫 3초에\n 질문을   던져서 '+'가'.repeat(60));
  const why=contentIdeas(d)[0].why!;
  expect(why.startsWith('첫 3초에 질문을 던져서')).toBe(true);
  expect(why.length).toBe(40);
  expect(contentIdeas(setIdeaWhy(d,'i1','  '))[0]).not.toHaveProperty('why');
 });
 test('refs stay while making and after posting',()=>{
  let d=addIdeaRef(withIdea(),'i1','https://www.tiktok.com/@a/video/1');
  d=setIdeaWhy(pickContentIdea(d,'i1','2026-11-05'),'i1','편집이 빨라서');
  d=submitContentLink(d,'u1','https://www.instagram.com/reel/mine1/',at,'i1');
  expect(contentIdeas(d)[0]).toMatchObject({stage:'posted',refs:['https://www.tiktok.com/@a/video/1'],why:'편집이 빨라서'});
 });
});

describe('saved records',()=>{
 test('an old idea without refs or why loads as it was',()=>{
  const old={id:'o1',text:'예전 아이디어',at:'2026-11-01T00:00:00.000Z',stage:'making',pickedDay:'2026-11-01'};
  const d={...emptyData(),contentIdeas:[old]} as RoutineData;
  expect(contentIdeas(d)).toEqual([old]);
  expect(contentIdeas(addIdeaRef(d,'o1','youtu.be/abc'))[0].refs).toEqual(['https://youtu.be/abc']);
 });
 test('broken refs or why drop only that field, never the idea',()=>{
  const base={at:'2026-11-01T00:00:00.000Z',stage:'idea'};
  const d={...emptyData(),contentIdeas:[
   {...base,id:'a',text:'문자열 refs',refs:'https://youtu.be/abc',why:42},
   {...base,id:'b',text:'섞인 refs',refs:[null,7,'javascript:alert(1)','https://evil.example/reel/x','youtu.be/ok','https://youtu.be/ok',...Array.from({length:8},(_,n)=>'youtu.be/v'+n)],why:{x:1}},
   {...base,id:'c',text:'빈 refs',refs:[],why:'   '},
   null,{id:'d'},
  ]} as unknown as RoutineData;
  const ideas=contentIdeas(d);
  expect(ideas.map(i=>i.id)).toEqual(['a','b','c']);
  expect(ideas[0]).not.toHaveProperty('refs');expect(ideas[0]).not.toHaveProperty('why');
  expect(ideas[1].refs).toEqual(['https://youtu.be/ok','https://youtu.be/v0','https://youtu.be/v1','https://youtu.be/v2','https://youtu.be/v3']);
  expect(ideas[2]).not.toHaveProperty('refs');expect(ideas[2]).not.toHaveProperty('why');
  expect(()=>addIdeaRef(d,'a','youtu.be/new')).not.toThrow();
 });
});
