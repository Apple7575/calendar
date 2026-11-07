/**
 * 축하 단계 체계 (팀장 결정 2026-11-06 "축하화면은 다이애나 말대로 하자. 지루하지 않게 잘 해줘.").
 * 기준 문서: routine-portfolio/celebration-audit/design-plan.md, docs/design-system.md '축하'.
 *
 * - 큰: 전체 화면. 친구 큰 동작 + 효과 + 완료 소리 + 진동. 하루 3번, 같은 큰 축하는 하루 1번. 넘으면 중간으로.
 * - 중간: 2~3초 뜨는 카드. 친구 작은 동작 + 효과 + 짧은 소리 + 진동. 같은 종류는 10분에 1번. 넘으면 작은으로.
 * - 작은: 진동만(화면 쪽은 부르는 곳의 체크·끄덕). 제한 없음.
 *
 * 화면 표시 전용이다. 보상을 만들거나 바꾸지 않고, 기록은 표시용 키에만 둔다.
 */
export type CelebrationTier='big'|'medium'|'small';
export type CelebrationEffect='effect_confetti'|'effect_ribbon'|'effect_star'|'effect_petal'|'effect_bookmark';
export type CelebrationKind=
 |'dayComplete'      // 오늘 4개 항목 전부 (G15)
 |'streak'           // 연속 실천 3·7·14·30일 (G7)
 |'stakeWon'         // 예치금 성공 (G9)
 |'comeback'         // 벌점·긴급 해제 뒤 첫 완료 (G12)
 |'promiseKept'      // 내일 약속 지킴 (G10)
 |'interest'         // 안 쓴 시간 이자 (G11)
 |'wordStep'         // 단어 보상 구간 +5분 (G4)
 |'speakingStep'     // 말하기 500자 단계 (G5)
 |'weekCheck'        // 주간 점검 완료 (G8)
 |'priorityAll'      // 오늘 우선 과제 전부 작은 시작 (G14)
 |'growth'           // 성장 단계 (G18)
 |'routineStep'      // 루틴 한 단계 (G1)
 |'planSaved';       // 내일 약속·계획 저장 (G16)

/** 연속 실천 기념일. 팀장 결정: 3·7·14·30일. */
export const STREAK_MILESTONES=[3,7,14,30] as const;
export const CELEBRATION_LIMITS={bigPerDay:3,mediumGapMs:10*60_000} as const;

/**
 * 축하 효과음 (S1-07, 팀장 2026-11-07 선택). 파일은 assets/sounds/celebration/<이름>.mp3, 출처는 같은 폴더 README.
 * 같은 순간에는 늘 같은 소리 하나(기억에 남게). 휴식 보상(breakReward)은 축하 부품이 아니라 집중 타이머의 학습 피드백에서 낸다.
 */
export type CelebrationSound='planSaved'|'routineStep'|'wordStep'|'interest'|'promiseKept'|'breakReward'|'weekCheck'|'priorityAll'|'dayComplete'|'streak3'|'streak14'|'comeback'|'stakeWon';
/** 원래 단계에서 내는 소리. 말하기 500자는 말하는 중이라 소리 없음(정리안). 성장은 같은 '밝은 상승'인 우선 과제 소리. */
const OWN_SOUND:Record<CelebrationKind,(n?:number)=>CelebrationSound|null>={
 dayComplete:()=>'dayComplete',streak:n=>(n??0)>=14?'streak14':'streak3',stakeWon:()=>'stakeWon',comeback:()=>'comeback',
 promiseKept:()=>'promiseKept',interest:()=>'interest',wordStep:()=>'wordStep',speakingStep:()=>null,weekCheck:()=>'weekCheck',priorityAll:()=>'priorityAll',growth:()=>'priorityAll',
 routineStep:()=>'routineStep',planSaved:()=>'planSaved',
};
/** 하루 한도로 큰 축하가 중간으로 내려오면 1초 안팎의 중간 소리로. 돈이 들어온 예치금은 코인 소리. */
const LOWERED_SOUND:Partial<Record<CelebrationKind,CelebrationSound>>={stakeWon:'interest'};
/** 단계에 맞는 소리. 원래 단계보다 낮아졌으면 그 단계 소리로 낮추고, 작은 축하로 낮아졌거나 밤이면 소리 없음. */
export function celebrationSound(kind:CelebrationKind,tier:CelebrationTier,night:boolean,n?:number):CelebrationSound|null{
 const own=SPECS[kind].tier;
 if(night)return null;
 if(tier===own)return OWN_SOUND[kind](n);
 if(tier==='medium')return LOWERED_SOUND[kind]??'priorityAll';
 return null;
}

