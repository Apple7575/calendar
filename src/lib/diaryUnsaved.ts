/**
 * 일기 쓰기 화면에서 저장하지 않은 내용이 있는지 (S1-06 ①, 팀장 2026-11-07 "추천대로").
 * 닫기·밀어서 뒤로 가기 전에, 불러온 값과 지금 값이 다를 때만 "저장하지 않고 나갈까요?"를 묻는다.
 * 임시 저장은 하지 않는다(저장 규칙은 그대로). 앞뒤 빈칸만 다른 것은 바뀐 것으로 보지 않는다.
 */
export type DiaryFields={content:string;mood:string|null;highlight:string;energy:number|null;sleepHours:number|null;people:string[];gratitude:string};

export const diarySnapshot=(f:DiaryFields)=>JSON.stringify([f.content.trim(),f.mood??null,f.highlight.trim(),f.energy??null,f.sleepHours??null,f.people,f.gratitude.trim()]);

export function hasUnsavedDiary(loaded:string|null,current:string,extra:{pendingPhotos?:number;typing?:string[]}={}):boolean{
 if(loaded===null)return false;
 if((extra.pendingPhotos??0)>0)return true;
 if((extra.typing??[]).some(text=>text.trim()))return true;
 return loaded!==current;
}
