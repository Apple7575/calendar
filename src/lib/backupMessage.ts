/**
 * 백업·복구 화면의 결과 문구 (S1-06 ②, 팀장 2026-11-07 "추천대로").
 * 취소하면 아무 말도 하지 않고, 성공하면 무엇이 됐는지 말한다. 공유 창을 닫았는지는 앱이 알 수 없어서 내보내기는 "만들었어요"까지만.
 */
export type BackupAction='backup'|'restore'|'export'|'import';
export type BackupOutcome={ok:true}|{ok:false;cancelled?:boolean;error?:string};

const clock=(at:number)=>{const d=new Date(at),h=d.getHours();return `${h<12?'오전':'오후'} ${h%12||12}:${String(d.getMinutes()).padStart(2,'0')}`;};
const DONE:Record<BackupAction,(at:number)=>string>={
 backup:at=>'백업했어요 · '+clock(at),
 restore:()=>'최근 백업으로 복구했어요',
 export:()=>'백업 파일을 만들었어요',
 import:()=>'백업 파일로 복구했어요',
};

export function backupMessage(action:BackupAction,outcome:BackupOutcome,at:number):string{
 if(outcome.ok)return DONE[action](at);
 if(outcome.cancelled)return '';
 return outcome.error||'처리하지 못했어요. 다시 시도해 주세요.';
}
