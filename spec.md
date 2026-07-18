# 2048 게임 추가 구현 계획서

## 1. 개요

2048은 4x4 격자에서 숫자 타일을 방향키로 밀어 같은 숫자끼리 합쳐 더 큰 숫자를 만드는 퍼즐 게임이다.

- 보드: 4x4 격자. 시작 시 빈 칸 중 두 곳에 무작위로 2(90%) 또는 4(10%) 타일이 생성된다.
- 조작: 방향키(위/아래/왼쪽/오른쪽)를 누르면 모든 타일이 해당 방향 끝까지 밀리고, 같은 값의 타일이 부딪히면 하나로 합쳐지며 값이 2배가 된다 (합쳐진 값만큼 점수 획득).
- 한 번의 입력으로 같은 타일이 두 번 연속 합쳐지지는 않는다 (예: 2 2 2 2 → 4 4, 8 아님).
- 타일이 실제로 하나라도 이동/병합되었을 때만 새 타일이 하나 생성된다.
- 승리: 2048 타일이 만들어지면 승리. 이후 "계속하기"를 선택해 더 큰 타일에 계속 도전할 수 있다.
- 패배: 보드가 가득 찼고, 인접한 칸 중 합칠 수 있는 쌍이 하나도 없으면 더 이상 이동이 불가능하므로 게임 오버.
- 점수판: 현재 점수와 최고 점수(localStorage 저장, 브라우저 로컬 기준)를 함께 표시한다.

이 프로젝트는 마크다운 글을 정적 HTML로 변환하는 블로그이며, 2048 게임은 글(마크다운)이 아니므로 `posts/` → 빌드 파이프라인(frontmatter 파싱, 마크다운 파싱, 템플릿 렌더링)을 전혀 타지 않는다. 손으로 작성한 순수 HTML/CSS/JS 정적 자산을 빌드 시점에 `dist/`로 그대로 복사하는 방식으로 통합한다.

## 2. 파일 구조

```
src/
  games/
    2048/
      index.html   # 게임 페이지 마크업 (직접 작성한 완성된 HTML, 템플릿 엔진 미사용)
      style.css    # 게임 전용 스타일 (보드/타일/점수판/반응형/다크모드 오버라이드)
      game.js      # 게임 로직 (상태 관리, 이동/병합, 랜덤 타일, 승패 판정, 입력 처리)
build/
  config.js        # 수정: nav 배열에 2048 링크 항목 추가
  build.js         # 수정: copyStaticAssets()에 src/games → dist/games 복사 추가
```

새로 만드는 파일은 `src/games/2048/index.html`, `src/games/2048/style.css`, `src/games/2048/game.js` 3개뿐이다. `build/config.js`, `build/build.js`는 기존 파일을 최소한으로 수정한다. `posts/`, `build/frontmatter.js`, `build/markdown-parser.js`, `build/templates.js`는 전혀 건드리지 않는다.

빌드 후 결과 경로는 `dist/games/2048/index.html`이며, 사이트에서는 `/games/2048/`로 접근한다 (다른 정적 페이지들이 `/posts/{slug}/`, `/tags/{slug}/` 형태로 트레일링 슬래시 디렉터리 index.html 규칙을 따르는 것과 동일한 URL 관례).

## 3. HTML 구조 설계 (`src/games/2048/index.html`)

