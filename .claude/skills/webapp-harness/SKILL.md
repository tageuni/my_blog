---
name: webapp-harness
description: Bootstraps and runs the Plan→Work→Review→(Gemini second-opinion)→Commit multi-subagent workflow, the vanilla Node.js static-site tech-stack conventions, and the safe default permission profile used by this project (my_blog). Use this whenever the user asks to build a new feature "the way this project does it," wants to split work across subagents with scoped instruction files, wants a spec.md/review.md written before or after implementation, wants to start a brand-new project with this same harness ("이 프로젝트 하네스로 시작해줘", "CLAUDE.md 만들어줘"), or asks for a second-opinion / Gemini / Antigravity review pass on top of the normal review ("제미나이 리뷰 한 번 더", "2차 리뷰 해줘"). Always consult this skill before spawning implementation subagents in this repo, even if the user's request doesn't name the workflow explicitly — CLAUDE.md makes it mandatory.

compatibility: Requires the Agent tool (subagents) for Work/Review/Gemini-review steps. The Gemini second-opinion step additionally requires the Antigravity CLI (`agy.exe`) to be installed and reachable — see references/gemini-review-loop.md for how to locate it and how to get explicit user permission for headless execution.
---

# webapp-harness

이 스킬은 `my_blog` 프로젝트에서 실제로 검증된 작업 방식을 다른 상황에도 다시 쓸 수 있게 문서화한 것이다. 핵심은 하나: **작은 기능 단위로 쪼개서, 서브에이전트에게 좁은 범위만 맡기고, 구현 전후로 문서를 남긴다.** 이렇게 하면 사용자는 매 단계마다 검토·승인할 지점이 생기고, 나(오케스트레이터)는 각 서브에이전트의 컨텍스트를 작게 유지해 실수를 줄일 수 있다.

## 언제 이 사이클을 돌리나

- 새 화면/기능(게임, 도구, 페이지 등)을 추가해달라는 요청
- "하네스대로 해줘", "CLAUDE.md대로 진행해줘" 같은 명시적 요청
- 이 프로젝트에 `CLAUDE.md`가 있다면 그 자체가 이 사이클을 강제하는 지침이므로, 별다른 언급이 없어도 기본으로 따른다.

사소한 오타 수정, 리뷰에서 나온 버그 수정처럼 작은 변경까지 매번 spec.md부터 새로 쓸 필요는 없다 — 그건 과잉이다. "기능"이라 부를 만한 단위(사용자가 눈으로 확인할 수 있는 새 화면/동작)에 사이클을 적용한다.

## 사이클: Plan → Work → Review → (Gemini 2차 리뷰, 선택) → Commit

### 1. Plan
서브에이전트를 하나 띄워 `spec-<feature>.md`를 쓰게 한다. 안에 들어갈 내용: 파일 구조, 마크업/JS/CSS 설계, 기존 코드와 통합되는 지점(예: 빌드 스크립트 수정 범위), 명시적으로 **하지 않을 것**(scope 밖). 다 쓰면 **사용자 승인 없이는 다음 단계로 넘어가지 않는다** — 설계를 잘못 짚은 채로 구현까지 가면 되돌리는 비용이 훨씬 크기 때문이다.

### 2. Work
승인된 spec을 바탕으로 서브에이전트에게 구현을 맡긴다. 넘길 때마다 전용 지침 파일(`work-<feature>.md`)을 만들어서:
- spec.md를 반드시 먼저 읽고 그대로 따르게 한다 (설계를 임의로 바꾸지 않게)
- **수정 가능한 파일 목록을 정확히 나열**한다. 이 목록 밖은 건드리지 말라고 명시한다.
- 기존 코드 스타일(예: 이 프로젝트는 브라우저 JS는 IIFE+var+`'use strict'` 없음, 빌드 스크립트는 CommonJS+const/let+`'use strict'`)을 참고하라고 알려준다 — 자세한 컨벤션은 `references/tech-stack.md` 참고.

**화면(독립적으로 볼 수 있는 UI 단위)이 3개 이상이면 화면별로 서브에이전트를 나눈다.** 나눌 때는 파일 범위가 서로 겹치지 않게 쪼개서, 병렬로 돌려도 충돌이 안 나게 한다. 완료 후 반드시 빌드(`npm run build` 등)가 깨지지 않는지 확인시킨다.

