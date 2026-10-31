import { PublishedDeck, validatePublishedDeck } from "./japaneseDeck";
import { supabase } from "./supabase";

const bucket = () => supabase.storage.from("diary-photos");
async function readPrivateDeck(path: string): Promise<PublishedDeck> {
  const { data, error } = await bucket().createSignedUrl(path, 60);
  if (error || !data?.signedUrl) throw new Error("덱을 읽을 권한을 확인해 주세요.");
  const response = await fetch(data.signedUrl);
  if (!response.ok) throw new Error("덱을 내려받지 못했어요. 다시 시도해 주세요.");
  const text = await response.text();
  if (text.length > 5 * 1024 * 1024) throw new Error("덱 파일이 너무 커요.");
  return validatePublishedDeck(JSON.parse(text));
}
export async function publishDeck(input: unknown): Promise<PublishedDeck> {
  const deck = validatePublishedDeck(input);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("아이폰과 같은 계정으로 먼저 로그인해 주세요.");
  const body = JSON.stringify(deck);
  if (new TextEncoder().encode(body).length > 5 * 1024 * 1024) throw new Error("덱은 5MB 이하로 나누어 주세요.");
  // Immutable revisions need INSERT and SELECT only; existing private owner policies apply.
  const path = `${data.user.id}/study-decks-v2/${deck.id}--${deck.revision}.json`;
  const { error: uploadError } = await bucket().upload(path, body, { contentType: "application/json", upsert: false });
  if (uploadError && (String(uploadError.statusCode) === "409" || /already exists/i.test(uploadError.message))) {
    const existing = await readPrivateDeck(path);
    if (JSON.stringify(existing) === body) return deck;
  }
  if (uploadError) throw new Error(`덱을 보내지 못했어요: ${uploadError.message}. 같은 버전을 다시 보낼 때는 revision을 바꿔 주세요.`);
  return deck;
}
export async function receiveDecks(userId: string): Promise<PublishedDeck[]> {
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) throw new Error("구글 계정을 먼저 연결해 주세요. 학습 설정에서 ‘구글 계정 연결’을 눌러 주세요.");
  if (auth.session.user.id !== userId) throw new Error("앱 계정이 바뀌었어요. 학습 화면을 다시 열고 덱을 받아 주세요.");
  const latest = new Map<string, string>();
  // New media delivery must not replace the legacy deck read by older binaries.
  for(const folder of ['study-decks','study-decks-v2']){
    const prefix=`${userId}/${folder}`,seen=new Set<string>();
    for(let offset=0;;offset+=100){
      const {data,error}=await bucket().list(prefix,{limit:100,offset,sortBy:{column:'created_at',order:'desc'}});
      if(error)throw new Error(`컴퓨터 덱 목록을 받지 못했어요: ${error.message}`);
      const page=data??[];
      for(const file of page)if(file.id&&/^[a-zA-Z0-9_-]+--[a-zA-Z0-9_-]+\.json$/.test(file.name)){
        const id=file.name.split('--')[0];if(!seen.has(id)){seen.add(id);latest.set(id,`${prefix}/${file.name}`);}
      }
      if(page.length<100)break;
    }
  }
  const decks: PublishedDeck[] = [];
  for (const [id, name] of latest) {
    const deck = await readPrivateDeck(name);
    if (deck.id !== id) throw new Error("덱 파일과 ID가 일치하지 않아요.");
    decks.push(deck);
  }
  return decks;
}
