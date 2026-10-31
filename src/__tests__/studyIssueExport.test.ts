import {addDeck,emptyData,flagWord,STUDY_ISSUES} from '../lib/routineModel';
import {studyIssueText} from '../lib/studyIssueExport';
test('report text contains stable repair targets, selected issue types and source text while skipping unreported cards',()=>{
 let data=addDeck(emptyData(),'N3',[{front:'完成',back:'완성'},{front:'駅',back:'역'}],'n3');
 data=flagWord(data,data.words[0].id,['wordAudio','example'],'단어가 세 번 들려요');
 const text=studyIssueText(data.words,data.decks);
 expect(text).toContain('신고 1건');expect(text).toContain(`카드 ID: ${data.words[0].id}`);expect(text).toContain('완성');expect(text).toContain(STUDY_ISSUES.wordAudio);expect(text).toContain('단어가 세 번 들려요');expect(text).not.toContain('단어: 駅');
 expect(studyIssueText([data.words[1]],data.decks)).toBe('');
});
