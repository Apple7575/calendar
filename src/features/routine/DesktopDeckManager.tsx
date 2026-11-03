import React, { useEffect,useState } from "react";
import { ScrollView, TextInput, View,useWindowDimensions } from "react-native";
import { useSession } from "../../hooks/useSession";
import { signInWithGoogle } from "../../lib/auth";
import { publishDeck,receiveDecks } from "../../lib/deckCloud";
import { PublishedDeck, validatePublishedDeck } from "../../lib/japaneseDeck";
import { useTheme } from "../../theme/ThemeContext";
import { Action, CardView, Copy, Link } from "./ui";
import firstDeck from "../../../assets/decks/n3-vocabulary.json";
import n2Deck from "../../../assets/decks/n2-vocabulary.json";

export function DesktopDeckManager() {
  const { session, loading } = useSession();
  const {width}=useWindowDimensions();
  const [remoteDecks,setRemoteDecks]=useState<PublishedDeck[]>([]);
  const { colors: c } = useTheme();
  const [text, setText] = useState(() => JSON.stringify(firstDeck, null, 2)), [deck, setDeck] = useState<PublishedDeck | null>(() => validatePublishedDeck(firstDeck));
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [dotOpen,setDotOpen]=useState(false);
  useEffect(()=>{let active=true;setRemoteDecks([]);if(session)void receiveDecks(session.user.id).then(rows=>{if(active)setRemoteDecks(rows)}).catch(()=>{if(active)setMessage('보관한 덱 목록을 불러오지 못했어요. 파일로 준비하거나 다시 로그인해 주세요.')});return()=>{active=false}},[session?.user.id]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return; setBusy(true); setMessage("");
    try { await action(); } catch (e) { setMessage(e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { setBusy(false); }
  };
  const preview = (raw: string) => {
    setText(raw); setDeck(null);
    try { const value = validatePublishedDeck(JSON.parse(raw)); setDeck(value); setMessage(`${value.notes.length}개 노트를 확인했어요.`); }
    catch (e) { setMessage(e instanceof Error ? e.message : "완성된 덱 JSON을 확인해 주세요."); }
  };
  return <ScrollView style={{ flex: 1, backgroundColor: c.surface }} contentContainerStyle={{ padding: 28, gap: 20, maxWidth: 1080, width: "100%", alignSelf: "center" }}>
    <Copy size={30} weight="800">컴퓨터 단어장 관리</Copy>
    <Copy muted>목록을 전달하면 읽기·힌트·예문을 채운 덱 파일을 준비해요. 여기서 확인해 아이폰과 같은 계정으로 보내세요.</Copy>
    <View style={{flexDirection:width>800?'row':'column',gap:24,alignItems:'flex-start'}}><View style={{flex:1,width:width>800?undefined:'100%',gap:18}}>
    <CardView><Copy weight="700">1. 아이폰과 같은 계정</Copy>
      {session ? <><Copy>{session.user.email ?? "로그인했어요"}</Copy><Link label="다른 구글 계정 선택" onPress={() => { if (!busy) void run(async () => { await signInWithGoogle({ selectAccount: true }); }); }} /></> : <Action label={loading ? "로그인 확인 중…" : "구글로 로그인"} disabled={busy || loading} onPress={() => void run(async () => { await signInWithGoogle({ selectAccount: true }); })} />}
      <Copy muted size={12}>계정이 같아야 폰에서 받을 수 있어요. 덱은 계정별 비공개 저장소로 전송돼요.</Copy>
    </CardView>
    {message ? <CardView><Copy>{message}</Copy></CardView> : null}
    <CardView><Link label={dotOpen?'PC 연결 도구 접기':'PC 연결 도구 · Dot'} onPress={()=>setDotOpen(!dotOpen)}/>{dotOpen?<><Copy weight="700">Dot 학습 요약 연결</Copy><Copy muted size={13}>같은 PC의 로컬 MCP가 정리한 내용을 내 비공개 저장소로 보내요. 연결 정보는 Windows 사용자 암호화로 보관해요.</Copy>
      <Action secondary label="이 PC에서 Dot 연결 정보 저장" disabled={!session||busy} onPress={()=>void run(async()=>{
        if(!session)throw new Error('구글 계정으로 먼저 로그인해 주세요.');
        const response=await fetch('http://127.0.0.1:8766/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({access_token:session.access_token,refresh_token:session.refresh_token}),signal:AbortSignal.timeout(15000)}).catch(()=>{throw new Error('PC 연결 도구를 먼저 실행해 주세요. DOT_INTEGRATION.md에 실행 방법이 있어요.');});
        if(!response.ok){const detail=await response.json().catch(()=>null);throw new Error(detail?.error??'연결 정보를 저장하지 못했어요.');}
        setMessage('이 PC에 연결 정보를 저장했어요. 아직 Dot 자동 전송은 연결 전이에요. 데스크톱에서는 routine-learning MCP를 별도로 등록하고, 웹·예약 작업에서는 원격 연결이 필요해요.');
      })}/>
    </>:null}</CardView>
    <CardView><Copy weight="700">공부할 단어장 선택</Copy>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>
        {[firstDeck,n2Deck].map(item=><Action key={item.id} secondary={deck?.id!==item.id} label={`JLPT ${item.id===n2Deck.id?'N2':'N3'} · ${item.notes.length}개`} disabled={busy} onPress={()=>preview(JSON.stringify(item,null,2))}/>)}
      </View>
      <Copy muted size={13}>N3와 N2는 각각 별도 단어장이에요. 기존 학습 진도와 오늘 시작한 목표는 유지돼요.</Copy>
      <Link label={showImport ? "파일 선택 접기" : "다른 덱 파일 선택 · 붙여넣기"} onPress={() => setShowImport(!showImport)} />
      {showImport ? <><Copy weight="700">컴퓨터에서 완성된 덱 선택</Copy>
      <input aria-label="완성된 덱 JSON 선택" type="file" accept=".json,application/json" onChange={event => {
        const file = event.target.files?.[0]; if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setMessage("5MB 이하 파일을 선택해 주세요."); return; }
        void file.text().then(preview).catch(() => setMessage("파일을 읽지 못했어요."));
      }} />
      <TextInput accessibilityLabel="덱 JSON 붙여넣기" multiline value={text} onChangeText={raw => { setText(raw); setDeck(null); }} placeholder="또는 완성된 덱 JSON을 붙여넣으세요" placeholderTextColor={c.textMuted}
        style={{ backgroundColor: c.inputBg, color: c.text, borderRadius: 16, padding: 16, minHeight: 150, maxHeight: 260, fontSize: 13 }} />
      <Action label="내용 확인" secondary disabled={busy || !text} onPress={() => preview(text)} /></> : null}
    </CardView>
    {remoteDecks.length?<CardView><Copy weight="800">내 계정의 단어장</Copy>{remoteDecks.map(d=><Link key={d.id} label={`${d.name} · ${d.notes.length}개`} onPress={()=>{setDeck(d);setText(JSON.stringify(d,null,2));setMessage('저장된 덱을 미리보고 있어요. 전송 전 대상 계정을 확인해 주세요.')}}/>)}</CardView>:null}
    </View><View style={{flex:1.2,width:width>800?undefined:'100%'}}>
    {deck ? <CardView><Copy muted size={12}>카드 미리보기 · 전송 전 확인</Copy><Copy size={22} weight="800">{deck.name}</Copy><Copy>{deck.notes.length}개 노트 · 버전 {deck.revision}</Copy><Copy muted size={13}>대상 계정: {session?.user.email??'로그인 필요'}</Copy>
      <Copy muted>앞면에는 한자만, 정답 뒤에는 읽기·뜻·힌트·예문·문법 메모가 나와요.</Copy>
      <Action label={busy ? "보내고 있어요…" : "내 아이폰으로 보내기"} disabled={!session || busy} onPress={() => void run(async () => {
        await publishDeck(deck); setMessage("보냈어요. 폰의 학습 화면에서 ‘컴퓨터 덱 받기’를 눌러 주세요. 이미 시작한 오늘 목표는 유지돼요.");
      })} />
      {deck.notes.slice(0, 5).map(note => <View key={note.ID} style={{ gap: 5, borderTopWidth: 1, borderColor: c.border, paddingTop: 12 }}>
        <Copy size={22} weight="700">{note.Word} · {note.Word_Reading}</Copy><Copy>{note.Word_Meaning}</Copy>
        <Copy>{note.Sentence}</Copy><Copy muted>{note.Sentence_Meaning}</Copy>
      </View>)}
    </CardView> : null}
    </View></View>
  </ScrollView>;
}