기존 `templates.js`의 `layout()`이 만들어내는 마크업 골격(헤더 구조, 다크모드 FOUC 방지 인라인 스크립트, 폰트/여백 기준)을 참고하되, 이 페이지는 build.js가 생성하지 않고 손으로 완성된 정적 HTML이므로 `layout()` 함수를 재사용하지 않고 동일한 스타일 규칙(class 이름, CSS 변수)만 맞춰 독립적으로 작성한다.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>2048 - My Blog</title>
<meta name="description" content="방향키로 숫자 타일을 밀어 합치는 2048 게임">
<link rel="stylesheet" href="../../styles/main.css">
<link rel="stylesheet" href="style.css">
<script>
(function () {
  var saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.setAttribute('data-theme', saved);
  }
})();
</script>
</head>
<body>
<header class="site-header">
  <div class="site-header-inner">
    <a class="site-title" href="../../">My Blog</a>
    <nav class="site-nav">
      <a class="nav-link" href="../../">홈</a>
      <a class="nav-link" href="../../tags/">태그</a>
      <a class="nav-link is-active" href="../../games/2048/">2048</a>
    </nav>
    <div class="site-header-actions">
      <button id="theme-toggle" class="theme-toggle" type="button" aria-label="다크 모드 전환">🌓</button>
    </div>
  </div>
</header>
<main class="site-main game-2048-main">
  <section class="game-2048">
    <div class="game-2048-header">
      <h1>2048</h1>
      <div class="score-board">
        <div class="score-box">
          <span class="score-label">SCORE</span>
          <span id="score-current">0</span>
        </div>
        <div class="score-box">
          <span class="score-label">BEST</span>
          <span id="score-best">0</span>
        </div>
      </div>
    </div>
    <div class="game-2048-controls">
      <p class="game-2048-help">방향키 또는 스와이프로 타일을 밀어 합치세요.</p>
      <button id="new-game-btn" class="new-game-btn" type="button">새 게임</button>
    </div>
    <div class="board-wrapper">
      <div id="board-grid" class="board-grid"></div>
      <div id="tile-layer" class="tile-layer"></div>
      <div id="game-overlay" class="game-overlay" hidden>
        <p id="game-overlay-text"></p>
        <div class="game-overlay-actions">
          <button id="overlay-keep-playing-btn" class="overlay-btn" type="button" hidden>계속하기</button>
          <button id="overlay-retry-btn" class="overlay-btn" type="button">새 게임</button>
        </div>
      </div>
    </div>
  </section>
</main>
<footer class="site-footer">
  <p>&copy; 2026 My Blog</p>
</footer>
<script src="../../scripts/theme-toggle.js"></script>
<script src="game.js"></script>
</body>
</html>
```

포인트:
- `main.css`는 상대 경로(`../../styles/main.css`)로 불러와 `:root` CSS 변수(`--bg`, `--text`, `--accent`, `--border`, `--bg-subtle` 등)와 헤더/버튼 등 공통 스타일을 그대로 재사용한다. 게임 전용 스타일은 같은 디렉터리의 `style.css`로 분리한다.
- 모든 링크·자산 경로를 **상대 경로**로 작성해 `config.js`의 `basePath`(GitHub Pages 서브패스 배포용) 값과 무관하게 항상 올바르게 동작하도록 한다. `dist/games/2048/index.html` 기준으로 `../../`는 항상 `dist/` 루트를 가리키므로, 루트 도메인 배포든 `/repo/` 서브패스 배포든 별도 처리 없이 동일하게 동작한다. (이 부분이 빌드 스크립트에서 문자열 치환 같은 별도 템플릿 처리를 하지 않아도 되는 핵심 이유다.)
- `theme-toggle.js`는 `id="theme-toggle"` 버튼과 FOUC 방지 인라인 스크립트를 그대로 재사용하므로 다크모드 토글이 블로그 본문과 동일하게 동작한다. `tag-filter.js`, `search.js`는 이 페이지에 해당 요소가 없으므로 로드하지 않는다.
- 보드는 배경 격자(`#board-grid`, 정적 16칸)와 그 위에 겹쳐지는 타일 레이어(`#tile-layer`, 매 이동마다 JS가 갱신)로 분리한다. 이렇게 하면 타일 위치 이동 애니메이션(`top`/`left` transition)을 타일 DOM에만 적용할 수 있고, 배경 격자는 다시 그릴 필요가 없다.
- 승리/패배는 별도 페이지 이동 없이 보드 위 오버레이(`#game-overlay`)로 표시한다.