type Spec={tier:CelebrationTier;effect?:CelebrationEffect;actions:string[];lines:string[];detail?:string[]};
/** 문구의 {n}은 숫자(장·분·원·일)로 바뀐다. 같은 날 같은 문구는 되도록 다시 쓰지 않는다. */
const SPECS:Record<CelebrationKind,Spec>={
 dayComplete:{tier:'big',effect:'effect_confetti',actions:['A27','A25','A28','A24'],lines:['오늘 할 일을 모두 해냈어요!','오늘 하루, 끝까지 해냈어요!','네 가지 모두 완료!'],detail:['이제 마음 편히 쉬어도 돼요.','오늘의 나에게 박수를 보내요.','내일도 이렇게 함께 가요.']},
 streak:{tier:'big',effect:'effect_ribbon',actions:['A28','A27','A35','A25'],lines:['{n}일째 이어졌어요!','{n}일 연속, 대단해요!','{n}일 동안 하루도 안 빠졌어요!'],detail:['달력에 친구 스티커가 {n}개 모였어요.','쌓인 날들이 힘이 돼요.']},
 stakeWon:{tier:'big',effect:'effect_star',actions:['A24','A27','A23'],lines:['약속한 한 주를 지켜냈어요!','예치금을 돌려받았어요!'],detail:['건 돈에 10%를 더해 지갑에 넣었어요.']},
 comeback:{tier:'big',effect:'effect_petal',actions:['A24','A23','A35'],lines:['다시 돌아왔어요!','다시 시작한 게 제일 대단해요.','오늘 다시 해냈어요!'],detail:['어제는 어제예요. 오늘 한 걸 기록했어요.','다시 시작하는 힘이 실력이에요.']},
 promiseKept:{tier:'medium',effect:'effect_star',actions:['A22','A21','A33'],lines:['약속한 시각에 시작했어요!','어제 한 약속을 지켰어요.']},
 interest:{tier:'medium',effect:'effect_star',actions:['A22','A33','A21'],lines:['아껴 둔 시간이 이자가 됐어요.','안 쓴 시간에 이자가 붙었어요.']},
 wordStep:{tier:'medium',effect:'effect_bookmark',actions:['A22','A35','A33'],lines:['보상 구간 달성! +{n}분','{n}분 더 모았어요!','한 구간 더 넘었어요 · +{n}분']},
 speakingStep:{tier:'medium',effect:'effect_bookmark',actions:['A22','A33'],lines:['500자 넘었어요 · +{n}분 예정','말이 쌓이고 있어요 · +{n}분 예정']},
 weekCheck:{tier:'medium',effect:'effect_ribbon',actions:['A35','A23'],lines:['이번 주 준비 끝!','한 주를 정리했어요.']},
 priorityAll:{tier:'medium',effect:'effect_bookmark',actions:['A23','A22'],lines:['오늘 중요한 공부를 모두 시작했어요!','작은 시작을 전부 해냈어요.']},
 growth:{tier:'medium',effect:'effect_petal',actions:['A47','A48'],lines:['친구가 한 뼘 자랐어요!','함께 자라고 있어요.']},
 routineStep:{tier:'small',actions:['A21','A22','A33'],lines:['좋아요!','하나 끝!','잘했어요.']},
 planSaved:{tier:'small',actions:['A21'],lines:['준비 완료!']},
};

export type CelebrationRequest={kind:CelebrationKind;n?:number;minutes?:number;won?:number;title?:string;character?:string};
export type CelebrationLog={day:string;big:CelebrationKind[];last:Partial<Record<CelebrationKind,number>>;lines:string[];action?:string}|null;
export type PlannedCelebration={kind:CelebrationKind;tier:CelebrationTier;effect?:CelebrationEffect;action:string;title:string;detail?:string;sound:CelebrationSound|null;haptic:'success'|'light';minutes?:number;won?:number;character?:string};

