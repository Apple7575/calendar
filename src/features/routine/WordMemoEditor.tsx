import React, {useEffect, useRef, useState} from 'react';
import {TextInput, View} from 'react-native';
import {setWordMemo, WORD_MEMO_LIMIT, wordMemoText} from '../../lib/lapseWords';
import type {Word} from '../../lib/routineModel';
import {useTheme} from '../../theme/ThemeContext';
import {useRoutine} from './RoutineProvider';
import {Action, Copy, Link} from './ui';

// One-line personal memo for a card. Shown on the back of the card at the next review.
export function WordMemoEditor({word}: {word: Word}) {
  const {colors: c} = useTheme(), {update} = useRoutine();
  const saved = wordMemoText(word);
  const [editing, setEditing] = useState(false), [text, setText] = useState(saved);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const inFlight = useRef(false);
  useEffect(() => { if (!editing) setText(saved); }, [saved, editing]);
  useEffect(() => { setEditing(false); setMessage(''); }, [word.id]);
  const save = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setMessage('');
    try {
      await update(current => setWordMemo(current, word.id, text));
      setEditing(false);
      setMessage(text.trim() ? '메모를 저장했어요. 다음 복습 때 카드 뒷면에 보여요.' : '메모를 지웠어요.');
    } catch { setMessage('메모를 저장하지 못했어요. 다시 눌러 주세요.'); }
    finally { inFlight.current = false; setBusy(false); }
  };
  return <View testID="word-memo" style={{gap: 6}}>
    <Copy weight="700">내 메모</Copy>
    {editing ? <>
      <TextInput accessibilityLabel="내 메모" placeholder="헷갈리는 단어, 나만의 연상" placeholderTextColor={c.textMuted} multiline
        maxLength={WORD_MEMO_LIMIT} value={text} onChangeText={setText} autoFocus
        style={{minHeight: 72, borderRadius: 16, padding: 12, color: c.text, backgroundColor: c.inputBg, textAlignVertical: 'top', fontSize: 15}}/>
      <Copy muted size={12}>{[...text].length}/{WORD_MEMO_LIMIT}자 · 비우고 저장하면 지워요</Copy>
      <View style={{flexDirection: 'row', gap: 8, alignItems: 'center'}}>
        <View style={{flex: 1}}><Action compact label={busy ? '저장 중…' : '메모 저장'} disabled={busy} onPress={() => void save()}/></View>
        <Link label="취소" disabled={busy} onPress={() => { setText(saved); setEditing(false); }}/>
      </View>
    </> : <>
      {saved ? <Copy size={14}>{saved}</Copy> : <Copy muted size={13}>헷갈리는 단어나 나만의 연상을 적어 두면 다음 복습 때 같이 보여요.</Copy>}
      <Link label={saved ? '메모 고치기' : '메모 쓰기'} onPress={() => { setText(saved); setEditing(true); setMessage(''); }}/>
    </>}
    {message ? <Copy muted size={12}>{message}</Copy> : null}
  </View>;
}