## 4. JS 게임 로직 설계 (`src/games/2048/game.js`)

기존 `src/scripts/*.js`와 동일한 컨벤션을 따른다: 전체를 즉시실행함수(IIFE)로 감싸고, `'use strict'` 선언 없이 `var`와 `function () {}` 표현식을 사용하며 (`build/*.js`의 Node/CommonJS 스타일과는 구분), 주석은 자명하지 않은 이유가 있을 때만 남긴다.

```js
(function () {
  var SIZE = 4;
  ...
})();
```

### 4.1 상태 관리

- `board`: `SIZE x SIZE` 2차원 배열(`var board`). `0`은 빈 칸, 그 외 값은 타일 숫자.
- `score`: 현재 점수(숫자, 병합 시 합쳐진 값만큼 누적).
- `bestScore`: localStorage에서 읽어온 최고 점수.
- `isOver`, `hasWon`, `keepPlayingAfterWin`: 게임 종료/승리 상태 플래그. 별도 클래스나 프레임워크 없이 모듈 스코프 변수로 충분 (블로그 전체가 클래스 없는 절차적 스타일).
- 렌더링은 상태를 DOM에 동기화하는 단방향 흐름: `move(direction)` → 상태 갱신 → `render()` 한 번 호출. React류 프레임워크 없이 직접 구현하는 가장 단순한 패턴이다.

### 4.2 이동/병합 알고리즘

네 방향(상하좌우)을 각각 따로 구현하지 않고, **"왼쪽으로 밀기"** 하나의 핵심 함수로 통일한 뒤 보드를 회전/반전시켜 재사용한다.

- `moveRowLeft(row)`: 길이 4인 1차원 배열 하나를 입력받아
  1. `0`을 제거해 압축 (`[0,2,0,2]` → `[2,2]`)
  2. 압축된 배열을 앞에서부터 순회하며 인접한 두 값이 같으면 하나로 합치고(`값 * 2`) 점수에 더함. 합쳐진 칸은 다시 병합 대상이 되지 않도록 인덱스를 한 칸 더 건너뜀 (한 번의 이동에서 3연속 병합 방지: `2 2 2` → `4 2`)
  3. 다시 길이 4가 되도록 뒤를 `0`으로 채움
  4. 원래 행과 달라졌는지(`moved`) 여부도 함께 반환
- 방향별 처리는 `moveRowLeft`를 감싸는 좌표 변환으로 구현:
  - 왼쪽: 각 행에 `moveRowLeft` 그대로 적용
  - 오른쪽: 각 행을 반전 → `moveRowLeft` → 다시 반전
  - 위: 보드를 전치(transpose) → 각 행(원래 열)에 `moveRowLeft` → 다시 전치
  - 아래: 보드를 전치 → 각 행 반전 → `moveRowLeft` → 반전 → 다시 전치
- `move(direction)`은 위 변환을 적용한 새 보드와 "적어도 하나의 타일이 움직였는가(moved)"를 반환. `moved === false`면 (더 이상 그 방향으로 밀 수 없는 상태) 새 타일을 생성하지 않고 화면도 다시 그리지 않는다 — 방향키를 눌러도 아무 효과가 없는 상황과 실제 이동을 구분하기 위한 핵심 조건.

### 4.3 랜덤 타일 생성

- `spawnRandomTile()`: `board`에서 값이 `0`인 좌표 목록을 수집 → 그중 하나를 무작위 선택 → `Math.random() < 0.9 ? 2 : 4`로 채운다.
- 빈 칸이 없으면 아무 것도 하지 않음(패배 판정 쪽에서 별도로 처리).
- `move()`가 `moved === true`를 반환했을 때만 호출한다.

### 4.4 승리/패배 판정