const pick=<T,>(list:T[],seed:number,avoid?:(item:T)=>boolean)=>{const order=list.map((_,i)=>list[(seed+i)%list.length]);return order.find(item=>!avoid?.(item))??order[0];};
const fill=(text:string,n?:number)=>text.replace('{n}',n===undefined?'':n.toLocaleString('ko-KR'));
const daySeed=(day:string)=>[...day].reduce((s,ch)=>s*31+ch.charCodeAt(0)|0,7)>>>0;

/** 오늘 이 축하를 어떤 단계로, 어떤 동작·문구로 보여 줄지 정하고, 표시용 기록을 갱신한다. */
export function planCelebration(request:CelebrationRequest,log:CelebrationLog,day:string,now:number,options:{night?:boolean}={}):{plan:PlannedCelebration;log:NonNullable<CelebrationLog>}{
 const spec=SPECS[request.kind],today=log&&log.day===day?log:{day,big:[],last:{},lines:[]};
 let tier=spec.tier;
 // 밤(21:00~04:30)에는 축하를 진동만으로(팀장 결정 2026-11-07). 작은 축하로 낮추되, 원래 큰·중간 축하면 진동은 축하 진동 그대로 둔다.
 const nightQuiet=!!options.night&&tier!=='small';
 if(options.night)tier='small';
 if(tier==='big'&&(today.big.includes(request.kind)||today.big.length>=CELEBRATION_LIMITS.bigPerDay))tier='medium';
 const lastAt=today.last[request.kind];
 if(tier==='medium'&&lastAt!==undefined&&now-lastAt<CELEBRATION_LIMITS.mediumGapMs)tier='small';
 const count=Object.keys(today.last).length+today.lines.length,seed=daySeed(day)+count;
 const action=pick(spec.actions,seed,a=>a===today.action);
 const line=pick(spec.lines,seed,l=>today.lines.includes(fill(l,request.n??request.minutes)));
 const title=request.title??fill(line,request.n??request.minutes);
 const detail=spec.detail?fill(pick(spec.detail,seed),request.n):undefined;
 const plan:PlannedCelebration={kind:request.kind,tier,effect:tier==='small'?undefined:spec.effect,action,title,detail:tier==='big'?detail:undefined,
  sound:celebrationSound(request.kind,tier,!!options.night,request.n),haptic:tier==='small'&&!nightQuiet?'light':'success',minutes:request.minutes,won:request.won,character:request.character};
 const next={day,big:tier==='big'?[...today.big,request.kind]:today.big,last:{...today.last,[request.kind]:now},lines:[...today.lines,title].slice(-20),action};
 return {plan,log:next};
}

/** 오늘 처음 기념일 숫자에 닿았으면 그 숫자. 연속이 끊겼다 다시 닿아도 같은 날 1번이다. */
export function streakMilestone(current:number,todayDone:boolean):number|null{
 if(!todayDone)return null;
 return (STREAK_MILESTONES as readonly number[]).includes(current)?current:null;
}

/** 연속 기념일마다 함께 나오는 친구 수. 3일 1마리 → 7일 2마리 → 14일·30일 4마리. */
export const streakFriends=(n:number)=>n>=14?4:n>=7?2:1;

/** 축하 아래 줄의 분·원. 제목에 이미 같은 숫자가 있으면 빼서 두 번 쓰지 않는다. */
export function rewardParts(plan:Pick<PlannedCelebration,'title'|'minutes'|'won'>):string[]{
 const parts:string[]=[];
 if(plan.minutes&&!plan.title.includes(plan.minutes.toLocaleString('ko-KR')+'분'))parts.push('+'+plan.minutes.toLocaleString('ko-KR')+'분');
 if(plan.won&&!plan.title.includes(plan.won.toLocaleString('ko-KR')+'원'))parts.push('+'+plan.won.toLocaleString('ko-KR')+'원');
 return parts;
}
