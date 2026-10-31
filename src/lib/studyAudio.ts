import { studyAudioAssets } from '../../assets/decks/studyAudioAssets';
import { JapaneseNote } from './japaneseDeck';

export type StudyAudioKind = 'word' | 'sentence';
/** Only play a recording when its reviewed text and pronunciation still match. */
export function resolveStudyAudio(note: JapaneseNote | undefined, kind: StudyAudioKind): number | null {
  if (!note) return null;
  const entry = studyAudioAssets[note.ID];
  if (!entry || note.Word !== entry.Word || note.Word_Reading !== entry.Word_Reading) return null;
  if (kind === 'sentence' && note.Sentence !== entry.Sentence) return null;
  const field = kind === 'word' ? note.Word_Audio : note.Sentence_Audio;
  // Existing imported notes may have empty audio fields. Match their reviewed ID/text.
  if (field && field !== `[sound:${entry[kind].name}]` && !entry[kind].aliases?.some(name => field === `[sound:${name}]`)) return null;
  return entry[kind].source;
}