- 승리: 매 이동 후 `board` 전체를 스캔해 값이 `2048` 이상인 칸이 있고 아직 `hasWon`이 아니면 `hasWon = true`로 설정, 오버레이에 "계속하기" 버튼과 함께 승리 메시지 표시. "계속하기"를 누르면 `keepPlayingAfterWin = true`로 두고 게임을 계속 진행하며, 이후에는 승리 오버레이를 다시 띄우지 않는다.
- 패배: 다음 두 조건을 모두 만족하면 게임 오버.
  1. 빈 칸(`0`)이 하나도 없다.
  2. 인접한 두 칸(가로 이웃, 세로 이웃) 중 값이 같은 쌍이 하나도 없다 (더 합칠 수 없음 = 어느 방향으로 밀어도 `moved`가 `false`가 되는 상태와 동치).
  이 두 조건 체크는 매 이동 직후 `checkGameOver()`로 수행하고, 참이면 `isOver = true`로 설정 후 오버레이에 게임 오버 메시지와 "새 게임" 버튼만 표시.

### 4.5 키보드 입력 처리

- `document.addEventListener('keydown', handler)`.
- `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` 4개 키만 처리, 그 외 키는 무시.
- 방향키의 기본 동작(페이지 스크롤)을 막기 위해 처리 대상 키에 한해 `event.preventDefault()` 호출.
- `isOver`이거나 (승리 후 "계속하기"를 누르지 않은 상태에서) `hasWon && !keepPlayingAfterWin`이면 입력을 무시.

### 4.6 터치 스와이프 처리 (모바일 대응)

CLAUDE.md의 모바일 반응형 필수 원칙에 따라, 방향키가 없는 터치 기기에서도 게임을 플레이할 수 있도록 스와이프 입력을 반드시 지원한다.

- 보드 컨테이너(`.board-wrapper`)에 `touchstart`/`touchend` 리스너를 단다 (라이브러리 없이 순수 Touch Events API).
- `touchstart`에서 첫 번째 터치의 `clientX`/`clientY`를 저장.
- `touchend`에서 종료 지점과의 차이(`deltaX`, `deltaY`)를 계산.
- 스와이프로 인식할 최소 이동 거리 임계값(예: 24px)보다 작으면 무시(단순 탭과 구분).
- `abs(deltaX) > abs(deltaY)`면 좌우 스와이프, 아니면 상하 스와이프로 판단하고 부호에 따라 방향 결정 → `move(direction)` 호출.
- CSS에서 `.board-wrapper`에 `touch-action: none`을 지정해, 스와이프 동작이 브라우저의 기본 스크롤/줌 제스처와 충돌하지 않게 한다.

### 4.7 렌더링

- `render()`는 `#tile-layer`를 매 이동마다 비우고(`innerHTML = ''`), `board`를 순회하며 값이 0이 아닌 칸마다 `div.tile.tile-{value}` 요소를 생성해 채워 넣는다.
- 각 타일 요소는 `style.top`/`style.left`를 퍼센트(`row * 25%`, `col * 25%`)로 지정 — 격자가 항상 4등분이므로 컨테이너 크기와 무관하게 반응형으로 동작한다.
- 값에 따라 `tile-2`, `tile-4`, ..., `tile-2048`, 그리고 2048을 초과하는 값은 공통 클래스 `tile-super`로 묶어 CSS에서 색상을 매핑한다 (아래 6절 참고).
- 새로 생성된 타일에는 `tile-new` 클래스를, 이번 이동에서 병합되어 만들어진 타일에는 `tile-merged` 클래스를 추가로 붙여 CSS 애니메이션(등장/팝 효과)을 트리거한다.
- 점수판(`#score-current`, `#score-best`)과 최고 점수 갱신도 `render()`에서 함께 처리.

### 4.8 새 게임 / 초기화

- `newGame()`: `board`를 전부 0으로 초기화, `score = 0`, `isOver = false`, `hasWon = false`, `keepPlayingAfterWin = false`, 오버레이 숨김, `spawnRandomTile()`을 두 번 호출 후 `render()`.
- `#new-game-btn`, 오버레이의 `#overlay-retry-btn` 모두 `newGame()`에 연결.
- 페이지 로드 시(`DOMContentLoaded` 또는 스크립트 맨 끝) `newGame()`을 한 번 호출해 시작 상태를 만든다.

