import {RoutineData,STUDY_ISSUES,Word} from './routineModel';

/** Text includes stable identities and source audio names, without any account credentials. */
export function studyIssueText(words:Word[],decks:RoutineData['decks']):string{
 const reported=words.filter(word=>word.issue);
 if(!reported.length)return '';
 return ['[루틴 앱 단어 수정 요청 v1]',`신고 ${reported.length}건`,'문제가 있는 항목만 수정·재생성해 주세요. 카드 ID와 기존 학습 진도는 유지해 주세요.',...reported.map((word,index)=>{
  const f=word.fields;
  return [`\n--- ${index+1} ---`,`카드 ID: ${word.id}`,`노트 ID: ${f?.ID??''}`,`덱: ${decks.find(d=>d.id===word.deckId)?.name??word.deckId}`,`카드 종류: ${word.kind==='sentence'?'예문':'단어'}`,`신고 항목: ${word.issue!.categories.map(v=>STUDY_ISSUES[v]).join(', ')}`,`신고 메모: ${word.issue!.note||'(없음)'}`,`단어: ${f?.Word??word.front}`,`읽기: ${f?.Word_Reading??''}`,`뜻: ${f?.Word_Meaning??word.back}`,`예문: ${f?.Sentence??''}`,`예문 읽기: ${f?.Sentence_Reading??''}`,`예문 뜻: ${f?.Sentence_Meaning??''}`,`단어 음성: ${f?.Word_Audio??''}`,`예문 음성: ${f?.Sentence_Audio??''}`,`표시 시각: ${word.issue!.updatedAt}`].join('\n');
 })].join('\n');
}
