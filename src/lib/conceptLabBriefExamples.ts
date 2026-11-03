import type {LabCard} from './conceptLabTypes';

export const briefExampleIds=['lab_holiday_read','lab_sou_cloze','lab_sou_apply','lab_sou_compare'];
type BriefCardExample={front?:string;label?:string;back?:string;note:string;cue?:{kind:'seen'|'heard';text:string}};
/** The terse wording rule was withdrawn. Keep full authored content and stored edits. */
export function briefCardExample(_card:LabCard):BriefCardExample|undefined{return undefined;}
