# 돌봄이음 Mac 구축 매뉴얼 (Claude 인수인계용)

> 작성일: 2026-10-10 (Windows 세션에서 작성)
> 목적: Mac에서 새로 시작한 Claude Code 세션이 이 문서만 읽고 바로 1주차 구축을 이어받는다.
> **Mac의 Claude에게:** 이 문서 → `doc/구현1.md` 순서로 먼저 읽고 시작할 것. 아래 "0. 확정된 결정"은 사용자와 이미 합의된 사항이므로 다시 묻지 말 것.

---

## 0. 확정된 결정 (다시 묻지 않기)

| 항목 | 결정 |
|---|---|
| 서비스명 | **돌봄이음** (시안의 "이음기록" 표기는 쓰지 않음) |
| 도메인 | **dolbomieum.kr** — 가비아에서 등록 완료(2026-10-10). Cloudflare 네임서버로 옮긴 뒤 Vercel 연결 예정 |
| 호스팅 | Vercel(Hobby로 시작), DNS는 Cloudflare **DNS only(회색 구름)** |
| 스택 | Next.js(App Router) + TypeScript + Tailwind + shadcn/ui, Supabase(Postgres·Auth·RLS, 서울 리전) |
| STT | 메인 Groq `whisper-large-v3-turbo`(무료 티어), 보조 브라우저 Web Speech API, 최종 대체 텍스트 입력 |
| LLM | Claude API `claude-sonnet-5-5`, JSON 스키마 구조화 출력 |
| 개발 OS | 지금부터 **Mac**에서 개발·유지보수 (아이폰 사파리 원격 디버깅 가능) |
| 작업 흐름 도구 | **superpowers 플러그인만 사용**. bkit은 이 프로젝트에서 꺼 둠(`.claude/settings.json`), SuperClaude는 사용 안 함 |
| git | 저장소 `https://github.com/xenonluv/support.git`, 브랜치 `main`. 지금까지 사용자 요청 시 main에 직접 커밋·푸시해 왔음 |
| 커밋 규칙 | 사용자가 "커밋/푸시해라"라고 할 때만 커밋. 메시지는 한국어 |

### 아직 결정 안 된 것 (필요할 때 사용자에게 물을 것)
- 화면에 대상자 이름(김○○)을 보여 줄지 → 현재 계획은 서버에 성명 미저장, "식별번호 + 연령대 + 동"만 표시. 이름은 기기 로컬 별칭으로 둘지 미정
- 수용률 "경미 수정" 기준값
- 상위 모델의 `구현1.md` 검증 결과 반영 여부 (사용자가 별도 검증 예정)

---

## 1. 사용자가 Mac에서 직접 할 일 (Claude 시작 전)

### 1-1. 기본 도구
```bash
# Homebrew 설치 (없으면)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install git gh node
gh auth login          # GitHub 로그인
node -v                # LTS(짝수 버전) 확인
```

### 1-2. 저장소 받기
```bash
mkdir -p ~/dev && cd ~/dev
git clone https://github.com/xenonluv/support.git dolbomieum
cd dolbomieum
```

### 1-3. Claude Code 준비 (스킬·툴 설치)
Windows에 설치돼 있던 구성을 그대로 옮긴다. (명령은 작성 시점 기준. 실패하면 Claude Code 안에서 `/plugin`, `/mcp` 메뉴로 설치)

**① Claude Code 설치·로그인**
```bash
curl -fsSL https://claude.ai/install.sh | bash   # 또는: npm install -g @anthropic-ai/claude-code
claude          # 첫 실행 시 로그인
```

**② 플러그인 (Claude Code 안에서 입력)**
| 플러그인 | 용도 | 설치 |
|---|---|---|
| **superpowers** (필수) | 계획→실행→검증 흐름, TDD, 완료 전 검증, 디버깅 스킬 | `/plugin install superpowers@claude-plugins-official` |
| andrej-karpathy-skills (권장) | 과잉 구현 방지, 최소 변경 원칙 | `/plugin marketplace add forrestchang/andrej-karpathy-skills` → `/plugin install andrej-karpathy-skills@karpathy-skills` |
| typescript-lsp (권장) | TS 타입 오류·정의 탐색 (Windows의 pyright-lsp 대신, 이 프로젝트는 TypeScript) | `/plugin` 메뉴 → claude-plugins-official에서 TypeScript LSP 검색·설치 |

