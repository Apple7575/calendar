export const JAPANESE_FIELDS = ["ID", "Word", "Word_Reading", "Word_Meaning", "Hint", "Sentence", "Sentence_Reading", "Sentence_Meaning", "Grammar_Note", "Card_Level", "Make_Sentence_Card", "Word_Audio", "Sentence_Audio", "Tags"] as const;
export type JapaneseNote = {
  ID: string; Word: string; Word_Reading: string; Word_Meaning: string; Hint: string;
  Sentence: string; Sentence_Reading: string; Sentence_Meaning: string; Grammar_Note: string;
  Card_Level: string; Make_Sentence_Card: boolean; Word_Audio: string; Sentence_Audio: string; Tags: string[];
};
export type DeckRow = { front: string; back: string; fields?: JapaneseNote };
export type PublishedDeck = { schema: "routine.japanese-deck.v1"; id: string; name: string; revision: string; notes: JapaneseNote[] };
const str = (value: unknown) => value == null ? "" : String(value).trim();
export function normalizeNote(raw: Record<string, unknown>, index: number): JapaneseNote {
  const tags = raw.Tags ?? raw.tags ?? raw["태그"] ?? [];
  return {
    ID: str(raw.ID ?? raw.id) || `note_${String(index + 1).padStart(4, "0")}`,
    Word: str(raw.Word ?? raw.word ?? raw.front), Word_Reading: str(raw.Word_Reading ?? raw.reading),
    Word_Meaning: str(raw.Word_Meaning ?? raw.meaning ?? raw.back), Hint: str(raw.Hint),
    Sentence: str(raw.Sentence), Sentence_Reading: str(raw.Sentence_Reading), Sentence_Meaning: str(raw.Sentence_Meaning),
    Grammar_Note: str(raw.Grammar_Note), Card_Level: str(raw.Card_Level) || "core",
    Make_Sentence_Card: raw.Make_Sentence_Card === true || /^(1|true|yes)$/i.test(str(raw.Make_Sentence_Card)),
    Word_Audio: str(raw.Word_Audio), Sentence_Audio: str(raw.Sentence_Audio),
    Tags: Array.isArray(tags) ? tags.map(str).filter(Boolean) : str(tags).split(/\s+/).filter(Boolean),
  };
}
export function validatePublishedDeck(value: unknown): PublishedDeck {
  if (!value || typeof value !== "object") throw new Error("완성된 덱 JSON이 필요해요.");
  const d = value as Record<string, unknown>;
  if (d.schema !== "routine.japanese-deck.v1" || !/^[a-zA-Z0-9_-]{1,80}$/.test(str(d.id)) || str(d.id).includes("--") || !str(d.name) || !/^[a-zA-Z0-9_-]{1,60}$/.test(str(d.revision))) throw new Error("덱의 형식·ID·이름·버전을 확인해 주세요.");
  if (!Array.isArray(d.notes) || !d.notes.length || d.notes.length > 10000) throw new Error("덱에는 1~10,000개 노트가 필요해요.");
  const ids = new Set<string>();
  const notes = d.notes.map((raw, i) => {
    if (!raw || typeof raw !== "object") throw new Error(`${i + 1}번째 노트 형식을 확인해 주세요.`);
    const note = normalizeNote(raw as Record<string, unknown>, i);
    if (!note.Word || !note.Word_Meaning || ids.has(note.ID)) throw new Error(`${i + 1}번째 노트의 단어·뜻·중복 ID를 확인해 주세요.`);
    if (note.Make_Sentence_Card && (!note.Sentence || !note.Sentence_Meaning)) throw new Error(`${note.ID}: 문장 카드에는 예문과 해석이 필요해요.`);
    ids.add(note.ID); return note;
  });
  return { schema: "routine.japanese-deck.v1", id: str(d.id), name: str(d.name), revision: str(d.revision), notes };
}
function rowFromObject(raw: Record<string, unknown>, index: number): DeckRow {
  if ("Word" in raw || "Word_Reading" in raw || "ID" in raw) {
    const fields = normalizeNote(raw, index); return { front: fields.Word, back: fields.Word_Meaning, fields };
  }
  return { front: str(raw.front ?? raw.word), back: str(raw.back ?? raw.meaning) };
}
export function parseNoteText(text: string): DeckRow[] {
  const content = text.replace(/^\uFEFF/, "");
  if (/^[\s]*[\[{]/.test(content)) {
    const parsed: unknown = JSON.parse(content);
    const items = Array.isArray(parsed) ? parsed : validatePublishedDeck(parsed).notes;
    return items.map((raw, i) => {
      if (!raw || typeof raw !== "object") throw new Error("단어 형식을 확인해 주세요.");
      return rowFromObject(raw as Record<string, unknown>, i);
    });
  }
  const lines = content.split(/\r?\n/);
  const explicitHeader = lines.find(line => /^#columns:/i.test(line))?.replace(/^#columns:/i, "");
  const body = lines.filter(line => !/^#(?:separator|html|columns|tags column|notetype column|deck column|guid column):/i.test(line)).join("\n");
  const separator = /^#separator:tab/im.test(content) || (explicitHeader ?? body.split(/\r?\n/)[0]).includes("\t") ? "\t" : ",";
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '"') { if (quoted && body[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (ch === separator || ch === "\n")) {
      row.push(cell.replace(/\r$/, "")); cell = ""; if (ch === "\n") { rows.push(row); row = []; }
    } else cell += ch;
  }
  if (quoted) throw new Error("닫히지 않은 따옴표가 있어요.");
  row.push(cell.replace(/\r$/, "")); rows.push(row);
  let header = explicitHeader?.split(separator).map(s => s.trim());
  if (!header && /^(ID|Word|Word_Reading)$/i.test(rows[0]?.[0]?.trim()) && rows[0].some(c => /^Word_Meaning$/i.test(c.trim()))) header = rows.shift()?.map(s => s.trim());
  if (header) return rows.filter(r => r.some(c => c.trim())).map((r, i) => rowFromObject(Object.fromEntries(header!.map((key, n) => [key, r[n] ?? ""])), i));
  if (/^(front|word|앞면|단어)$/i.test(rows[0]?.[0]?.trim())) rows.shift();
  return rows.map(r => ({ front: r[0] ?? "", back: r[1] ?? "" }));
}
