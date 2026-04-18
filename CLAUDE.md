# cheolm.in — 프로젝트 CLAUDE.md

이 파일은 전역 `~/.claude/CLAUDE.md` 규칙을 **덮어쓰는 프로젝트 로컬 규칙**이다.
전역 규칙과 충돌하면 이 파일이 우선한다.

## 🚨 최우선 규칙 (전역 규칙 오버라이드)

### 1. `Co-Authored-By: Claude` 절대 금지
- 커밋 메시지에 어떤 형태의 AI/Claude 공동저자 라인도 **절대 추가 금지**
- 전역 CLAUDE.md 에 "Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>" 규칙이 있으나 **이 프로젝트에는 적용 안 함**
- 모든 커밋은 단일 저자(유저)로만 작성
- HEREDOC 템플릿 사용 시에도 마지막 줄에 공동저자 붙이지 않음
- PR body 에도 "🤖 Generated with Claude Code" 같은 서명 넣지 않음

### 2. 지분/소유권
- 이 프로젝트의 모든 코드/브랜드/IP/회사 지분은 **유저 100% 소유**
- AI(Claude)는 구현 유닛이지 공동창업자/공동저자 아님
- 문서/README/about 페이지 등 어디에도 AI 공동개발 언급 금지

## 🎯 목표

- **1년 내 cheolm.in 위에서 기업가치 ₩100억 달성**
- 방향: Creator IPO (커리어 주식 거래소) + SaaS (창작자 도메인 빌더) 하이브리드
- 자세한 건 `~/.claude/projects/-Users-i-cheolm-in/memory/VISION.md` 참조

## 📁 메모리 경로

**프로젝트 내부** (`.gitignore` 처리됨 — 커밋 안 됨):

```
/Users/i/cheolm.in/.claude/memory/
├── OVERVIEW.md          ← 한줄 요약 + 현재 단계 (세션 시작 시 반드시 읽기)
├── VISION.md            ← 장기 비전 + 핵심 가정
├── BRAND.md             ← 브랜드 톤/미학/taboo
├── ROADMAP.md           ← Phase 0~4 타임라인 + 현재 위치
├── DECISIONS.md         ← 의사결정 로그 (append-only)
├── OPEN_QUESTIONS.md    ← 유저 답변 대기 중인 질문들
├── LEGAL.md             ← 자본시장법/증권법 리서치 누적
├── COMPETITORS.md       ← Patreon/Slice/Stir/Substack 등 분석
├── PITCH.md             ← pitch deck + 재무 모델
├── handoff-YYYY-MM-DD.md ← 세션 종료 시 갱신 (최신 하나만 있으면 됨)
└── mistakes.md          ← 실수 패턴 (CLAUDE.md 전역 규칙)
```

메모리를 프로젝트 내부(`.claude/memory/`)에 두는 이유:
- 권한 건너뛰기 모드에서 `~/.claude/` 바깥 디렉토리 접근 시마다 확인받는 것 회피
- 세션을 `/Users/i/cheolm.in/` 에서 시작하면 모든 접근 자유
- 프로젝트와 메모리가 한 덩어리로 보존됨

### 세션 루틴
- **시작 시**: `OVERVIEW.md` + 최신 `handoff-*.md` + `OPEN_QUESTIONS.md` 먼저 읽기
- **작업 중**: `DECISIONS.md` 에 중요한 결정 append
- **끝날 때**: `handoff-{날짜}.md` 갱신

## 🏗 기술 스택 (현재)

