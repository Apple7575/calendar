// 사용법: node content/decks/electrical-construction/validate.mjs
// 자동 검수만 한다. 통과해도 사람이 내용을 확인했다는 뜻은 아니다.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(here, p), "utf8");
const { sources } = JSON.parse(read("sources/sources.json"));
const cards = JSON.parse(read("sample-cards.json"));
const schema = JSON.parse(read("card.schema.json"));

// NFKC: 원문의 옴 기호(U+2126)와 그리스 문자 Ω(U+03A9)처럼 같은 글자의 다른 코드를 맞춘다.
const squash = (s) => s.normalize("NFKC").replace(/\s+/g, " ").trim();
const numbers = (s) => (s.replace(/(\d),(\d)/g, "$1$2").match(/\d+(?:\.\d+)?/g) ?? []);
// extract가 null인 출처는 저장소에 발췌본이 없다. 이런 출처의 문구는 대조할 수 없으므로 카드 근거로 쓰면 오류로 처리한다.
const byId = new Map(sources.map((s) => [s.id, { ...s, text: s.extract ? squash(read(`sources/${s.extract}`)) : null }]));

const errors = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);
const seenIds = new Set();
const seenFronts = new Set();

for (const c of cards) {
  const id = c.id ?? "(ID 없음)";
  for (const k of schema.required) if (c[k] === undefined || c[k] === "") fail(id, `필수 값 없음: ${k}`);
  for (const k of Object.keys(c)) if (!schema.properties[k]) fail(id, `정의되지 않은 값: ${k}`);
  for (const k of ["exam", "card_type", "origin", "review_status", "revision_risk"]) {
    if (!schema.properties[k].enum.includes(c[k])) fail(id, `${k} 값 오류: ${c[k]}`);
  }
  if (!new RegExp(schema.properties.id.pattern).test(id)) fail(id, "ID 형식 오류");
  if (seenIds.has(id)) fail(id, "ID 중복");
  seenIds.add(id);
  if (seenFronts.has(c.front)) fail(id, "앞면 중복");
  seenFronts.add(c.front);
  if (c.review_status === "human_verified") fail(id, "이번 단계에는 사람 확인 기록이 없다");
  if (c.origin === "model_knowledge" && c.review_status !== "needs_review") fail(id, "모델 지식 카드는 needs_review여야 한다");
  if (c.review_status === "needs_review" && !c.review_note) fail(id, "보류 사유 없음");

  const quoted = [];
  for (const s of c.sources ?? []) {
    const src = byId.get(s.source_id);
    if (!src) { fail(id, `없는 출처: ${s.source_id}`); continue; }
    if (src.text === null) { fail(id, `발췌본이 없는 출처는 근거로 쓸 수 없다: ${s.source_id}`); continue; }
    if (s.quote) {
      if (!src.text.includes(squash(s.quote))) fail(id, `원문에 없는 문구: ${s.quote}`);
      quoted.push(s.quote);
    }
    if (c.review_status === "source_checked" && src.authority !== "primary") fail(id, `1차 자료가 아닌데 source_checked: ${s.source_id}`);
  }
  if (c.review_status === "source_checked") {
    if (!quoted.length) fail(id, "근거 문구 없음");
    const allowed = new Set(numbers(quoted.join(" ")));
    for (const n of numbers(`${c.front} ${c.back}`)) if (!allowed.has(n)) fail(id, `근거 문구에 없는 숫자: ${n}`);
    const primaryDates = (c.sources ?? []).map((s) => byId.get(s.source_id)?.basis_date);
    if (!primaryDates.includes(c.basis_date)) fail(id, "기준일이 출처와 다름");
  }
}

const count = (key) => Object.fromEntries([...new Set(cards.map((c) => c[key]))].map((v) => [v, cards.filter((c) => c[key] === v).length]));
const report = {
  total: cards.length,
  by_review_status: count("review_status"),
  by_origin: count("origin"),
  by_card_type: count("card_type"),
  by_unit: count("unit"),
  errors,
  scope: "구조, ID와 앞면 중복, 근거 문구의 발췌본 일치, source_checked 카드의 숫자가 근거 문구에 있는지를 검사한다. 문장의 의미가 맞는지, 시험에 나오는지는 검사하지 못한다.",
};
writeFileSync(join(here, "validation-report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
process.exit(errors.length ? 1 : 0);
