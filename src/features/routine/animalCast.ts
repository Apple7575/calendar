import type {AnimalActionId,AnimalCharacterId} from './animalAssets';
export const animalRoles:Record<AnimalCharacterId,{label:string;pose:AnimalActionId}>={
 C01:{label:'아침 루틴',pose:'A04'},
 C02:{label:'단어 학습',pose:'A17'},
 C03:{label:'집중 · 운동',pose:'A36'},
 C04:{label:'저녁 · 일기',pose:'A45'},
};
/** Stable activity roles; neutral greetings/garden interactions keep the chosen companion. */
export function characterForAction(action:AnimalActionId,companion:AnimalCharacterId):AnimalCharacterId{
 if((['A04','A11','A12','A13','A14','A15','A16','A19','A25'] as AnimalActionId[]).includes(action))return 'C01';
 if((['A17','A26','A32','A33','A34','A35','A58'] as AnimalActionId[]).includes(action))return 'C02';
 if((['A18','A29','A31','A36','A37','A38'] as AnimalActionId[]).includes(action))return 'C03';
 if((['A05','A20','A30','A39','A40','A44','A45','A51','A52','A53'] as AnimalActionId[]).includes(action))return 'C04';
 return companion;
}