설치 후 `/plugin`에서 목록 확인 → Claude Code 재시작.

**③ MCP 서버 (터미널에서, 모든 프로젝트 공통으로 user 범위 등록)**
```bash
claude mcp add --scope user context7 -- npx -y @upstash/context7-mcp
claude mcp add --scope user playwright -- npx @playwright/mcp@latest
claude mcp list      # 두 서버 connected 확인
```
| MCP | 용도 |
|---|---|
| context7 | Next.js·Supabase·Groq·Anthropic SDK 최신 문서 조회 |
| playwright | 화면 동작·반응형 확인, 스크린샷 |

**④ CLI 도구 (터미널)**
```bash
npm i -g vercel          # vercel login, vercel link, vercel env pull
brew install supabase/tap/supabase   # supabase login (마이그레이션·타입 생성)
```

**⑤ 기본 내장 스킬 (설치 불필요, 사용만)**
`/simplify`(중복 정리), `/code-review`(버그 확인), `/security-review`(보안 점검), `/init`, `/recap`, `claude-api`(Claude API 사용법)

**⑥ 아이폰 디버깅 준비 (마이크 기능 테스트용)**
- 아이폰: 설정 → Safari → 고급 → **웹 속성(Web Inspector) 켜기**
- Mac: Safari → 설정 → 고급 → **"웹 개발자를 위한 기능 표시"** 켜기 → 아이폰을 케이블로 연결 → Safari 개발 메뉴에서 기기 선택
- 안드로이드: 휴대폰 개발자 옵션 → USB 디버깅 → Mac 크롬 `chrome://inspect`

**설치하지 않는 것:** SuperClaude, bkit (사용자 결정), kiwoom MCP(이 프로젝트와 무관)

### 1-4. 외부 서비스 계정 (1주차 중 필요)
| 서비스 | 할 일 | 결과물 |
|---|---|---|
| Vercel | GitHub 계정으로 가입 | 프로젝트 연결 |
| Supabase | 가입 → 새 프로젝트(리전: Seoul `ap-northeast-2`) | URL, anon key, service_role key |
| Groq | console.groq.com 가입 → API 키 | `GROQ_API_KEY` |
| Anthropic | console.anthropic.com → API 키 | `ANTHROPIC_API_KEY` |
| Cloudflare | 가입 → `dolbomieum.kr` 사이트 추가 → 안내된 네임서버 2개를 **가비아 관리 화면에 입력** | 반영까지 수 시간~1일 |

### 1-5. 첫 세션에서 Claude에게 할 말 (예시)
> `doc/Mac구축.md`를 읽고 1주차 구축을 시작해라.

---

## 2. 저장소 현재 상태 (Windows에서 넘어온 것)

```
dolbomieum/            (GitHub: xenonluv/support)
├── .claude/settings.json   ← bkit 비활성화 설정
├── .gitattributes          ← 줄바꿈 LF 통일, 바이너리 지정
├── doc/                    ← 공모전 문서 전부 (hwp, pdf, pptx, 이미지)
│   ├── 구현1.md            ← ★ 구현 계획서 (기능·스택·데이터모델·화면·일정)
│   ├── Mac구축.md          ← 이 문서
│   ├── plan.md             ← 세부계획서 텍스트본
│   ├── 발표프롬프트.md      ← 발표자료2 슬라이드별 내용
│   ├── design_ui.png       ← 가상연출도(대시보드 + 모바일 알림 시안)
│   └── 예산.txt
├── set-bypass-mode.bat / .ps1  ← Windows용 스크립트(Mac에서는 사용 안 함, 삭제해도 됨)
```
- 코드는 아직 없음. 1주차에 처음 만든다.
- `.hwp` 파일은 Mac에서 한컴오피스 Mac/한컴 뷰어가 있어야 열림. 내용은 `plan.md`, `발표프롬프트.md`로 대신 확인 가능.

---

## 3. 1주차 구축 절차 (Claude가 수행)