## 5. 점수판 설계

- 현재 점수(`score`): 모듈 스코프 변수. 병합이 일어날 때마다 합쳐진 값만큼 누적. `render()`에서 `#score-current` 텍스트로 반영.
- 최고 점수(`bestScore`): `localStorage` 키 `game2048-best-score`에 저장. 다른 스크립트(`theme-toggle.js`가 `theme` 키를 쓰는 것)와 겹치지 않도록 `game2048-` 접두어로 네임스페이스를 둔다.
  - 페이지 로드 시 `Number(localStorage.getItem('game2048-best-score')) || 0`으로 초기값을 읽는다.
  - 매 이동 후 `score > bestScore`이면 `bestScore = score`로 갱신하고 즉시 `localStorage.setItem('game2048-best-score', String(bestScore))`로 저장.
  - "새 게임"을 눌러도 `bestScore`는 초기화하지 않는다 (현재 점수만 리셋).
- 서버가 없는 정적 사이트이므로 최고 점수는 브라우저(기기) 로컬 기준이며, 이는 `theme-toggle.js`가 다크모드 설정을 localStorage에 저장하는 것과 동일한 패턴이라 프로젝트 관례와 일치한다.

## 6. CSS 설계 (`src/games/2048/style.css`)

`main.css`의 다크모드 구조를 그대로 따른다 — 즉 `prefers-color-scheme: dark` 미디어 쿼리를 기본값으로 두고, `[data-theme='light']`/`[data-theme='dark']`가 이를 오버라이드한다. 이미 `main.css`가 `:root`에 `--bg`, `--bg-subtle`, `--text`, `--muted`, `--accent`, `--border`를 정의해두므로, 게임 스타일은 이 값들을 재사용하고 타일 색상 전용 변수만 이 파일에 추가로 정의한다.

```css
:root {
  --tile-2-bg: #eee4da;    --tile-2-text: #776e65;
  --tile-4-bg: #ede0c8;    --tile-4-text: #776e65;
  --tile-8-bg: #f2b179;    --tile-8-text: #f9f6f2;
  --tile-16-bg: #f59563;   --tile-16-text: #f9f6f2;
  --tile-32-bg: #f67c5f;   --tile-32-text: #f9f6f2;
  --tile-64-bg: #f65e3b;   --tile-64-text: #f9f6f2;
  --tile-128-bg: #edcf72;  --tile-128-text: #f9f6f2;
  --tile-256-bg: #edcc61;  --tile-256-text: #f9f6f2;
  --tile-512-bg: #edc850;  --tile-512-text: #f9f6f2;
  --tile-1024-bg: #edc53f; --tile-1024-text: #f9f6f2;
  --tile-2048-bg: #edc22e; --tile-2048-text: #f9f6f2;
  --tile-super-bg: #3c3a32; --tile-super-text: #f9f6f2;
}

@media (prefers-color-scheme: dark) {
  :root {
    /* 각 타일 배경을 어둡게 톤다운, 텍스트는 --text 계열로 조정해 --bg(#14161a)와 대비 확보 */
  }
}

:root[data-theme='dark'] {
  /* prefers-color-scheme 블록과 동일한 값을 명시적으로 재선언 (main.css 관례와 동일) */
}

:root[data-theme='light'] {
  /* 최상단 :root 라이트 값과 동일하게 명시적으로 재선언 */
}
```