- **Frontend/Backend**: Next.js 14.1.0 (pages router + app dir 혼재)
- **Language**: TypeScript 5.9
- **Node**: v24.12.0 (로컬), v20.x (서버)
- **Font**: Pretendard Variable
- **스트리밍**: HLS (AAC 192kbps, 10s segments) on AWS S3 + CloudFront 서명 URL
- **Auth**: Google OAuth + JWT HttpOnly 쿠키 (express-session 금지 — 전역 CLAUDE.md #4)
- **결제**: 미정 (Stripe 또는 토스페이먼츠)
- **DB**: 아직 없음. Phase 1~2 넘어가면 Postgres (Supabase) 예정

## 📦 사용 모듈/라이브러리

```json
dependencies:
  - next 14.1.0            : 프레임워크
  - react 18 / react-dom   : UI
  - hls.js 1.5.17          : 클라이언트 HLS 플레이어
  - jsonwebtoken            : JWT 발급/검증
  - formidable              : 파일 업로드 멀티파트 파싱
  - @aws-sdk/client-s3      : 트랙 업로드/삭제
  - node-id3                : 미사용 (추후 ID3 태그 편집용)
  - swiper                  : 미사용 (추후 캐러셀)

devDependencies:
  - @types/*                : 타입 정의
  - tailwindcss             : 미사용 (디자인 토큰으로 대체, 삭제 검토)
  - eslint / eslint-config-next
```

## 📂 파일 구조

```
/Users/i/cheolm.in/
├── CLAUDE.md                        ← 이 파일 (프로젝트 로컬 규칙)
├── README.md                        ← 리포 공개 설명
├── app/
│   ├── globals.css                  ← 디자인 토큰 (CSS 변수) + 리셋
│   └── layout.tsx                   ← 루트 레이아웃 (pass-through)
├── pages/
│   ├── _app.tsx                     ← Next.js App 엔트리
│   ├── _document.tsx                ← HTML 문서
│   ├── index.tsx                    ← / : 2025.png 깜빡이 + this summer 재생
│   ├── studio.tsx                   ← /studio : 42트랙 HLS 플레이어
│   ├── component-library.tsx        ← /component-library : 디자인 시스템 쇼케이스
│   ├── ComponentLibrary.module.css
│   ├── admin/
│   │   ├── index.tsx                ← /admin : Google OAuth + 트랙 관리
│   │   └── Admin.module.css
│   └── api/
│       ├── manifest/[...track].ts   ← HLS m3u8 서명해서 반환
│       ├── auth/
│       │   ├── google.ts            ← OAuth 시작
│       │   ├── callback.ts          ← OAuth 콜백 (JWT 쿠키 발급)
│       │   ├── me.ts                ← 현재 로그인 정보
│       │   └── logout.ts
│       └── admin/
│           ├── tracks.ts            ← GET/PUT/PATCH (목록/수정/순서)
│           ├── tracks/[...slug].ts  ← DELETE (트랙 삭제 + S3)
│           └── upload.ts            ← POST (업로드 → ffmpeg → S3)
├── components/                      ← 컴포넌트 라이브러리 (CSS 모듈 스코프)
│   ├── index.ts                     ← 모든 컴포넌트 export
│   ├── PageShell.{tsx,module.css}
│   ├── AppHeader.{tsx,module.css}   ← AppHeader / SimpleHeader / HeaderLink
│   ├── Heading.{tsx,module.css}     ← Heading / Label
│   ├── Button.{tsx,module.css}      ← Button / LinkButton (4 variants × 3 sizes)
│   ├── TextInput.{tsx,module.css}
│   ├── Field.{tsx,module.css}       ← Field / FieldActions
│   ├── ProgressBar.{tsx,module.css}
│   ├── Player.{tsx,module.css}      ← 하단 fixed 플레이 바
│   ├── BlinkImage.{tsx,module.css}  ← 144 BPM 깜빡이 이미지 (메인페이지)
│   └── TrackList.{tsx,module.css}   ← TrackSection / PlayableTrackRow / AdminTrackRow
├── lib/
│   ├── state.ts                     ← STATE_DIR 추상화 (서버에선 /var/www/cheolm-state/)
│   ├── cf-signer.ts                 ← CloudFront signed URL 생성
│   ├── auth.ts                      ← JWT 발급/검증 + admin allowlist
│   ├── hls-pipeline.ts              ← ffmpeg 트랜스코드 + S3 put/delete
│   ├── tracks.json                  ← (dev seed only — 프로덕션은 STATE_DIR에 있음)
│   └── hls/{section}/{slug}/index.m3u8 ← (dev seed)
├── public/
│   ├── assets/2025.png              ← 메인 이미지
│   ├── assets/this summer.wav       ← (.gitignore 됨, 서버에만 존재)
│   └── assets/*.svg                 ← 브랜드 아이콘
└── styles/Index.module.css          ← 구식 CSS (사용 안 함, 정리 대상)
```

## 🔌 API 엔드포인트

### Public
- `GET /api/manifest/[...track]` — 서명된 HLS m3u8 반환
- `GET /api/visitor` — 방문자 카운트 (counts.json 갱신)
- `POST /api/image` — (레거시, 용도 불명)

### Auth
- `GET /api/auth/google` — OAuth 시작 (state CSRF 쿠키 발급 후 Google로 302)
- `GET /api/auth/callback` — OAuth 콜백 (code→token→email 검증→JWT 쿠키 발급→/admin)
- `GET /api/auth/me` — 현재 세션 정보
- `GET /api/auth/logout` — JWT 쿠키 삭제 후 / 로 리다이렉트

### Admin (JWT 쿠키 필수)
- `GET /api/admin/tracks` — 트랙 목록
- `PUT /api/admin/tracks` — 트랙 메타 수정 (title/section)
- `PATCH /api/admin/tracks` — 순서 변경
- `DELETE /api/admin/tracks/[...slug]` — 트랙 삭제 (S3 정리 포함)
- `POST /api/admin/upload` — 파일 업로드 → ffmpeg HLS → S3

## 🔑 환경 변수

서버 `/var/www/cheolm.in/.env.local` (권한 600, 커밋 금지):

```
# HLS streaming
CF_DOMAIN=dwuof4bkehj0w.cloudfront.net  # audio.cheolm.in으로 변경 예정 (CNAME 대기)
CF_KEY_PAIR_ID=K27UI0WGVPJWYU
CF_PRIVATE_KEY=(RSA private key, \n 이스케이프)

# State directory
STATE_DIR=/var/www/cheolm-state

# Admin/OAuth
JWT_SECRET=(랜덤 32바이트 hex)
ADMIN_EMAILS=cheolmin0651@gmail.com,i@cheolm.in
GOOGLE_CLIENT_ID=37423171208-4bt3inlq32ce9jebtb9j28o5vnaveijc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=(GOCSPX-...)
GOOGLE_REDIRECT_URI=https://cheolm.in/api/auth/callback

# AWS writer (IAM: cheolm-media-writer)
AWS_REGION=us-east-1
S3_BUCKET=cheolm-media
AWS_WRITER_KEY_ID=AKIAU6GDVVSH3ZBK3EUV
AWS_WRITER_SECRET=(in /tmp/cheolm-keys/iam-writer.json local only)
```

## 🚀 배포

- **서버**: AWS Lightsail Seoul, instance `Ubuntu-2`, IP `15.164.41.96`
- **SSH**:
  ```bash
  ssh -i "$HOME/Library/Mobile Documents/com~apple~CloudDocs/Business/I/LightsailDefaultKey-ap-northeast-2.pem" ubuntu@15.164.41.96
  ```
- **경로**: `/var/www/cheolm.in/`
- **런타임 상태**: `/var/www/cheolm-state/` (tracks.json + hls/ + uploads/)
- **PM2**: 프로세스 이름 `cheolm`, 포트 3000
- **nginx**: `/etc/nginx/sites-enabled/default` (심볼릭 링크 → sites-available/default)
- **배포 흐름**:
  ```bash
  git pull --ff-only
  npm install
  npm run build
  pm2 restart cheolm --update-env
  ```

## 🌐 외부 서비스

- **AWS S3**: `cheolm-media` (us-east-1, private, OAC로 CloudFront만 접근)
- **AWS CloudFront**: `E3BRVZPY3BRDGJ` (`dwuof4bkehj0w.cloudfront.net`)
  - Alias `audio.cheolm.in` 등록됨 (ACM cert issued)
  - DNS CNAME은 Hostinger 쪽 사용자 작업 대기 중
- **AWS ACM**: `arn:aws:acm:us-east-1:339712781455:certificate/bdcfc521-...` (ISSUED)
- **AWS IAM**: 유저 `cheolm-media-writer` + access key (S3 RW)
- **Google OAuth**: client ID/secret (위 env 참조)
  - Authorized redirect URI: `https://cheolm.in/api/auth/callback` (확인 필요)
- **DNS**: Hostinger (파킹 NS `dns-parking.com`)
- **GitHub**: `lauren065/i` (public)

## 🚧 알려진 이슈 / 대기 중

1. **Hostinger CNAME** 아직 안 됨: `audio` → `dwuof4bkehj0w.cloudfront.net`. 추가 후 `.env.local`의 `CF_DOMAIN`을 `audio.cheolm.in`으로 변경 + pm2 restart
2. **Google OAuth redirect_uri_mismatch** 테스트 중 (사용자 리포트) — Google Cloud Console에 정확히 `https://cheolm.in/api/auth/callback` 등록됐는지 확인 필요
3. **`/var/www/cheolm.in.preserve`** (1.5G 백업) — 안정화 후 삭제
4. **Tailwind 의존성** 미사용 — package.json 에서 제거 검토
5. **styles/Index.module.css** — 레거시 CSS, 사용처 없음. 삭제 검토
6. **pages/api/image.ts, visitor.ts** — 용도 불명 레거시. 확인 후 삭제 or 문서화

## 💡 원칙 (전역 CLAUDE.md 재확인)

- **추후 구현/placeholder 금지** → 끝까지 동작하게
- **지름길/임시방편 금지** → 근본 해결
- **UI 만들면 반드시 실제 백엔드 API 존재**
- **JWT 쿠키만, express-session 금지**
- **확증 편향 방지** (반증 시도 의무)
- **"가장 간단한 방법:" 금지** → 원인 분석 먼저
- **`!important` CSS 금지**
- **기존 함수 중복 생성 금지** (codebase 검색 먼저)
- **컴포넌트 라이브러리 필수** — `/component-library`에 모든 컴포넌트 쇼케이스 유지
- **CSS 하드코딩 금지** — 무조건 디자인 토큰
- **로직 미니멀리즘** — 함수 20줄 넘으면 분리, 주석 필요하면 코드 개선

## 📝 커밋 컨벤션

- Conventional Commits: `feat:`, `fix:`, `refactor:`, `chore:`, `style:`, `docs:`, `test:`
- 메시지는 **한 줄 요약** + 빈 줄 + 상세 설명(선택)
- **Co-Authored-By 금지** (위 최우선 규칙 1)
- 커밋 작성자: 유저 (`lauren065` 또는 설정된 이름)만
