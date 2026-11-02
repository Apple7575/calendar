import type {BoriState,MascotMood} from './boriAssets';
import type {AnimalActionId} from './animalAssets';
export const legacyAnimalActions:Record<BoriState,AnimalActionId>={blink:'A01',tap:'A06',success:'A25',failure:'A39',focus:'A36',encourage:'A35',sleepy:'A05',grow:'A47'};
export function animalActionForMood(mood?:MascotMood):AnimalActionId{return mood==='celebrate'?'A25':mood==='focus'?'A36':mood==='sleepy'?'A05':mood==='cheer'?'A02':'A01';}
export function routineAnimalAction(id:string,title=''):AnimalActionId{
 const ids:Record<string,AnimalActionId>={bed:'A11',wash:'A12',medicine:'A14',move:'A15',meditation:'A16',read:'A17',write:'A18',study:'A36',clean:'A19',tomorrow:'A20',review:'A51','wash-night':'A12','wind-down':'A45'};
 if(ids[id])return ids[id];
 return /이불|침대/.test(title)?'A11':/양치|칫솔/.test(title)?'A12':/명상|호흡/.test(title)?'A16':/독서|책 읽/.test(title)?'A17':/쓰기|필기/.test(title)?'A18':/청소|정리/.test(title)?'A19':/운동|스트레칭/.test(title)?'A15':'A23';
}
