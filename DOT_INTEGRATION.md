# Dot 학습 요약 연결

현재 상태: PC 연결 정보 암호화 저장과 실제 계정 인증, 비공개 저장소 쓰기·읽기, 동일 요청 재전송 중복 방지 검사를 통과했다. 검사 데이터는 삭제했다. ChatGPT 클라이언트 등록과 기존 매일 Dot 작업에서의 실제 호출은 아직 확인하지 않았다. 연결 정보 저장 버튼은 클라이언트에 MCP를 자동 등록하지 않는다.

실행 위치에 따라 연결 방법이 다르다. ChatGPT 데스크톱 앱 또는 로컬 Codex 호스트에서는 아래 STDIO 설정을 사용한다. ChatGPT 웹·모바일의 클라우드 작업은 이 PC의 설정 파일을 읽지 않으므로 원격 HTTP MCP 또는 Secure MCP Tunnel 연결이 별도로 필요하다. 현재 스크립트는 STDIO 서버이며 원격 HTTP 주소가 아니다. 예약 작업이 실제로 사용자 MCP의 쓰기 도구를 호출할 수 있는지는 등록 후 별도 확인해야 한다.

1. 이 PC에서 `node scripts/dot-learning-mcp.cjs --pair`를 실행한다. 127.0.0.1:8766에서 현재 PC의 관리 화면만 허용한다.
2. http://localhost:8082/?manage=1 에서 아이폰과 같은 Google 계정으로 로그인하고 **이 PC에서 Dot 연결 정보 저장**을 누른다. 세션은 `.expo/dot-learning-session.dpapi`에 Windows DPAPI로 암호화한다. 토큰을 채팅에 붙여 넣지 않는다.
3. ChatGPT 데스크톱의 MCP 서버 설정에서 STDIO 서버를 추가한다. 이름 `routine-learning`, 명령 `node`, 인수 `C:/Users/SSAFY/orca/projects/routine/calendar/scripts/dot-learning-mcp.cjs`, 작업 폴더 `C:/Users/SSAFY/orca/projects/routine/calendar`. 등록 후 클라이언트를 다시 시작한다. 이 파일은 등록 설정 자체를 바꾸지 않는다.
4. 기존 매일 Dot 정리 작업 끝에 아래 지시를 추가한다. 도구가 실제로 제공되는지 먼저 1건 전송하고 같은 eventId/revision 재전송을 검사한다.

> 오늘 정리한 공부 내용을 routine-learning의 save_learning_summary로 저장하세요. schema는 routine.learning-summary.v1. eventId는 날짜와 기존 작업 ID로 만든 고정 ID이며 재시도 때 동일하게 유지하세요. 내용을 수정하면 revision을 올리세요. date는 요약 대상의 한국 날짜입니다. title, summary, topics, questions, nextAction, sourceUrl을 넣으세요. 원문 링크를 확인할 수 없으면 빈 문자열을 쓰세요. 실제로 완료한 공부와 계획은 구분하고 공부 시간을 추정하지 마세요. 전송 성공 응답을 확인하고 실패를 성공으로 표현하지 마세요. 사용자 일기 본문을 덮어쓰지 마세요.

도구 입력 예:

```json
{"schema":"routine.learning-summary.v1","eventId":"daily-study-2026-10-30","revision":1,"date":"2026-10-30","title":"전기공사기사 접지 계산","summary":"접지 관련 문제 풀이와 헷갈린 조건을 정리했다.","topics":["접지"],"questions":["조건이 바뀌면 계산식은 어떻게 달라지는가?"],"nextAction":"기출 해설과 다시 대조하기","sourceUrl":""}
```

전송된 요약은 기존 `diary-photos` 비공개 버킷의 본인 UUID 아래 `learning-inbox`에 저장한다. 기기는 앱 실행·복귀 시 수신하여 해당 날짜의 일기와 캘린더에 별도 블록으로 표시한다. 같은 버전·같은 내용은 중복 생성하지 않는다. 다른 계정의 파일에는 접근하지 않는다.

로컬 STDIO 방식이므로 해당 PC와 ChatGPT 클라이언트가 실행되어 있어야 한다. PC가 꺼져 있을 때도 돌아가는 클라우드 예약 작업에는 별도 원격 MCP와 OAuth 연결이 필요하며, 이 구현이 그 조건까지 충족한 것으로 취급하지 않는다. 기존 Dot 예약의 실행 위치와 도구 제공 여부를 확인한 뒤 연결한다.

공식 참고: https://learn.chatgpt.com/docs/extend/mcp , https://developers.openai.com/api/docs/guides/custom-mcp-server
