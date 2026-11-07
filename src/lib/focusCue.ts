import {canStartBreak} from './focusRamp';
import type {RoutineData} from './routineModel';

/**
 * 집중 타이머 단계가 끝난 신호의 소리(S1-07). 집중이 끝나 휴식 버튼이 실제로 열리면 휴식 보상 차임('break'), 아니면 짧은 소리('timer').
 * 휴식에서 돌아온 공부는 시계가 끝나도 휴식이 아직 안 열릴 수 있다(Felix 검토). 휴식 버튼과 같은 canStartBreak로 정한다.
 */
export function timerCueKind(phase:string|undefined,data:RoutineData,now:number):'break'|'timer'{
 return phase==='focus'&&canStartBreak(data,now)?'break':'timer';
}
