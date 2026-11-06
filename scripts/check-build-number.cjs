// 빌드 번호 검사. release를 main에 합치기 전과 EAS 빌드 전에 돌린다(빌드 52 때 번호가 49로 남은 사고 뒤).
// 사용: node scripts/check-build-number.cjs <번호> [git ref, 기본 HEAD]
//   예) node scripts/check-build-number.cjs 53 release/1.0.0-build53
// 확인하는 것: app.json의 expo.ios.buildNumber, 앱 안 확인표(buildChecklist.ts)의 맨 위 빌드 번호.
// 하나라도 다르면 exit 1. 명령을 ; 로 잇지 말고 && 로 이어서, 실패하면 다음 단계(머지·빌드)가 멈추게 한다.
const {execFileSync} = require('child_process');
const [want, ref = 'HEAD'] = process.argv.slice(2);
if (!/^\d+$/.test(want || '')) { console.error('번호를 주세요. 예: node scripts/check-build-number.cjs 53'); process.exit(2); }
const show = file => execFileSync('git', ['show', `${ref}:${file}`], {encoding: 'utf8'});
const problems = [];
let ios;
try { ios = JSON.parse(show('app.json')).expo?.ios?.buildNumber; } catch (e) { problems.push(`app.json을 읽지 못했어요: ${e.message.split('\n')[0]}`); }
if (ios === undefined && !problems.length) problems.push('app.json에 ios.buildNumber가 없어요(EAS 설정 커밋을 cherry-pick했나요?)');
else if (ios !== undefined && String(ios) !== want) problems.push(`app.json ios.buildNumber = "${ios}" (기대 "${want}")`);
let top;
try { top = /\{build:(\d+),items:\[/.exec(show('src/lib/buildChecklist.ts'))?.[1]; } catch (e) { problems.push(`buildChecklist.ts를 읽지 못했어요: ${e.message.split('\n')[0]}`); }
if (top !== undefined && top !== want) problems.push(`buildChecklist 맨 위 = ${top} (기대 ${want})`);
if (problems.length) { console.error(`[빌드 번호 검사 실패] ${ref}\n- ${problems.join('\n- ')}`); process.exit(1); }
console.log(`[빌드 번호 검사 통과] ${ref}: app.json ${ios} · 확인표 ${top}`);
