# 돌봄이음 — 프로젝트 규칙

광주 통합돌봄 현장 인력용 AI 기록·연계 보조 모바일 웹이다.
기획·결정 문서는 `doc/`에 있다.
- `doc/단계개발.md`: 단계별 개발 계획 (진행 기준)
- `doc/구현1.md`: 기능·데이터 모델·화면
- `doc/Mac구축.md`: 확정된 결정
- `doc/plans/`: 단계별 실행 계획

## 현재 단계
4단계(마이크 스모크 테스트) 완료 → 5단계(DB·RLS·로그인) 진행 중. 운영 주소 https://dolbomieum.kr. 단계가 바뀔 때마다 이 줄을 갱신한다.

## 작업 방식
- superpowers 흐름만 쓴다: 단계 시작 전 계획(writing-plans) → 실행 → 실제 실행 결과로 검증한 뒤 완료 보고. bkit·SuperClaude는 쓰지 않는다.
- 기술·디자인·범위 결정은 스스로 판단해 끝까지 진행하고 보고 때 알린다. 사용자에게는 직접 해야 하는 일(계정 가입, API 키, 결제, 도메인·DNS, 실기기 테스트)만 묻는다.
- 커밋은 사용자가 요청할 때만 한다. 메시지는 한국어로 쓴다.
- 보고는 한국어로 짧게 한다.

## 앱 위치와 명령
- Next.js 앱은 `web/`에 있다. npm 명령은 모두 `web/`에서 실행한다.
- 완료 전 확인: `npm run typecheck && npm run lint && npm test` (배포 전에는 `npm run build`도)
- Next.js 16은 학습 데이터와 다르다. 코드를 쓰기 전에 `web/node_modules/next/dist/docs/`의 해당 가이드를 읽는다.

@web/AGENTS.md

## 공통 모듈 규칙 (중복 코드 방지)
- STT 호출은 `web/src/lib/stt`의 `transcribe()`만 쓴다.
- LLM 호출은 `web/src/lib/ai`만 쓴다. 모델명은 `web/src/lib/ai/models.ts` 한 곳에서 관리한다.
- AI 입출력·API 입력 타입은 `web/src/schemas/`의 Zod 스키마에서만 정의한다.
- DB 타입은 Supabase 생성 타입(`web/src/lib/supabase/types.ts`)만 쓴다.

## 개인정보 규칙 (위반 금지)
- 음성 파일은 스토리지·디스크·로그 어디에도 저장하지 않는다.
- DB에 성명·주소·연락처 컬럼을 만들지 않는다. 대상자는 식별번호로만 관리한다.
- LLM 호출 전에 반드시 `web/src/lib/privacy` 마스킹을 거친다.
- 로그에 구술 텍스트나 초안 내용을 남기지 않는다.
- API 키는 서버 환경변수에만 둔다. `NEXT_PUBLIC_` 접두사는 Supabase URL·anon key에만 쓴다.

## 비용
- 무료 우선이다. 유료는 Claude API 하나뿐이다.
- 테스트에서 실제 외부 API를 호출하지 않는다. 저장한 응답(fixture)을 쓴다.
