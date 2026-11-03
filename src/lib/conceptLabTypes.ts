import type {StoredCard} from './routineModel';
import type {Grade} from 'ts-fsrs';

export type Ability='reading'|'meaning'|'spelling'|'context'|'usage'|'grammar'|'form'|'order'|'cohesion'|'comprehension'|'listening';
export type CardType='basic'|'reverse'|'cloze'|'transform'|'compare'|'apply'|'audio';
export type ErrorCause='memory'|'confusion'|'vocabulary'|'interpretation'|'custom';
export const errorCauses:Record<ErrorCause,string>={memory:'기억 실패',confusion:'개념 혼동',vocabulary:'어휘·문장 이해 부족',interpretation:'문제 해석 실수',custom:'직접 입력'};
export const abilityLabels:Record<Ability,string>={reading:'읽기',meaning:'의미 이해',spelling:'표기',context:'문맥',usage:'용법',grammar:'문법 이해',form:'접속·활용',order:'문장 배열',cohesion:'글의 연결',comprehension:'독해',listening:'듣기'};
export const typeLabels:Record<CardType,string>={basic:'기본 문답',reverse:'역방향',cloze:'빈칸',transform:'형태 변환',compare:'비교',apply:'상황 적용',audio:'음성'};
export type Evidence={pdfPage:number;printedPage:number|null;region:string;status:'model_visual_reviewed'|'needs_review';note?:string};
export type Extraction={id:string;unitId:string;source:Evidence;representation:'verbatim'|'structured_excerpt'|'model_summary';text:string;reading?:string;meaning?:string;kind:'vocabulary'|'grammar'|'passage'|'dialogue';uncertain?:string[]};
export type UnitSpec={id:string;name:string;domain:'vocabulary'|'grammar'|'reading'|'listening';pages:[number,number];abilities:Ability[];extract:string;types:CardType[];rubric:string;preserve:string;change:string;tags:string[];status:'sample_reviewed'|'pending'|'blocked_audio'};
export type Concept={id:string;label:string;domain:'vocabulary'|'grammar';unitId:string;evidenceIds:string[];tags:string[]};
type LabCardBase={id:string;conceptId?:string;ability:Ability;unitId:string;type:CardType;prompt:string;answer:string;accepted:string[];choices?:string[];rubric:string;explanation:string;hint:string;origin:'textbook'|'ai';novel:boolean;parentId?:string;bundleId?:string;audioNoteId?:string;audioKind?:'word'|'sentence';status:'ready'|'needs_review'|'disabled';evidenceIds:string[];difficulty:'N3';assessment:'exact'|'self'|'open';quality:{natural:boolean;unambiguous:boolean;level:boolean;grounded:boolean;reviewer:string};createdAt?:string};
export type ProblemBundle={id:string;unitId:string;kind:'reading'|'listening';text:string;transcript?:string;questionIds:string[];origin:'textbook'|'ai';audioNoteId?:string;audioAssetId?:string;audioKind?:'word'|'sentence';blockedReason?:string};
export type LabBook={id:string;title:string;sourceHash:string;totalPages:number;units:UnitSpec[];extractions:Extraction[];concepts:Concept[];bundles:ProblemBundle[];cards:LabCard[];variants:LabCard[]};
export type AIGrade={correct:boolean;feedback:string;confidence:number;model:string;rubricVersion:string};
export type DraftAnswer={cardId:string;text:string;elapsedMs:number;hint:boolean;exact:boolean|null;ai?:AIGrade;mode?:'self'|'text'|'speech'|'choice'};
export type LabSession={id:string;ids:string[];answers:DraftAnswer[];revealed:boolean;startedAt:string;finished?:boolean};
export type Attempt=DraftAnswer & {id:string;sessionId:string;at:string;firstSeen:boolean;origin:LabCard['origin'];novel:boolean;conceptId?:string;ability:Ability;mode:'self'|'text'|'speech'|'choice';correct:boolean;grade:Grade;selfGrade:Grade;reason?:ErrorCause;reasonText?:string;feedbackComplete:boolean};
type LabStateBase={version:1;bookId:string;createdAt:string;cards:Record<string,LabCard>;schedules:Record<string,StoredCard>;attempts:Attempt[];session?:LabSession;archivedSessions?:LabSession[];settings:{dailyNew:number;dailyVariants:number;variantCooldownDays:number;automaticVariants:boolean};corrections:{attemptId:string;at:string;correct:boolean;grade:Grade;note:string}[];reports:{cardId:string;at:string;note:string}[];revisions:{cardId:string;at:string;before:LabCard}[];generationJobs:{key:string;cardId?:string;at:string;status:'complete'|'failed';error?:string}[]};

export type LabState = LabStateBase & {studyVocabulary?:boolean;generatedDrafts?: import("./conceptGeneration").GeneratedDraft[];generationRuns?: import("./conceptGeneration").GenerationRun[]};

export type LabCard = LabCardBase & {audioAssetId?:string;cue?:{kind:"seen"|"heard";text:string}};
