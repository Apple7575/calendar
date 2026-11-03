"""Package only final N2 recordings; keep the supplied PDF and all N3 files untouched."""
import hashlib,json,pathlib,zipfile

ROOT=pathlib.Path(__file__).resolve().parents[2]
WORK=ROOT/'output/vocabulary/n2-20261102'
APP=ROOT/'calendar'
audio=WORK/'audio'
manifest=json.loads((audio/'manifest.json').read_text(encoding='utf8'))
audit=json.loads((audio/'file-audit.json').read_text(encoding='utf8'))
duration=json.loads((audio/'word-duration-after.json').read_text(encoding='utf8'))
deck=json.loads((APP/'assets/decks/n2-vocabulary.json').read_text(encoding='utf8'))
if not manifest.get('reviewed') or audit['errors'] or audit['checked']!=3548 or duration['candidates'] or len(deck['notes'])!=1774:
 raise RuntimeError('Final N2 review is incomplete')
delivery=WORK/'delivery';delivery.mkdir(exist_ok=True)
ledger=[json.loads(line) for line in (WORK/'cost-ledger.jsonl').read_text(encoding='utf8').splitlines() if line.strip()]
finished={row['id']:row for row in ledger if row['type']=='finished'}
estimate=sum(finished.get(row['id'],{}).get('estimatedUSD',row['reservedUSD']) for row in ledger if row['type']=='started')
cost={'estimatedUSD':estimate,'approvedLimitUSD':15,'actualBillVerified':False,'unfinishedRequests':sum(row['id'] not in finished for row in ledger if row['type']=='started')}
(delivery/'cost-summary.json').write_text(json.dumps(cost,indent=2),encoding='utf8')
readme=f'''JLPT N2 단어장

덱 ID: {deck['id']}
버전: {deck['revision']}
단어 노트: 1,774개 / 단어·예문 음성: 3,548개
음성: cedar, 원본 speed 1. 앱의 단어→예문 간격 0.5초는 음성에 포함하지 않음.

원본: JLPT_N2빈출단어문형.pdf
SHA-256: c96f784845c97f5e4ae5bc2b9a2154c20d8bea9eb7c01a5aed38e908b2cd1366
범위: PDF 2~43쪽의 단어. 문형·표지·메모 제외.
원문 표현 1,923개 중 같은/포함 뜻의 중복 149개를 정리한 1,774노트.
출처 페이지는 노트 태그 및 content-audit.json에 보존.

n2-vocabulary.json은 앱의 컴퓨터 단어장 관리에서 선택할 완성 덱입니다.
audio/에는 최종 선택한 MP3만 들어 있으며 manifest.json의 파일·해시와 일치합니다.
이 ZIP은 앱 설치 파일이 아닙니다. TestFlight/EAS 배포와 계정 비공개 업로드는 별도 단계입니다.
현재 설치된 37번 앱에 N2 음성 연결이 자동 추가된 것으로 해석하지 않습니다.

N3와 별도 덱·노트 ID·음성 경로를 사용했습니다. 기존 N3 자산 4,873개는 해시를 보존했습니다.
앱의 기존 덱 병합 경로를 사용하며 기존 N3 진도와 오늘 시작한 학습 목표를 초기화하지 않습니다.

검수: 전 단어의 자동 전사/읽기 비교, 길이 이상치 보정, 모든 음성의 브라우저 디코딩·해시·비무음 검사.
사람의 전수 청취와 예문 전체 ASR 검수는 수행하지 않았습니다. 자동 검수가 무오류를 보장하지 않습니다.
유료 API 비용 추정: ${estimate:.2f} / 승인 상한 $15. 실제 청구서와 대조한 금액은 아닙니다.
'''
(delivery/'README.txt').write_text(readme,encoding='utf8')
archive=delivery/'jlpt-n2-vocabulary.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=5) as package:
 package.write(delivery/'n2-vocabulary.json','n2-vocabulary.json')
 package.write(delivery/'README.txt','README.txt')
 package.write(delivery/'cost-summary.json','cost-summary.json')
 package.write(audio/'manifest.json','manifest.json')
 package.write(audio/'file-audit.json','file-audit.json')
 package.write(WORK/'content-audit.json','content-audit.json')
 for job in manifest['jobs']:
  source=audio/job['file']
  if hashlib.sha256(source.read_bytes()).hexdigest()!=job['audioHash']:raise RuntimeError('Audio hash changed')
  package.write(source,job['file'])
with zipfile.ZipFile(archive) as package:
 if package.testzip() is not None:raise RuntimeError('ZIP CRC failed')
 if len([name for name in package.namelist() if name.endswith('.mp3')])!=3548:raise RuntimeError('ZIP audio count failed')
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'notes':1774,'audio':3548,'estimatedUSD':estimate}))