- **타일 색상 체계**: 값이 커질수록 채도/명도가 높아지는 전통적 2048 팔레트(연한 베이지 → 주황 → 진한 노랑/금색)를 라이트 모드 기본값으로 쓰고, 다크 모드에서는 같은 색상군을 어둡게 톤다운한 버전을 정의해 `--bg`(어두운 배경)와의 대비를 확보한다. 2048 초과 타일(`tile-super`)은 값별로 색을 늘리지 않고 진한 단색 + 밝은 텍스트로 통일해 무한정 늘어나는 걸 방지한다.
- **보드 반응형 그리드**: `.board-wrapper`는 `position: relative`, 너비 `width: min(90vw, 480px)`, `aspect-ratio: 1`로 정사각형 유지 (모바일 우선 — 기본값이 뷰포트 기준 `90vw`이고 큰 화면에서 `480px`로 상한). `#board-grid`는 `display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); gap: clamp(0.4rem, 2vw, 0.75rem);`로 4x4 배경 칸을 그린다. `#tile-layer`는 `position: absolute; inset: 0;`로 그 위에 겹치고, 개별 `.tile`은 `position: absolute; width: calc(25% - gap 보정); height: calc(25% - gap 보정);`로 배치, `top`/`left`는 JS가 인라인 스타일로 지정, `transition: top 120ms ease, left 120ms ease;`로 이동 애니메이션을 준다.
- **다크모드 대응**: 보드 배경, 빈 칸, 오버레이 배경은 모두 `var(--bg-subtle)`/`var(--bg)`/`var(--border)`를 사용해 라이트/다크 전환 시 `main.css`의 나머지 페이지와 시각적으로 통일감을 유지한다. 오버레이는 `background: color-mix(in srgb, var(--bg) 85%, transparent);` 또는 `rgba`로 반투명 처리.
- **반응형 브레이크포인트**: `main.css`가 이미 쓰는 `@media (max-width: 600px)` 기준을 그대로 따라, 점수판을 세로로 쌓거나(`.game-2048-header`를 `flex-direction: column`), 타일 폰트 크기(`clamp()`)를 축소한다.
- **모바일 터치**: `.board-wrapper { touch-action: none; }`로 스와이프 제스처가 페이지 스크롤/핀치줌과 충돌하지 않도록 한다.

## 7. 빌드 통합 방법

### 7.1 `build/config.js` 수정

`nav` 배열에 2048 링크를 추가해 블로그 헤더(모든 글/태그 페이지)에서 게임으로 이동할 수 있게 한다.

```js
nav: [
  { label: '홈', href: '/' },
  { label: '태그', href: '/tags/' },
  { label: '2048', href: '/games/2048/' },
],
```

`templates.js`의 `layout()`이 이미 `nav`를 순회하며 `${basePath}${item.href}`로 링크를 만들어주므로, 이 한 줄 추가만으로 `dist/index.html`, `dist/posts/*/index.html`, `dist/tags/*/index.html` 등 빌드되는 모든 페이지 헤더에 자동으로 "2048" 메뉴가 생긴다. (반대로 `src/games/2048/index.html` 자신은 `layout()`을 거치지 않는 손으로 쓴 정적 파일이므로, 3절에서처럼 동일한 nav 링크를 해당 HTML 안에 직접 하드코딩해 둔다. nav 항목이 3개뿐이라 두 곳을 手동으로 맞추는 부담이 크지 않고, 이 프로젝트가 템플릿 엔진/공유 파셜을 두지 않는 것과 일관된다.)

### 7.2 `build/build.js` 수정

`copyStaticAssets()`가 이미 `src/styles → dist/styles`, `src/scripts → dist/scripts`를 `fs.cpSync(..., { recursive: true })`로 복사하고 있으므로, 동일한 패턴으로 한 블록만 추가한다.

```js
function copyStaticAssets() {
  const stylesSrc = path.join(SRC_DIR, 'styles');
  const scriptsSrc = path.join(SRC_DIR, 'scripts');
  const gamesSrc = path.join(SRC_DIR, 'games');
  if (fs.existsSync(stylesSrc)) {
    fs.cpSync(stylesSrc, path.join(DIST_DIR, 'styles'), { recursive: true });
  }
  if (fs.existsSync(scriptsSrc)) {
    fs.cpSync(scriptsSrc, path.join(DIST_DIR, 'scripts'), { recursive: true });
  }
  if (fs.existsSync(gamesSrc)) {
    fs.cpSync(gamesSrc, path.join(DIST_DIR, 'games'), { recursive: true });
  }
}
```

