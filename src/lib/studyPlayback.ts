export const STUDY_RATES = [1, 1.25, 1.5, 1.75, 2] as const;
export const WORD_SENTENCE_GAP_MS=500;
export type StudyRate = typeof STUDY_RATES[number];
export const studyRateKey = (kind:'word'|'sentence') => `routine.studyAudio.${kind}Rate.v1`;
export function parseStudyRate(value:unknown):StudyRate {
  const number=Number(value);
  return STUDY_RATES.includes(number as StudyRate)?number as StudyRate:1;
}