### 3. Review
또 다른 서브에이전트에게 `review-<feature>.md` 지침 파일로 테스트를 맡긴다:
- spec과 실제 구현을 비교
- 빌드 확인 + (프론트엔드라면) 실제 브라우저로 핵심 플로우와 엣지 케이스를 조작해서 확인 — 스크린샷만 보고 판단하지 말고 콘솔 로그, DOM/캔버스 상태를 직접 읽어서 검증
- 발견한 버그는 **고치지 말고** 파일:라인, 재현 방법, 심각도와 함께 문서에만 기록한다 (Review와 Work의 책임을 섞지 않기 위해)
- 결과를 `review-<feature>-report.md` 같은 이름으로 저장 — **기존 review 파일을 덮어쓰지 않도록 기능별로 파일명을 구분**한다 (`spec.md`/`review.md`처럼 접미사 없는 이름은 첫 기능에서만 쓰고, 이후 기능은 전부 `-<feature>` 접미사를 붙인다)

### 4. Gemini 2차 리뷰 (선택, 권장)
Claude의 리뷰만으로 끝내지 않고, 다른 모델(Gemini, Antigravity CLI 경유)에게 독립적인 2차 의견을 받고 싶을 때 쓴다. 자세한 절차는 `references/gemini-review-loop.md`를 읽어라 — 요약하면: 헤드리스로 Antigravity CLI를 돌려 기존 review 문서를 참고시키고 새 관점의 `gemini-review.md`를 쓰게 한 뒤, **나(오케스트레이터)가 직접** 그 결과를 실제 소스 코드와 대조해 타당성을 검증하고, 타당한 것만 고친다. 서브에이전트의 요약을 그대로 믿지 말고 파일을 직접 읽어서 확인하는 게 핵심이다 — 특히 헤드리스 CLI 실행에는 `--dangerously-skip-permissions` 같은 위험한 플래그가 필요할 수 있는데, 이건 **매번 사용자에게 명시적으로 1회 승인을 받아야 한다** (전에 승인받았다고 다음에도 자동으로 적용되지 않는다).

### 5. Commit
기능 하나가 끝날 때마다 커밋 하나. 여러 기능을 몰아서 커밋하지 않는다 — 나중에 특정 기능만 되돌리거나 리뷰하기 쉽게 하기 위해서다. spec/work/review 문서들도 코드와 함께 커밋한다 (스크래치 파일이 아니라 그 기능이 왜 그렇게 만들어졌는지 보여주는 기록이므로). 푸시는 사용자가 명시적으로 요청했을 때만 한다.

## 서브에이전트에게 일 시킬 때 공통 원칙

- **전용 지침 파일을 만들어서 넘긴다.** 프롬프트로 길게 설명하는 것보다, `.md` 파일로 "무엇을 왜 하는지 + 정확히 어떤 파일을 건드릴 수 있는지"를 적어두면 서브에이전트가 스코프를 벗어나지 않는다.
- **서로 다른 서브에이전트의 파일 범위는 겹치지 않게 나눈다.** 겹치면 병렬 실행 시 한쪽 작업이 덮어써진다.
- Work 완료 후에는 `git status --porcelain`으로 실제로 지침 파일에 나열된 파일만 바뀌었는지 확인하는 습관을 들인다.

## 새 프로젝트를 이 하네스로 부트스트랩하기

1. `assets/CLAUDE.md.template`을 새 프로젝트 루트에 `CLAUDE.md`로 복사하고, 프로젝트에 맞게 다듬는다(사이클 자체는 그대로 두고 예시나 기술 스택 설명만 갈아끼운다).
2. `assets/settings.json.template`을 새 프로젝트의 `.claude/settings.json`으로 복사한다 — 위험한 명령(강제 삭제, force push, 설정 파일 직접 수정 등)을 기본 차단하는 deny 목록이다. `.claude/settings.local.json`(개인별 allow 목록)은 템플릿화하지 않는다 — 작업하면서 승인받은 명령이 자연스럽게 쌓이도록 둔다.
3. 이 프로젝트처럼 정적 사이트/미니 웹앱을 만드는 스택이라면 `references/tech-stack.md`의 컨벤션(빌드 스크립트 구조, 손으로 쓰는 정적 페이지 통합 패턴, 다크모드 3단 CSS, 브라우저 JS 스타일)을 참고해서 새 프로젝트에도 맞게 적용한다. 스택이 다르면(예: React, 다른 빌드 도구) 이 부분은 참고만 하고 사이클/서브에이전트 규칙만 가져온다 — 강제로 이식하지 않는다.

## 참고 파일
- `references/tech-stack.md` — 이 프로젝트(정적 Node.js 사이트 생성기 + 손으로 쓴 바닐라 JS 미니 웹앱)의 구체적인 코드 컨벤션. Work 단계 지침 파일을 쓸 때 참고.
- `references/gemini-review-loop.md` — Antigravity CLI(`agy.exe`)를 헤드리스로 돌려 Gemini 관점 2차 리뷰를 받는 절차. Gemini 2차 리뷰 단계에서 참고.
- `assets/CLAUDE.md.template`, `assets/settings.json.template` — 새 프로젝트 부트스트랩용 템플릿.