`src/games/` 아래 구조(`2048/index.html`, `2048/style.css`, `2048/game.js`)가 그대로 `dist/games/2048/`로 복사되므로, 사이트에서는 `/games/2048/`(즉 `dist/games/2048/index.html`)로 접근 가능해진다. 이후 다른 게임을 추가하더라도 `src/games/{게임이름}/` 디렉터리만 만들면 이 로직이 그대로 재사용된다. `build()` 함수 본문, `readPosts()`, `writeFile()` 등 다른 로직은 변경할 필요가 없다 — 2048은 `posts` 목록에 들어가지 않고 검색 인덱스(`search-index.json`)에도 포함되지 않는다 (마크다운 글이 아니므로 검색 대상에서 의도적으로 제외).

### 7.3 배포(GitHub Pages 서브패스) 대응

`config.basePath`는 `nav` 링크처럼 `templates.js`가 생성하는 페이지에서만 관여한다. `src/games/2048/index.html` 자체는 3절에서 설계한 대로 모든 자산·링크를 상대 경로(`../../styles/main.css`, `../../`, `../../tags/`, `../../games/2048/`, 같은 디렉터리의 `style.css`/`game.js`)로 작성했기 때문에, `BASE_PATH` 환경 변수 값과 무관하게 `dist/` 루트가 어디에 배포되든(루트 도메인이든 `/my_blog/` 같은 프로젝트 서브패스든) 항상 올바르게 동작한다. 따라서 빌드 스크립트에서 `basePath`를 게임 HTML에 주입하는 별도 치환 로직은 필요 없다.

## 8. 기존 코드 스타일과의 일관성

- **주석 최소화**: `game.js`는 `build/*.js`처럼 각 함수 위에 설명 주석을 달지 않고, `moveRowLeft`의 "한 번의 이동에서 3연속 병합을 막기 위해 인덱스를 건너뛴다"처럼 자명하지 않은 이유가 있는 지점에만 짧게 남긴다. `style.css`의 다크모드 블록 두 곳(`prefers-color-scheme`/`[data-theme]`)이 값을 중복 정의하는 이유(`main.css`가 이미 그렇게 하고 있음) 정도만 주석으로 남긴다.
- **클라이언트 JS 컨벤션 일치**: `src/scripts/*.js`(IIFE + `var` + `function () {}`, `'use strict'` 없음)와 동일한 스타일로 `game.js`를 작성한다. `build/*.js`(Node/CommonJS, `'use strict'`, `const`/`let`)의 스타일은 브라우저에 노출되는 `src/games`에는 적용하지 않는다.
- **CSS 변수/다크모드 패턴 일치**: `main.css`가 쓰는 `:root` 기본값 → `@media (prefers-color-scheme: dark)` → `:root[data-theme='light']` / `:root[data-theme='dark']` 3단 구조를 `style.css`의 타일 색상 변수에도 동일하게 적용한다.
- **프레임워크/번들러 금지 준수**: 애니메이션은 CSS `transition`/`@keyframes`만 사용하고, 별도 애니메이션 라이브러리나 상태관리 라이브러리를 도입하지 않는다. 게임 로직은 순수 vanilla JS로 직접 구현하며 외부 npm 패키지를 추가하지 않는다 (`npm run build`가 여전히 Node 내장 모듈 + 기존 `build/` 스크립트만으로 동작).
- **파일/URL 네이밍 일치**: 다른 정적 섹션이 `/tags/{slug}/`처럼 트레일링 슬래시 디렉터리 규칙을 쓰는 것과 맞춰 `/games/2048/`도 동일한 규칙을 따른다.