진행 방식: `superpowers:writing-plans`로 1주차 계획을 짧게 확정 → `superpowers:executing-plans`로 실행 → 각 단계 끝에 `superpowers:verification-before-completion`(실제 실행해서 확인 후 완료 보고). 라이브러리 설치·설정 방법은 **context7로 최신 문서를 확인**하고 진행한다(아래 명령어는 작성 시점 기준이며 바뀌었을 수 있음).

### 3-1. 폴더 구조 결정
앱은 저장소 루트가 아니라 **`web/` 하위 폴더**에 만든다. 문서(`doc/`)와 코드를 분리하기 위함. Vercel에서 Root Directory를 `web`으로 지정한다.

```
dolbomieum/
├── CLAUDE.md          ← 3-3에서 작성 (프로젝트 규칙, 매 세션 자동 로드)
├── doc/
└── web/               ← Next.js 앱
    ├── src/
    │   ├── app/
    │   │   ├── (auth)/login/
    │   │   ├── (worker)/          ← 현장 돌봄인력용 모바일 화면
    │   │   │   ├── visits/        ← 오늘의 방문
    │   │   │   ├── record/        ← 기록하기(녹음→초안)
    │   │   │   └── my-records/
    │   │   ├── (manager)/         ← 동 담당자용 대시보드
    │   │   │   ├── signals/       ← 이상징후 현황
    │   │   │   ├── briefing/
    │   │   │   ├── clients/
    │   │   │   └── agencies/
    │   │   └── api/
    │   │       ├── transcribe/route.ts
    │   │       ├── draft/route.ts
    │   │       └── briefing/route.ts
    │   ├── lib/
    │   │   ├── stt/           ← STT 공통 인터페이스 + groq 구현 (교체 가능 구조)
    │   │   ├── ai/            ← Claude 호출, 프롬프트, 스키마
    │   │   ├── privacy/       ← 개인정보 마스킹
    │   │   ├── supabase/      ← 서버/브라우저 클라이언트, 생성 타입
    │   │   └── audio/         ← 녹음 포맷 선택, 권한, 인앱브라우저 감지
    │   ├── schemas/           ← Zod 스키마(기록초안·플래그·브리핑) — 단일 출처
    │   └── components/
    ├── supabase/migrations/   ← SQL 마이그레이션
    └── tests/                 ← Vitest
```

### 3-2. 프로젝트 생성
```bash
cd ~/dev/dolbomieum
npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd web
npx shadcn@latest init
npm i @supabase/supabase-js @supabase/ssr @anthropic-ai/sdk groq-sdk zod
npm i -D vitest @vitejs/plugin-react prettier supabase
```
- `package.json`에 `"engines": { "node": ">=<설치한 LTS 메이저>" }` 추가, `web/.nvmrc`에 Node 버전 기록
- `tsconfig.json`은 `"strict": true` 유지
- 스크립트: `dev`, `build`, `lint`, `typecheck`(`tsc --noEmit`), `test`(`vitest run`)

### 3-3. 루트 `CLAUDE.md` 작성 (반드시 포함할 내용)
- 이 프로젝트는 superpowers 흐름만 사용, bkit·SuperClaude 사용 안 함
- 앱 위치는 `web/`, 명령어는 `web/`에서 실행
- **공통 모듈 사용 규칙** (중복 코드 방지)
  - STT 호출은 `lib/stt`의 `transcribe()`만 사용
  - LLM 호출은 `lib/ai`만 사용, 모델명은 한 곳(상수)에서 관리
  - AI 입출력·API 입력 타입은 `schemas/`의 Zod 스키마에서만 정의
  - DB 타입은 Supabase 생성 타입만 사용
- **개인정보 규칙**: 음성 파일 저장 금지(스토리지·디스크·로그 모두), 성명·주소·연락처 컬럼 금지, LLM 호출 전 `lib/privacy` 마스킹 필수, 로그에 구술 텍스트 금지, API 키는 서버 전용
- 완료 전 확인 명령: `npm run typecheck && npm run lint && npm test`
- 현재 진행 단계(주차·기능) 한 줄 — 단계가 바뀔 때마다 갱신
- 커밋은 사용자 요청 시에만, 메시지는 한국어

