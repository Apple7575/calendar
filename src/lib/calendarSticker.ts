import {streakWidgetView,type StreakAnimal} from './streakWidget';

/** 기록 달력의 친구 스티커. 그날의 동물과 포즈는 연속 실천 위젯과 같은 날짜 계산이다. */
export function stickerFor(dayKey:string):{animal:StreakAnimal;pose:1|2}{
 const {animal,pose}=streakWidgetView(null,dayKey,12);
 return {animal,pose};
}