### 3-4. 환경변수
`web/.env.local` (git 제외, `.env.example`만 커밋)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
ANTHROPIC_API_KEY=
```
- 운영 값은 Vercel 환경변수에 입력 → 다른 컴퓨터에서는 `vercel env pull`

### 3-5. Supabase 스키마 (1차)
`구현1.md` 6장 데이터 모델을 마이그레이션 SQL로 작성한다.
- 테이블: `agencies`, `workers`, `clients`, `visit_records`, `flags`, `alert_drafts`, `briefings`
- `clients`에 성명·주소·연락처 컬럼을 만들지 않는다
- 연관 대상자-기관은 `agency_ids[]` 대신 **조인 테이블 `client_agencies(client_id, agency_id)`** 사용을 권장(RLS 작성이 쉬움) — 구현1.md와 다르므로 적용 시 구현1.md도 갱신
- RLS: worker는 자기 기관과 연계된 대상자만, manager는 기관 전체
- 마이그레이션 후 타입 생성: `npx supabase gen types typescript --project-id <id> > src/lib/supabase/types.ts`

### 3-6. 로그인
- Supabase Auth 이메일(매직링크 또는 비밀번호). 파일럿 인원이 적으므로 관리자가 계정을 직접 만드는 방식으로 시작
- 로그인 후 role에 따라 `(worker)` / `(manager)` 화면으로 분기

### 3-7. 배포·도메인
1. GitHub 푸시 → Vercel에서 저장소 import, **Root Directory = `web`**
2. Vercel 환경변수 입력
3. Vercel → Settings → Domains에 `dolbomieum.kr`(및 `www`) 추가
4. Cloudflare DNS에 Vercel이 안내하는 레코드 입력(보통 루트 `A 76.76.21.21`, `www CNAME cname.vercel-dns.com` — **Vercel 화면 값을 우선**), 프록시 **꺼짐(회색 구름)**
5. `https://dolbomieum.kr` 접속 확인

### 3-8. 1주차 완료 기준 (실제로 확인할 것)
- [ ] `npm run typecheck && npm run lint && npm test` 통과
- [ ] `https://dolbomieum.kr`에서 로그인 화면 표시
- [ ] 테스트 계정으로 로그인 → 역할별 화면 분기
- [ ] Supabase에 테이블·RLS 적용, worker 계정으로 다른 기관 대상자 조회 불가 확인
- [ ] **마이크 권한 스모크 테스트 페이지**: 갤럭시(크롬·삼성 인터넷), 아이폰(사파리), 카카오톡 링크로 열기 → 녹음 시작·종료·재생까지 확인 (STT 연동 전 기기 호환성부터 확보, 구현1.md 9-1장)

---

## 4. 이후 일정 (구현1.md 10장 요약)
| 주차 | 작업 |
|---|---|
| 2~3 | 기능① 녹음 → STT → 기록 초안(복사), 텍스트 입력 대체, 서식 정합성 |
| 4 | 기능③ 이상징후 플래그·알림 초안·대시보드 / 중간발표 |
| 5 | 기능② 인수인계 브리핑 |
| 6 | 현장 파일럿(5~10명, 2주), 성과지표 로깅 |
| 7 | 피드백 반영, 정량 성과 측정, 발표자료 |

각 기능은 착수 전 `superpowers:writing-plans`로 계획 → 핵심 로직(마스킹, 스키마 파싱, 수용률 계산)은 `superpowers:test-driven-development` → 완료 후 `/simplify`, `/code-review`.

---

## 5. Mac 세션 Claude를 위한 주의사항
- 사용자는 한국어로 소통하며 짧고 직접적인 지시를 선호한다. 결과 보고도 한국어로.
- Windows 세션의 Claude 메모리는 Mac으로 넘어오지 않는다. 이 문서와 `구현1.md`, 이후 작성할 `CLAUDE.md`가 유일한 인수인계 수단이다.
- 전역 설정(`~/.claude/`)이나 플러그인을 바꾸기 전에는 사용자에게 확인받는다.
- 외부 서비스 키나 결제가 필요한 단계에서는 멈추고 사용자에게 값을 요청한다.
- `구현1.md` 12장 "미확인·가정" 항목은 진행 중 확인되면 문서를 갱신한다.
